# SPAZEHAUS — Supabase Setup

This folder contains the SQL migrations that build the database schema, lock it down with Row Level Security, and seed it with the same data the app's mock files have been using.

## Migrations (apply in order)

| File | What it does |
|---|---|
| `migrations/20260512000001_schema.sql` | Tables, enums, indexes, `updated_at` trigger, audit trigger |
| `migrations/20260512000002_rls.sql`    | Enables RLS on every table + permissive policies for authenticated users (tightened in Phase 0D) |
| `migrations/20260512000003_seed.sql`   | All current mock data: 10 staff, 5 projects, 29 payments, 30 signatures, 13 inquiries, 4 quotations + 33 line items, leave/recruitment/announcements, sales targets |

## How to apply (one-time, ~5 min)

### Easiest path — Supabase SQL Editor

1. Open your project at https://supabase.com/dashboard/project/jifrzsvqdshjbqptubgz
2. Left sidebar → **SQL Editor** → **New query**
3. **Apply each file in order:**
   - Open `20260512000001_schema.sql` from this repo, copy the entire contents, paste into the editor, click **Run**. Wait for "Success".
   - Repeat for `20260512000002_rls.sql`.
   - Repeat for `20260512000003_seed.sql`.
4. After all three: left sidebar → **Table Editor**. You should see all the tables, populated.

### Sanity checks

Run these in the SQL Editor to confirm everything is in:

```sql
select 'staff' as t, count(*) from staff
union all select 'projects',          count(*) from projects
union all select 'payment_records',   count(*) from payment_records
union all select 'signature_records', count(*) from signature_records
union all select 'inquiries',         count(*) from inquiries
union all select 'quotations',        count(*) from quotations
union all select 'quotation_items',   count(*) from quotation_items
union all select 'leave_requests',    count(*) from leave_requests
union all select 'candidates',        count(*) from candidates
union all select 'announcements',     count(*) from announcements
union all select 'sales_targets',     count(*) from sales_targets;
```

Expected:

| t                  | count |
|--------------------|-------|
| staff              | 10    |
| projects           | 5     |
| payment_records    | 29    |
| signature_records  | 30    |
| inquiries          | 13    |
| quotations         | 4     |
| quotation_items    | 33    |
| leave_requests     | 4     |
| candidates         | 5     |
| announcements      | 3     |
| sales_targets      | 3     |

## What's NOT in this phase

These come in later phases:

- **Auth wiring** (Phase 0B) — magic-link login; staff rows get `auth_user_id` set when each person first signs in
- **Data layer in the app** (Phase 0C) — replace `lib/*.ts` mocks with Supabase queries
- **Role-based RLS** (Phase 0D) — currently every authenticated user can do everything; will tighten so sales sees only their leads, etc.
- **Vercel env vars** (Phase 0E) — `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` added to the production deploy

## If you need to start over

```sql
-- DANGER: drops everything
drop schema public cascade;
create schema public;
grant all on schema public to postgres, anon, authenticated, service_role;
```

Then re-run the three migrations.
