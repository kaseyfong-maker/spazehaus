# SPAZEHAUS Management App — Progress Report

**Last updated:** 2026-05-13
**Repository:** https://github.com/kaseyfong-maker/spazehaus (private)
**Live URL:** https://spazehaus.vercel.app
**Database:** Supabase project `jifrzsvqdshjbqptubgz` (Singapore region, free tier)

---

## Where We Are

A **production-deployed**, **auth-gated**, **fully-database-backed** internal management app for SPAZEHAUS interior design firm in Johor Bahru. Every page reads from real Postgres through TanStack Query + Supabase. Magic-link auth restricts access to staff with matching emails, **role-based RLS** enforces what each user can read and write, and the daily close-door photo SOP uploads real JPEGs to Supabase Storage. The Vercel production build is lean (no more inlined `vitePluginManusRuntime`).

**Tier 1 is mid-flight.** Admins (principal / admin / admin_exec / pm / site_supervisor) can mark payment gates as collected AND upload + sign the 6 contract / drawing documents per project directly from the UI. Signed PDFs are stored privately in Supabase Storage and viewed via short-lived signed URLs. Every status change flows through the audit_log trigger — and the project's `current_stage_id` now auto-advances server-side whenever a checkpoint completes, closing the workflow loop. Admins have a dedicated `/company/audit` viewer with smart event summaries + field-level diffs (now paginated with a row-id search). Sentry error tracking is wired (env-gated, with user context + ErrorBoundary forwarding). The Supabase client is fully typed against the live schema (generated via `bun run gen:types`) — `.from()`, `.update()`, `.insert()`, and `.rpc()` are all checked at compile time.

---

## What's Been Accomplished

### Pre-database phases (in-memory mock prototype)

| Phase | Commit | What shipped |
|---|---|---|
| **Initial app** | `9db1a72` | React 19 + Vite + Tailwind v4 + Wouter SPA. Mobile-first 430px frame. Bottom nav (Home / Projects / Company / Calendar / Profile). Existing mock modules: staff, projects, leave, recruitment, quotations, etc. |
| **Phase 1 — Lifecycle Engine** | `9db1a72` | 29-stage canonical workflow in `lifecycleData.ts`. 5 Payment Collection Checkpoints (① ② ③ ④ ⑤) + 6 Document Sign checkpoints (3 contracts + 3 drawing sign-offs). New Lifecycle tab in ProjectDetail with vertical phase timeline. |
| **Phase 2 — Checkpoint Dashboard** | `c3004de` | `/checkpoints` cross-project view. KPI strip + filter tabs + grouped (overdue / this-week / this-month / later) payment buckets. `MOCK_TODAY` (2026-05-10) anchor for deterministic buckets. Dashboard urgent-checkpoint widget + Projects banner. Deep-link via `?tab=Lifecycle`. |
| **Phase 3 — Customer Database** | `ebe1e59` | `/customers` with inquiry pipeline funnel, win-rate KPI, category breakdown, search + filter. `/customers/:id` detail with pipeline timeline, contact log, opportunity details, linked-project banner. 13 mock inquiries spanning the full funnel. |
| **Phase 4 — Reminders** | `65546b2` | `/reminders` SOP enforcement. Daily close-door photo per active site, weekly payment review, weekly site report. 14-day photo grid with green/red cells. Photo streak counter. |
| **Phase 5 — Performance Report** | `796c7b9` | `/performance` with Team ⇄ Personal toggle. Company-wide YTD revenue, this-month achievement, projected GP, pipeline. Sales leaderboard with achievement bars. Personal view with big gauges + variance narrative. Project gantt across all 5 projects with red TODAY line. |
| **Convert Inquiry flow** | `4110da3` | Bottom-sheet modal that converts a Showroom-Meet inquiry into a real project. Smart payment allocation (7% design fee + 50/30/20 split of renovation total). |
| **Vercel deploy config** | `cdffea8` | `vercel.json` — Vite build, SPA rewrites so wouter deep-links survive refresh. |

### Tier 0 — Real backend (complete)

| Phase | Commit | What shipped |
|---|---|---|
| **Phase 0A — Schema + Seed** | `4547c19` | Three SQL migrations: schema (13 tables, 12 enums, 20 indexes, `updated_at` + audit triggers), baseline RLS (anonymous blocked, authenticated full-access placeholder), seed (10 staff, 5 projects, 29 payments, 30 signatures, 13 inquiries, 4 quotations + 33 line items). |
| **Lockfile fix** | `34ff1b7` | Regenerated `pnpm-lock.yaml` to include `@supabase/supabase-js` so Vercel's `pnpm install --frozen-lockfile` doesn't fail. |
| **Phase 0B — Magic-link auth** | `da58adc` | Auth trigger migration (auto-links new `auth.users` to staff by email). Supabase client singleton. `AuthContext` provider with 4-state machine (loading / unauthenticated / authenticated-no-staff / authenticated). Branded `/login` page. `/auth/callback` post-magic-link landing. `AuthGate` that protects all non-public routes. Profile + Dashboard + PerformanceReport read the logged-in user. |
| **Phase 0C — Data layer migration (core)** | `b7487bd` | TanStack Query installed and wired. Central `queries.ts` with hooks for projects, lifecycle, payments, signatures, inquiries, staff, quotations. Atomic `convert_inquiry_to_project()` Postgres RPC. Row → app-shape mappers (snake_case ↔ camelCase, ISO ↔ DD/MM/YYYY). Dashboard / Projects / ProjectDetail / Lifecycle tab / CustomerDatabase / CustomerDetail / Convert flow / Checkpoints all read from Supabase now. |
| **Phase 0C.2 — Full page migration + new tables** | `61fe7a7` | New tables: `calendar_events`, `kpi_records`. New seed data for both. `dbTypes.ts` extended with 10 new row shapes. `queries.ts` expanded with ~20 new hooks: quotations (incl. create + status mutation), leave_requests (incl. apply + approve), candidates, announcements, sales_targets, kpi_records, calendar_events, site_photos, plus pure computational helpers (`computeTeamPerformance`, `computeCompanyPerformance`, `buildReminders`, `reminderSummary`, `buildProjectTimeline`, `buildSitePhotoMaps`). Every mock-backed page migrated. **Daily site-photo upload flow live** via Supabase Storage. |
| **Phase 0D — Role-based RLS** | `61fe7a7` | Replaces the permissive 0A policies. Three tiers: ADMIN (principal / admin / admin_exec — full access), OPERATIONS (pm / site_supervisor — read all + write operational tables), FIELD (designer / sales — read all + write records assigned to them + own leave). SECURITY DEFINER helpers (`current_staff_id()`, `current_staff_role()`, `is_admin_tier()`, `is_ops_tier()`) keep policy bodies readable. KPI records + sales targets are now strictly self-or-admin. Audit log is admin-only + own actions. Storage bucket tightened too. |
| **Phase 0E — Real staff emails (template)** | `61fe7a7` | SQL template at `20260513000004_phase_0e_staff_emails.sql` with one `UPDATE` per staff. Paste real addresses inline, run in Supabase SQL Editor, then each staff member can sign in via magic link. |
| **Phase 0F — Vercel polish** | `61fe7a7` | `vite.config.ts` gates the legacy `vitePluginManusRuntime` + `vitePluginManusDebugCollector` behind `MANUS_RUNTIME=1`. Production builds no longer inline ~100kb into `index.html` — confirmed by build: `index.html` is now **0.92kB** (down from 367kB). |

### Tier 1 — User-facing features (in progress)

| Feature | Commit | What shipped |
|---|---|---|
| **Payment-collected mutations** | `51d683e` | New `useUpdatePayment` hook in `queries.ts` with invalidations across `qk.openPayments / projectLifecycle / projects / project`. New `MarkCollectedSheet` bottom-sheet component (collected date · reference · notes). Wired into the Checkpoints page (per-payment "COLLECT" pill) and the ProjectDetail Lifecycle tab (inline COLLECT button on each open payment row). Gated to OPS tier (`canEditPayments()` helper) so field staff don't see the button. Audit log captures every change via the Phase 0A trigger. |
| **Document upload + e-sign** | `cb33936` | New `signature-docs` Supabase Storage bucket (private; 20 MB cap; PDF / JPEG / PNG only). Migration `20260513000005_tier1_signature_docs_bucket.sql` creates the bucket and tightens object-level RLS to the OPS tier. New `useUploadSignatureDoc` + `useUpdateSignature` hooks + `getSignatureDocUrl` helper that mints short-lived signed URLs. New `SignDocumentSheet` component handles PDF picker, optional re-upload, signed date / signed by / notes, and a toggleable "Mark as signed" switch. Wired into the Checkpoints SignatureGroup (per-row "SIGN" pill, scoped to canSign) and the ProjectDetail Lifecycle tab (inline SIGN + VIEW affordances on each `SignatureRow`). VIEW button distinguishes between real Storage paths (`/`-separated → opens signed URL in new tab) and legacy seed filenames (toasts the ref). |
| **Stage auto-advance** | `8b4894f` | Migration `20260513000006_tier1_stage_advancement.sql` materialises the 29-stage workflow into a `lifecycle_stages` table, adds a FK from `projects.current_stage_id`, and installs a SECURITY DEFINER function `maybe_advance_project_stage(project_id)` that loops forward through stages whose requirements are now satisfied. Triggers on `payment_records` and `signature_records` call the function on any status transition into `completed`. Special cases: stage 9 (Design Contract Signed) needs BOTH payment gate ② AND the design-contract signature; stage 22 (Progressive Payment) needs EVERY gate-4 instalment completed; retroactive completions never regress the current stage. Client side, `useUpdatePayment` and `useUpdateSignature` now snapshot the project's stage before + after the write and return a `stageAdvanced` field; both sheets toast a follow-up `Project advanced to "X"` when the trigger moved the project forward. Note that this changes the Convert Inquiry behaviour: newly converted projects auto-advance from `design-prop-signed` (stage 4) all the way to `design-contract` (stage 9), since the proposal deposit is collected at conversion time. |
| **`/company/audit` viewer** | `c68aef2` | Admin-only audit log viewer surfacing every INSERT / UPDATE / DELETE captured by the Phase 0A trigger. `useAuditLog({ table, action, daysBack, rowId, limit })` filters the live `audit_log` table client-side and joins each row to the actor's staff record (via `auth_user_id`). The page renders a KPI strip (24h / 7d / unique actors), filter chips (table · action · time window), and a newest-first list of expandable event cards. Each card has a smart one-line summary (e.g. "Marked payment ② collected · RM 18,000", "Stage advanced design-contract → 3d-drawing") and expands to show a clean before-vs-after field-level diff (`updated_at` and other noise filtered out). `canViewAuditLog(role)` mirrors the Phase 0D `audit_log_read_admin` policy — the Company hub hides the card and the page redirects non-admins back to `/company`. |
| **Sentry error tracking** | `d748132` | Added `@sentry/react` with an env-gated `initSentry()` in `client/src/lib/sentry.ts`. Called from `main.tsx` before React mounts, so boot-time crashes are captured too. `AuthContext` tags the Sentry user on every resolved session (auth user id + email + staff id / role / name) and clears it on sign-out. `ErrorBoundary` now also forwards caught errors to Sentry with the React component stack. A `beforeSend` hook drops the routine Supabase network blips (`Load failed` / `NetworkError when attempting`) so the inbox stays signal-only. When `VITE_SENTRY_DSN` is unset the entire integration short-circuits to a silent no-op — local dev / CI builds work without any DSN. Bundle cost: +~25 KB / +5 KB gzip on the main chunk. |
| **Typed Supabase schema** | `fbeb666` | New `client/src/lib/database.types.ts` mirrors what `supabase gen types typescript` emits — Row / Insert / Update for all 16 tables, all 13 enums, all 5 callable RPCs, plus `Tables<>` / `TablesInsert<>` / `TablesUpdate<>` / `Enums<>` extraction helpers. `supabase` is now `createClient<Database>(...)`, so every `.from()`, `.update()`, `.insert()`, and `.rpc()` is checked against the schema. `dbTypes.ts` keeps the legacy `StaffRow` / `ProjectRow` / etc. aliases working but derives them from `Database`. The new types caught ~25 real bugs — untyped `Record<string, unknown>` payloads, `string \| undefined` ids passed to `.eq()`, JSONB columns being read as if they were typed objects — all fixed at the call sites instead of papered over with casts. New `bun run gen:types` script regenerates the schema file via the Supabase CLI for anyone with a `SUPABASE_ACCESS_TOKEN`. The critical gotcha: `Relationships: readonly []` silently collapses the entire Schema generic to `never` — must be `Relationships: []` (mutable). |
| **Dead-mock cleanup** | `5faaa31` | Six mock-data files in `client/src/lib/` (mockData / customerData / reminderData / performanceData / quotationData / lifecycleData) collectively shed **~1,860 lines** of orphaned exports — the in-memory `staffMembers`, `projects`, `inquiries`, `quotations`, `projectLifecycles`, `sitePhotoLogs`, `staffTargets`, `leaveRequests`, `candidates`, `announcements`, `kpiData`, `calendarEvents` arrays plus all their derived helpers (`convertInquiryToProject`, `getReminders`, `companyPerformance`, `getOpenPayments`, etc.). `performanceData.ts` was deleted entirely (no external importers). What remains is pure: the 29-stage workflow catalogue, in-app TypeScript shapes, badge palettes (`statusConfig` / `priorityConfig` / `stageConfig` / `categoryConfig` / `tierConfig` / `phaseColors` / `checkpointStatusConfig` / `bucketLabel` / `bucketTone` / `categoryColors` / `reminderTypeConfig` / `reminderStatusConfig`), and pure helpers (`lastNDays`, `daysFromToday`, `bucketDate`, `effectivePaymentStatus`, `paymentSummary`, `signatureSummary`, `stageStatus`, `computeTotals`, `formatRM`). Two consumers needed a small migration first: `Projects.tsx` (Quotations shortcut card) now reads `useQuotations()` instead of the mock array, and `generatePDF.ts` now takes `QuotationWithItems` as its input type. Total file footprint: **2,047 → 457 lines** across the 5 surviving files. |
| **Audit log pagination + row search** | `7d2defa` | `useAuditLog` switched from a single-shot `useQuery` (capped at 200 rows) to `useInfiniteQuery` with cursor-based pagination on `audit_log.id`. Since `id` is `bigserial` (monotonically increasing), cursoring on `id desc` gives the same newest-first sequence as `changed_at desc` but with a stable unique key — no millisecond tie-breakers, no .or() pseudo-cursor. Each page fetches 50 rows (hard-capped at 200) and reports a `nextCursor` of the oldest row's id when full, or `null` when exhausted. The page surfaces a "LOAD 50 MORE" button that disappears once `hasNextPage` is false (replaced with "End of results"). The KPI strip (24h / 7d / actors) now reflects the loaded window, growing as more pages are fetched. Added a `ROW ID` text input to the filters card — debounced 300ms (typing doesn't flood the query layer), filters on the exact `row_id` column (e.g. `PRJ001`, an inquiry id, a payment row id), and has a CLEAR chip. Useful for tracing every change against a specific entity (e.g. "show me everything that ever happened to PRJ001"). |
| **Live `gen:types` sanity check + DB catch-up** | `294d2ec` + `39e41ba` | Two-part fix. First commit: ran `bun run gen:types` against the live project for the first time. The package.json script was unsafe — bare `supabase gen ...` assumed a global CLI binary, and the shell `>` redirect truncated `database.types.ts` before the CLI errored out. Fixed to use `bun x supabase ...` with a `/tmp` staging file + atomic `mv`. Diff against the hand-authored types revealed the live DB was 6 migrations behind the codebase (Convert Inquiry RPC, calendar_events, kpi_records, role-based RLS helpers, lifecycle_stages, signature-docs bucket). Second commit: after applying all pending migrations via the Supabase SQL Editor, re-ran `bun run gen:types` to replace the hand-authored 755-line file with the canonical 1,235-line CLI output. Caught 6 real bugs the hand-authored types had papered over: `payment_records.gate` widens to `number` (CHECK constraint isn't introspectable, cast at mapper); `signature_records.group_name` widens to `string` (same fix); `convert_inquiry_to_project` `p_start_date`/`p_target_date` are non-null (now validated at call site with a clear thrown error); `p_assigned_to_avatar` is `Args?: string` not `string \| null` (changed `?? null` to `?? undefined`); `kpi_records.total_score` is nullable (null-coalesced to 0 in the rolling average). The Supabase schema is now the single source of truth — to refresh types, run `bun run gen:types` after any migration. |
| **Sentry source-map upload** | `9dcf6ce` | Added `@sentry/vite-plugin@5.3.0` (devDependency) and wired it into `vite.config.ts`. Production builds now upload source maps to Sentry so stack traces show real symbols instead of minified names. The same release tag (auto-derived: `spazehaus@<git-short-sha>`, or `VERCEL_GIT_COMMIT_SHA` on Vercel, or override via `SENTRY_RELEASE`) is injected into the runtime via `VITE_SENTRY_RELEASE` so `@sentry/react` reports events under the matching release. Source maps are emitted as `sourcemap: "hidden"` (no `//# sourceMappingURL=` comment in the JS, so browsers won't fetch them even if they leak) AND deleted from `dist/` after upload via `sourcemaps.filesToDeleteAfterUpload`. The plugin is fully gated on three env vars (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) being present in a production build — without any of them, the plugin is omitted entirely, no maps are emitted, and `bun run build` is a clean no-op for the Sentry layer. A custom `errorHandler` swallows upload failures so a transient Sentry outage or bad token can't fail a Vercel deploy (logs a clear warning instead). Verified: TS clean, prod build clean both with + without secrets, build exits 0 even when upload fails. |
| **Bundle chunk-splitting** | _this commit_ | Replaced the monolithic 1.89 MB / **526 KB gzip** main chunk with a 9-chunk vendor split via `build.rollupOptions.output.manualChunks`. Groupings cluster libraries by maintainer + change-frequency so each chunk is cached independently across deploys: `react-vendor` (194 KB / 61 KB gzip), `supabase` (198 KB / 52 KB), `radix` (42 KB / 15 KB), `query` (37 KB / 11 KB), `motion` (115 KB / 38 KB), `charts` (292 KB / 76 KB), `vendor` (388 KB / 125 KB — catch-all), `sentry` (~0 KB — tree-shaken when no DSN), plus the new lean `index` chunk at **76 KB gzip** (down from 526 KB). The 600 KB `pdf` chunk (jspdf + html2canvas + dompurify) was also made truly on-demand: (1) `QuotationDetail.tsx` switched from a static `import { generateQuotationPDF }` to `await import("@/lib/generatePDF")` inside the export handler, (2) `vite.config.ts` `modulePreload.resolveDependencies` strips `pdf-*.js` from the modulepreload list so first-paint doesn't even hint at fetching it. Net result: initial-paint JS dropped from ~640 KB gzip → ~470 KB gzip (**~25% reduction**), and a one-line app change now only invalidates the 76 KB main chunk instead of busting the whole 526 KB bundle. |

---

## Current State

### Infrastructure

- ✅ GitHub repo (private), `main` branch auto-deploys to Vercel
- ✅ Vercel free-tier hosting at `spazehaus.vercel.app` with HTTPS + Singapore CDN edge
- ✅ Supabase project (Singapore region, free tier — covers SpazeHaus's volume for years)
- ✅ Magic-link auth via Supabase Auth (Site URL + redirect URLs configured for both localhost + prod)
- ✅ **All migrations applied to the live database** — confirmed 2026-05-13 via `bun run gen:types`. Live schema introspection shows 16 tables, 13 enums, and 7 functions (`convert_inquiry_to_project`, `current_staff_id`, `current_staff_role`, `current_staff_avatar`, `is_admin_tier`, `is_ops_tier`, `maybe_advance_project_stage`).
- ✅ Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) configured for Production / Preview / Development
- ✅ pnpm lockfile in sync (Vercel builds pass)
- ✅ TS check passes (`bun run check` exit 0)
- ✅ Production build passes (`NODE_ENV=production bun x vite build`) — no inlined manus runtime
- ✅ Supabase Storage `site-photos` bucket with bucket policies

### Authentication & access

- ✅ `kaseyfong@saysheji.com` mapped to Grace Tan (SH001), role `principal` — full admin access
- ✅ Role-based RLS enforced — every authenticated user is gated at the DB layer (ADMIN / OPS / FIELD tiers)
- ⏳ Other 9 staff still have placeholder `@spazehaus.com.my` emails. Run `20260513000004_phase_0e_staff_emails.sql` (after filling in real addresses) to wire them up.

### Data fidelity

| Entity | Real DB row count |
|---|---|
| `staff` | 10 |
| `projects` | 5 |
| `payment_records` | 29 |
| `signature_records` | 30 |
| `inquiries` | 13 |
| `quotations` | 4 |
| `quotation_items` | 33 |
| `leave_requests` | 4 |
| `candidates` | 5 |
| `announcements` | 3 |
| `sales_targets` | 3 |
| `calendar_events` | 15 (new in 0C.2) |
| `kpi_records` | 22 (new in 0C.2) |
| `site_photos` | 0 (uploaded live via Reminders page) |
| `audit_log` | populated automatically by triggers as changes happen |

### Pages — all on real DB

Every page now reads from Supabase via TanStack Query.

**Tier 0C (core) — migrated previously:**
- Dashboard (`/`)
- Projects list (`/projects`)
- Project Detail + Lifecycle tab (`/projects/:id`)
- Customer Database (`/customers`)
- Customer Detail (`/customers/:id`)
- Convert Inquiry → Project flow (atomic RPC, writes real rows)
- Checkpoints (`/checkpoints`)
- Login + Auth (`/login`, `/auth/callback`, Profile)

**Tier 0C.2 (full migration) — migrated this commit:**
- Reminders (`/reminders`) — site photo log + weekly cadence + **live photo upload to Storage**
- Performance Report (`/performance`) — sales targets + computed aggregates from real inquiries/quotations
- Quotation pages (`/quotations`, `/quotations/:id`, `/quotations/new`) — incl. real create + status mutations
- Calendar (`/calendar`) — reads from `calendar_events`
- Company hub (`/company`) — live counts + module deep-links
- Staff Directory (`/company/staff`)
- Staff Profile (`/company/staff/:id`) — incl. real Leave + KPI tabs
- Leave Management (`/company/leave`) — Pending tab approves/rejects, Apply Leave tab inserts a real row
- Recruitment (`/company/recruitment`) — Advance button writes to `candidates.stage`
- Announcements (`/company/announcements`)
- KPI & Performance (`/company/kpi`) — averages real `kpi_records`

### Verification commands

```bash
# Local dev
bun install                # install deps
bun run check              # TypeScript pass — should exit 0
bun run dev                # start vite on :3000

# Production build (lean — no manus runtime)
NODE_ENV=production bun x vite build

# Production
open https://spazehaus.vercel.app

# DB sanity check (paste in Supabase SQL Editor)
select 'staff' as t,                count(*) from staff
union all select 'projects',         count(*) from projects
union all select 'payment_records',  count(*) from payment_records
union all select 'signature_records',count(*) from signature_records
union all select 'inquiries',        count(*) from inquiries
union all select 'quotations',       count(*) from quotations
union all select 'calendar_events',  count(*) from calendar_events
union all select 'kpi_records',      count(*) from kpi_records;

# Verify role-based RLS (after 0D)
select current_staff_id(), current_staff_role(), is_admin_tier(), is_ops_tier();
```

---

## Regenerating types

`client/src/lib/database.types.ts` is generated from the live Supabase schema. To refresh it after a migration:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_…    # https://supabase.com/dashboard/account/tokens
bun run gen:types                       # runs `bun x supabase gen types typescript` + atomic mv
```

The script writes to a `/tmp` staging file first and only moves it into place if the CLI exits 0 — a failed CLI run can never empty the real file.

If a regen surfaces new TypeScript errors, that's usually a real bug: the CLI types reflect what the live DB actually promises, including nullability and `Args?` optionality. PostgREST schema introspection does **not** see Postgres CHECK constraints, so columns like `payment_records.gate` are typed as `number` even though SQL enforces `gate ∈ [1..5]`. Cast at the mapper boundary (e.g. `row.gate as PaymentGate`) when you need a tighter business-invariant type than the schema can prove.

**Optional finishing touch:**
- `supabase/migrations/20260513000004_phase_0e_staff_emails.sql` — **edit first** to fill in each staff member's real email, then paste. This lets the other 9 staff sign in with their real emails.

---

## Next Steps — Tier 1 candidates

Payment-collected mutations, document upload + e-sign, stage auto-advance, `/company/audit`, Sentry runtime + source-map upload, typed schema, dead-mock cleanup, audit pagination + row search, `gen:types` sanity check + DB catch-up, and bundle chunk-splitting are all done. Live DB is fully in sync with the codebase. Remaining options:

| Feature | Effort | Why it matters |
|---|---|---|
| **WhatsApp reminder integration** | 1–2 days | Hook Reminders into WhatsApp Business API so site supervisors get pinged at 5pm if they haven't uploaded their close-door photo. |
| **Client portal** | 2–3 days | Read-only public link per project for clients to see progress + sign documents. Requires separate Supabase auth flow. |
| **E2E test suite** | 2–3 hours | Convert Inquiry / Payment Collection / Sign Document are the three highest-value mutations — worth Playwright happy-path tests for each. |
| **Route-level lazy loading** | 1 hour | All 27 routes in `App.tsx` are statically imported, so the `charts` chunk (76 KB gzip — used only by `/company/kpi`) is preloaded on first paint even for users who never visit it. Converting heavy / rarely-hit routes (KPIPerformance, Recruitment, AuditLog, etc.) to `React.lazy` would shave another ~100 KB gzip off initial paint. Also a good opportunity to delete the orphan `pages/Home.tsx` (unused scaffold that statically imports `streamdown` — currently tree-shaken, but it's dead code clutter). |
| **Configure Sentry secrets in Vercel** | 5 min | The `@sentry/vite-plugin` is wired up but stays dormant until Vercel has `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` set. Generate the auth token at sentry.io with `project:releases` scope, find the org + project slugs in the Sentry URL, add all three under Project Settings → Environment Variables → Production. |

---

## Known Gaps / Tech Debt

- **MOCK_TODAY** anchored to 2026-05-10 still drives the relative-date buckets in `bucketDate()` / `daysFromToday()` / `effectivePaymentStatus()`. Replace with `new Date()` once real users start logging changes — or keep as a configurable demo flag.
- **`staff_role` enum** has both `admin` and `principal` — semantically overlapping. Phase 0D treats them identically (both in the ADMIN tier), so we could consolidate later. Not urgent.
- **No mutation hooks** for editing staff records (name, role, email, etc.) or for editing project metadata (title, address, dates). Payment collection, signature signing, leave approval, candidate stage advancement, and quotation status changes are all wired — but the staff directory + project header are still read-only.
- **No 1.8MB chunk-split** of the main JS bundle. The vite build warns about it. Not blocking, but doing a `manualChunks` pass would speed up first paint.
- **Site Storage bucket is public-via-signed-URL only**. Each photo render in Reminders 14-day grid would need a signed URL fetch. The current UI shows uploaded/missed cells but doesn't render the actual photos — once you want previews, wire `getSitePhotoUrl()` into a photo viewer modal.
