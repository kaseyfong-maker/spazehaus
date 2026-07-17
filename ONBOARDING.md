# SPAZEHAUS App — Developer & Operator Onboarding

Welcome. You're taking over the SPAZEHAUS internal management app — dev **and** operations. This guide gets you productive fast. Read top to bottom once, then keep it open as a reference.

**You'll use Claude Code for this project** (the previous owner did). When in doubt, ask Claude Code in this repo — it can read the whole codebase and `progress.md` for deep context.

---

## 1. What this is

A production-deployed, auth-gated, fully database-backed internal management app for SPAZEHAUS interior design firm (Johor Bahru, Malaysia). Staff sign in via magic link; clients view read-only project portals via a public link. Every page reads from real Postgres through Supabase.

- **Live app:** https://spazehaus.vercel.app
- **Repo:** `git@github.com:kaseyfong-maker/spazehaus.git` (private)
- **Database:** Supabase project `exajkbvaqjqdedqavbvs` (Singapore region, free tier)
- **Hosting:** Vercel (free tier, auto-deploys `main`)

---

## 2. Quick start (local dev)

```bash
# 1. Clone (once you have GitHub access — see section 7)
git clone git@github.com:kaseyfong-maker/spazehaus.git
cd spazehaus

# 2. Install dependencies (this project uses bun)
bun install

# 3. Set up local env vars
cp .env.example .env.local
#    Then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
#    (get them from Supabase dashboard → Project Settings → API,
#     or ask Kasey). Sentry vars are optional for local dev.

# 4. Run the dev server (Vite on http://localhost:5173)
bun run dev

# 5. Before every commit — type-check must pass
bun run check        # runs tsc --noEmit, must exit 0
```

**Required env vars for local dev:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Everything else (Sentry, etc.) is optional and gated — the app runs fine without them.

---

## 3. Tech stack & architecture

| Layer          | Tech                                                  |
| -------------- | ----------------------------------------------------- |
| Frontend       | React 19 + Vite + Tailwind v4                         |
| Routing        | Wouter (lightweight SPA router)                       |
| Data fetching  | TanStack Query (React Query)                          |
| Backend        | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Auth           | Supabase magic-link (passwordless email)              |
| Error tracking | Sentry (env-gated — no-op without DSN)               |
| Deploy         | Vercel (auto-deploys`main` branch)                  |

**Mobile-first** — designed around a 430px frame with a bottom nav (Home / Projects / Company / Calendar / Profile).

### Where things live

```
client/src/
  pages/         26 page components (one per route)
  components/    8 shared components (AppHeader, AuthGate, sheets, etc.)
  contexts/      AuthContext.tsx — the auth state machine
  lib/           queries.ts (ALL data hooks), database.types.ts (generated),
                 lifecycleData.ts (29-stage workflow + date helpers),
                 supabase.ts (client singleton), clientPortal.ts, sentry.ts
  hooks/         misc React hooks
supabase/
  migrations/    14 SQL migrations (schema, RLS, RPCs, buckets) — apply in order
  functions/     2 Edge Functions: client-portal-photo, send-daily-reminders
  README.md      Supabase-specific notes
server/          minimal Express shim (mostly unused in prod — Vercel serves static)
shared/          shared TypeScript types
```

### The single most important file

`client/src/lib/queries.ts` — every data hook (read + mutation) lives here, plus pure compute helpers (`computeTeamPerformance`, `buildReminders`, etc.). When you add a feature, you almost always add a hook here.

### Key architectural rules

1. **Database is the single source of truth.** Types in `client/src/lib/database.types.ts` are GENERATED from the live schema — never hand-edit. Regenerate with `bun run gen:types` after any migration (see section 5).
2. **RLS enforces access at the DB layer.** Three tiers: ADMIN (principal/admin/admin_exec), OPS (pm/site_supervisor), FIELD (designer/sales). The UI hides what RLS would block, but RLS is the real gate.
3. **Mutations flow through TanStack Query** with cache invalidations. See `useUpdatePayment`, `useUpdateSignature`, etc. in queries.ts for the pattern.
4. **Audit trail is automatic** — a DB trigger logs every INSERT/UPDATE/DELETE to `audit_log`. View it at `/company/audit` (admin only).

---

## 4. The roadmap — READ `progress.md`

**`progress.md` at the repo root is the canonical project history and roadmap.** It documents every feature shipped (with commit hashes), the current state, verification commands, and the prioritized next-steps list. Read it after this guide.

High-level status:

- **Tier 0** (real backend): DONE — schema, auth, RLS, full data migration
- **Tier 1** (user-facing features): DONE — payment collection, doc e-sign, stage auto-advance, audit viewer, Sentry, bundle optimization, WhatsApp reminder scaffold, read-only client portal
- **Tier 1.5** (mop-up): IN PROGRESS — `MOCK_TODAY → getToday()` done; remaining: `HERO_BG` CDN swap, `updateStaff`/`updateProject` mutation hooks
- **Tier 2**: not started — see `progress.md` "Next Steps" table for candidates (client portal signing flow, token regen UI, E2E tests, etc.)

There's also a deferred **PWA conversion decision** — research findings are documented (lean ~8h V1 vs full ~33h plan). Ask Kasey or read the project notes.

---

## 5. Conventions (follow these)

### Commit style

Look at `git log` for the house style. Format: `Tier N — Short summary` for features, `Fix: ...` for bugfixes. Bodies explain the *why*. Commits are co-authored with Claude.

### Keep `progress.md` current

Every meaningful change updates `progress.md` — it's the team's source of truth. This is non-negotiable house discipline.

### Regenerating DB types after a migration

```bash
export SUPABASE_ACCESS_TOKEN=sbp_…   # from supabase.com/dashboard/account/tokens
bun run gen:types                     # regenerates client/src/lib/database.types.ts
```

The script stages to `/tmp` first and only moves into place if the CLI exits 0 — a failed run can't empty the real file. If a regen surfaces new TS errors, that's usually a *real* bug the live schema just exposed — fix at the call site, don't paper over with casts.

### Applying migrations

Migrations in `supabase/migrations/` are applied via the **Supabase SQL Editor** (paste + run) or the Supabase CLI. There is no automated migration runner in CI. Apply in filename order. After applying, run `bun run gen:types`.

### Verification before pushing

```bash
bun run check                          # TypeScript — must exit 0
NODE_ENV=production bun x vite build    # production build — must succeed
```

---

## 6. Operations runbook

### Adding a new staff member (so they can log in)

1. Insert/update their row in the `staff` table via Supabase SQL Editor. Pattern is in `supabase/migrations/20260518000001_add_test_login_emails.sql`.
2. **Store the email in lowercase** — the auth lookup is case-insensitive now (uses `.ilike`), but lowercase is the house convention.
3. Set their `role` (controls RLS tier): `principal`/`admin`/`admin_exec` = full access; `pm`/`site_supervisor` = operations; `designer`/`sales` = field.
4. They visit https://spazehaus.vercel.app/login, enter their email, click the magic link. A DB trigger (`link_staff_to_auth_user`) auto-links their `auth.users` row to their `staff` row by email.

### Email delivery (magic links) — IMPORTANT

Magic-link emails are sent via **SendGrid SMTP** (configured in Supabase → Authentication → Emails → SMTP Settings).

- Sender: `kaseyfong@saysheji.com` (a verified SendGrid Single Sender)
- SendGrid free tier: 100 emails/day
- **Why not Resend?** Resend needs an MX record on a subdomain, which Wix DNS (where `saysheji.com` lives) can't host. SendGrid only needs a verified single sender — no DNS dependency.
- **If "email rate limit exceeded":** Supabase Auth → Rate Limits → bump email rate limit (default is low).
- **If "Error sending magic link email":** check the SendGrid dashboard → Activity for the failure reason (usually sender not verified or API key scope).

### Monitoring

- **Errors:** Sentry (if DSN configured) — captures runtime crashes with source maps
- **Deploys:** Vercel dashboard — every push to `main` triggers a build
- **DB / Auth logs:** Supabase dashboard → Logs
- **Audit trail:** the app's own `/company/audit` page (admin login required)

### Edge Functions (deployed separately from the web app)

- `client-portal-photo` — mints signed URLs for the public client portal's photo thumbnails
- `send-daily-reminders` — WhatsApp daily-photo reminder dispatcher (SCAFFOLD — not yet activated; see its README)
  Deploy with: `bun x supabase functions deploy <name> --project-ref exajkbvaqjqdedqavbvs`

---

## 7. Access you should have been granted — verify each

Kasey will invite you to these. Confirm you can log into all of them:

- [X] **GitHub** — collaborator on `kaseyfong-maker/spazehaus` (accept the email invite, then `git clone`)
- [X] **Supabase** — member of the org / project `exajkbvaqjqdedqavbvs`
- [X] **Vercel** — member of the team / project hosting `spazehaus.vercel.app`
- [ ] **SendGrid** — teammate on the SendGrid account (or shared API key for SMTP)
- [ ] **Sentry** — member of the org (if error tracking is in use)
- [ ] **Wix** — access to `saysheji.com` DNS (only if you'll change email/domain config)
- [X] **Env values** — the `VITE_SUPABASE_ANON_KEY` for local `.env.local` (from Supabase dashboard or Kasey)

Once GitHub + Supabase access works and `bun run dev` boots locally, you're unblocked.

---

## 8. First tasks to get your feet wet

Good low-risk starters (all in `progress.md`'s Tier 1.5 / Tier 2 lists):

1. **`HERO_BG` CDN swap** (~5 min) — `Reminders.tsx:39` and `PerformanceReport.tsx:35` reference an external Manus CDN image URL. Self-host it instead.
2. **`updateStaff` / `updateProject` mutation hooks** (~1-2h) — add editable hooks to `queries.ts`; the staff directory + project header are currently read-only.
3. Read `progress.md` "Next Steps" table and pick a Tier 2 feature with Kasey.

When ready, ask Claude Code in this repo: *"Read progress.md and the codebase, then help me implement X."*

Welcome aboard.
