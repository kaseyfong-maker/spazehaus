# SPAZEHAUS Management App — Progress Report

**Last updated:** 2026-05-13
**Repository:** https://github.com/kaseyfong-maker/spazehaus (private)
**Live URL:** https://spazehaus.vercel.app
**Database:** Supabase project `jifrzsvqdshjbqptubgz` (Singapore region, free tier)

---

## Where We Are

A **production-deployed**, **auth-gated**, **fully-database-backed** internal management app for SPAZEHAUS interior design firm in Johor Bahru. Every page reads from real Postgres through TanStack Query + Supabase. Magic-link auth restricts access to staff with matching emails, **role-based RLS** enforces what each user can read and write, and the daily close-door photo SOP uploads real JPEGs to Supabase Storage. The Vercel production build is lean (no more inlined `vitePluginManusRuntime`).

**Tier 1 is mid-flight.** Admins (principal / admin / admin_exec / pm / site_supervisor) can mark payment gates as collected AND upload + sign the 6 contract / drawing documents per project directly from the UI. Signed PDFs are stored privately in Supabase Storage and viewed via short-lived signed URLs. Every status change flows through the audit_log trigger — and the project's `current_stage_id` now auto-advances server-side whenever a checkpoint completes, closing the workflow loop.

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
| **Phase 0C.2 — Full page migration + new tables** | _this commit_ | New tables: `calendar_events`, `kpi_records`. New seed data for both. `dbTypes.ts` extended with 10 new row shapes. `queries.ts` expanded with ~20 new hooks: quotations (incl. create + status mutation), leave_requests (incl. apply + approve), candidates, announcements, sales_targets, kpi_records, calendar_events, site_photos, plus pure computational helpers (`computeTeamPerformance`, `computeCompanyPerformance`, `buildReminders`, `reminderSummary`, `buildProjectTimeline`, `buildSitePhotoMaps`). Every mock-backed page migrated. **Daily site-photo upload flow live** via Supabase Storage. |
| **Phase 0D — Role-based RLS** | _this commit_ | Replaces the permissive 0A policies. Three tiers: ADMIN (principal / admin / admin_exec — full access), OPERATIONS (pm / site_supervisor — read all + write operational tables), FIELD (designer / sales — read all + write records assigned to them + own leave). SECURITY DEFINER helpers (`current_staff_id()`, `current_staff_role()`, `is_admin_tier()`, `is_ops_tier()`) keep policy bodies readable. KPI records + sales targets are now strictly self-or-admin. Audit log is admin-only + own actions. Storage bucket tightened too. |
| **Phase 0E — Real staff emails (template)** | _this commit_ | SQL template at `20260513000004_phase_0e_staff_emails.sql` with one `UPDATE` per staff. Paste real addresses inline, run in Supabase SQL Editor, then each staff member can sign in via magic link. |
| **Phase 0F — Vercel polish** | `61fe7a7` | `vite.config.ts` gates the legacy `vitePluginManusRuntime` + `vitePluginManusDebugCollector` behind `MANUS_RUNTIME=1`. Production builds no longer inline ~100kb into `index.html` — confirmed by build: `index.html` is now **0.92kB** (down from 367kB). |

### Tier 1 — User-facing features (in progress)

| Feature | Commit | What shipped |
|---|---|---|
| **Payment-collected mutations** | `51d683e` | New `useUpdatePayment` hook in `queries.ts` with invalidations across `qk.openPayments / projectLifecycle / projects / project`. New `MarkCollectedSheet` bottom-sheet component (collected date · reference · notes). Wired into the Checkpoints page (per-payment "COLLECT" pill) and the ProjectDetail Lifecycle tab (inline COLLECT button on each open payment row). Gated to OPS tier (`canEditPayments()` helper) so field staff don't see the button. Audit log captures every change via the Phase 0A trigger. |
| **Document upload + e-sign** | `cb33936` | New `signature-docs` Supabase Storage bucket (private; 20 MB cap; PDF / JPEG / PNG only). Migration `20260513000005_tier1_signature_docs_bucket.sql` creates the bucket and tightens object-level RLS to the OPS tier. New `useUploadSignatureDoc` + `useUpdateSignature` hooks + `getSignatureDocUrl` helper that mints short-lived signed URLs. New `SignDocumentSheet` component handles PDF picker, optional re-upload, signed date / signed by / notes, and a toggleable "Mark as signed" switch. Wired into the Checkpoints SignatureGroup (per-row "SIGN" pill, scoped to canSign) and the ProjectDetail Lifecycle tab (inline SIGN + VIEW affordances on each `SignatureRow`). VIEW button distinguishes between real Storage paths (`/`-separated → opens signed URL in new tab) and legacy seed filenames (toasts the ref). |
| **Stage auto-advance** | `8b4894f` | Migration `20260513000006_tier1_stage_advancement.sql` materialises the 29-stage workflow into a `lifecycle_stages` table, adds a FK from `projects.current_stage_id`, and installs a SECURITY DEFINER function `maybe_advance_project_stage(project_id)` that loops forward through stages whose requirements are now satisfied. Triggers on `payment_records` and `signature_records` call the function on any status transition into `completed`. Special cases: stage 9 (Design Contract Signed) needs BOTH payment gate ② AND the design-contract signature; stage 22 (Progressive Payment) needs EVERY gate-4 instalment completed; retroactive completions never regress the current stage. Client side, `useUpdatePayment` and `useUpdateSignature` now snapshot the project's stage before + after the write and return a `stageAdvanced` field; both sheets toast a follow-up `Project advanced to "X"` when the trigger moved the project forward. Note that this changes the Convert Inquiry behaviour: newly converted projects auto-advance from `design-prop-signed` (stage 4) all the way to `design-contract` (stage 9), since the proposal deposit is collected at conversion time. |
| **`/company/audit` viewer** | `c68aef2` | Admin-only audit log viewer surfacing every INSERT / UPDATE / DELETE captured by the Phase 0A trigger. `useAuditLog({ table, action, daysBack, rowId, limit })` filters the live `audit_log` table client-side and joins each row to the actor's staff record (via `auth_user_id`). The page renders a KPI strip (24h / 7d / unique actors), filter chips (table · action · time window), and a newest-first list of expandable event cards. Each card has a smart one-line summary (e.g. "Marked payment ② collected · RM 18,000", "Stage advanced design-contract → 3d-drawing") and expands to show a clean before-vs-after field-level diff (`updated_at` and other noise filtered out). `canViewAuditLog(role)` mirrors the Phase 0D `audit_log_read_admin` policy — the Company hub hides the card and the page redirects non-admins back to `/company`. |
| **Sentry error tracking** | `d748132` | Added `@sentry/react` with an env-gated `initSentry()` in `client/src/lib/sentry.ts`. Called from `main.tsx` before React mounts, so boot-time crashes are captured too. `AuthContext` tags the Sentry user on every resolved session (auth user id + email + staff id / role / name) and clears it on sign-out. `ErrorBoundary` now also forwards caught errors to Sentry with the React component stack. A `beforeSend` hook drops the routine Supabase network blips (`Load failed` / `NetworkError when attempting`) so the inbox stays signal-only. When `VITE_SENTRY_DSN` is unset the entire integration short-circuits to a silent no-op — local dev / CI builds work without any DSN. Bundle cost: +~25 KB / +5 KB gzip on the main chunk. |
| **Typed Supabase schema** | _this commit_ | New `client/src/lib/database.types.ts` mirrors what `supabase gen types typescript` emits — Row / Insert / Update for all 16 tables, all 13 enums, all 5 callable RPCs, plus `Tables<>` / `TablesInsert<>` / `TablesUpdate<>` / `Enums<>` extraction helpers. `supabase` is now `createClient<Database>(...)`, so every `.from()`, `.update()`, `.insert()`, and `.rpc()` is checked against the schema. `dbTypes.ts` keeps the legacy `StaffRow` / `ProjectRow` / etc. aliases working but derives them from `Database`. The new types caught ~25 real bugs — untyped `Record<string, unknown>` payloads, `string \| undefined` ids passed to `.eq()`, JSONB columns being read as if they were typed objects — all fixed at the call sites instead of papered over with casts. New `bun run gen:types` script regenerates the schema file via the Supabase CLI for anyone with a `SUPABASE_ACCESS_TOKEN`. |

---

## Current State

### Infrastructure

- ✅ GitHub repo (private), `main` branch auto-deploys to Vercel
- ✅ Vercel free-tier hosting at `spazehaus.vercel.app` with HTTPS + Singapore CDN edge
- ✅ Supabase project (Singapore region, free tier — covers SpazeHaus's volume for years)
- ✅ Magic-link auth via Supabase Auth (Site URL + redirect URLs configured for both localhost + prod)
- ✅ All 9 migrations applied to the live database (after running 0C.2 + 0D + 0E)
- ✅ Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) configured for Production / Preview / Development
- ✅ pnpm lockfile in sync (Vercel builds pass)
- ✅ TS check passes (`bun run check` exit 0)
- ✅ Production build passes (`NODE_ENV=production bun x vite build`) — no inlined manus runtime
- ✅ Supabase Storage `site-photos` bucket with bucket policies

### Authentication & access

- ✅ `kaseyfong@saysheji.com` mapped to Grace Tan (SH001), role `principal` — full admin access
- ✅ Role-based RLS enforced — every authenticated user is gated at the DB layer
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

## Applying the new migrations

Run these in the Supabase SQL editor, in order, against project `jifrzsvqdshjbqptubgz`:

1. `supabase/migrations/20260513000001_phase_0c2_schema.sql` — adds `calendar_events`, `kpi_records`, Storage `site-photos` bucket
2. `supabase/migrations/20260513000002_phase_0c2_seed.sql` — seeds calendar events + KPI records
3. `supabase/migrations/20260513000003_phase_0d_rls.sql` — tightens RLS to role-based
4. `supabase/migrations/20260513000004_phase_0e_staff_emails.sql` — **edit first**, then paste
5. `supabase/migrations/20260513000005_tier1_signature_docs_bucket.sql` — adds `signature-docs` Storage bucket + OPS-tier object RLS (must be run AFTER 0D so `public.is_ops_tier()` exists)
6. `supabase/migrations/20260513000006_tier1_stage_advancement.sql` — materialises the 29-stage workflow into `lifecycle_stages`, adds FK + auto-advance triggers

After step 3, the app behaves as before for `kaseyfong@saysheji.com` (principal, full access). Any new sign-ins from staff are filtered per their role. After step 4, the other 9 staff can sign in with their real emails. After step 5, the SIGN button in the Lifecycle tab + Checkpoints page works end-to-end. After step 6, marking a payment collected or a signature signed automatically moves the project to the next required SOP action.

---

## Next Steps — Tier 1 candidates

Payment-collected mutations, document upload + e-sign, stage auto-advance, `/company/audit`, Sentry, and typed schema are all done. Remaining options:

| Feature | Effort | Why it matters |
|---|---|---|
| **WhatsApp reminder integration** | 1–2 days | Hook Reminders into WhatsApp Business API so site supervisors get pinged at 5pm if they haven't uploaded their close-door photo. |
| **Client portal** | 2–3 days | Read-only public link per project for clients to see progress + sign documents. Requires separate Supabase auth flow. |
| **E2E test suite** | 2–3 hours | Convert Inquiry / Payment Collection / Sign Document are the three highest-value mutations — worth Playwright happy-path tests for each. |
| **Dead-mock cleanup** | 1 hour | Delete the orphaned mock arrays in `mockData.ts`, `customerData.ts`, `reminderData.ts`, `performanceData.ts`, `quotationData.ts`, `lifecycleData.ts` (config exports stay). |
| **Audit pagination** | 1 hour | The current `/company/audit` viewer caps at 200 rows. Once activity outpaces that, add "Load more" + a row_id search field for finding specific entries. |
| **Sentry source-map uploads** | 30 min | Add `@sentry/vite-plugin` so production stack traces show real symbols instead of minified ones. Needs a `SENTRY_AUTH_TOKEN` build-time env var. |
| **Live `supabase gen types` regen** | 5 min | `export SUPABASE_ACCESS_TOKEN=...` then `bun run gen:types`. Replaces the hand-authored `database.types.ts` with the CLI output as a sanity check. |

---

## Known Gaps / Tech Debt

- **Dead mock arrays** in `mockData.ts`, `customerData.ts`, `reminderData.ts`, `performanceData.ts`, `quotationData.ts`, `lifecycleData.ts` (e.g. `staffMembers`, `leaveRequests`, `inquiries`, `projectLifecycles`, `quotations`, `sitePhotoLogs`, `staffTargets`). Nothing reads them anymore, but they're still exported. Could be deleted in a cleanup pass. Files still export UI config (statusConfig / priorityConfig / categoryColors / reminderTypeConfig / etc.) that legitimately stays.
- **MOCK_TODAY** anchored to 2026-05-10 still drives the relative-date buckets in the demo. Replace with `new Date()` once real users start logging changes — or keep as a configurable demo flag.
- **`staff_role` enum** has both `admin` and `principal` — semantically overlapping. Phase 0D treats them identically (both in the ADMIN tier), so we could consolidate later. Not urgent.
- **No mutation hooks** for editing payments (status), signatures (status), or staff records. The Leave / Candidate / Quotation status mutations are wired; the others are read-only until Tier 1's "Payment-collected mutations" task lands.
- **No 1.8MB chunk-split** of the main JS bundle. The vite build warns about it. Not blocking, but doing a `manualChunks` pass would speed up first paint.
- **Site Storage bucket is public-via-signed-URL only**. Each photo render in Reminders 14-day grid would need a signed URL fetch. The current UI shows uploaded/missed cells but doesn't render the actual photos — once you want previews, wire `getSitePhotoUrl()` into a photo viewer modal.
