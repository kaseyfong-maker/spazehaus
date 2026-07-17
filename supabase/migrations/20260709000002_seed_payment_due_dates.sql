-- ───────────────────────────────────────────────────────────────────────────
-- Seed payment due dates: populate due_date fields to showcase Dashboard KPIs
--
-- WHY: The base seed and demo seeds do not populate `due_date` on `payment_records`
-- (they default to NULL). This results in 0 "Overdue" and 0 "Due This Week" on the
-- home dashboard.
-- This migration updates a few pending payments with realistic due dates relative
-- to "today" (2026-07-09) to make the dashboard look alive and fully functional.
-- ───────────────────────────────────────────────────────────────────────────

set session_replication_role = replica;

-- ── 1. Set Overdue Payments (due_date < '2026-07-09') ───────────────────────

-- PRJ001 Gate 2: Design Contract Fee (due on 2026-06-15)
update public.payment_records
set due_date = '2026-06-15'
where project_id = 'PRJ001' and gate = 2;

-- PRJ002 Gate 4: Progressive Payment (due on 2026-07-05)
update public.payment_records
set due_date = '2026-07-05'
where project_id = 'PRJ002' and gate = 4;

-- PRJ004 Gate 3: Renovation Deposit (50%) (due on 2026-07-01)
update public.payment_records
set due_date = '2026-07-01'
where project_id = 'PRJ004' and gate = 3;

-- ── 2. Set Due This Week Payments ('2026-07-09' <= due_date <= '2026-07-16') 

-- PRJ001 Gate 3: Renovation Deposit (50%) (due on 2026-07-12)
update public.payment_records
set due_date = '2026-07-12'
where project_id = 'PRJ001' and gate = 3;

-- PRJ003 Gate 2: Design Contract Fee (due on 2026-07-13)
update public.payment_records
set due_date = '2026-07-13'
where project_id = 'PRJ003' and gate = 2;

-- ── 3. General Fallbacks for other pending payments ─────────────────────────
-- For all other pending payments that are not set above, give them reasonable
-- future due dates so they don't stay NULL.
-- Gate 4 -> start_date + 90 days, Gate 5 -> start_date + 120 days.
update public.payment_records pr
set due_date = p.start_date + (pr.gate * 30)
from public.projects p
where pr.project_id = p.id
  and pr.status = 'pending'
  and pr.due_date is null;

reset session_replication_role;
