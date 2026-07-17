-- ───────────────────────────────────────────────────────────────────────────
-- Multi-staff calendar events: junction table `calendar_event_staff`
--
-- Replaces the single `calendar_events.staff_id` FK with a many-to-many
-- relationship so one event can be assigned to 1, 3, or more staff members
-- (e.g. a site inspection with PM + designer + supervisor).
--
-- The old `staff_id` column is NOT dropped — existing seed data and any
-- direct SQL queries still work. The app will read/write the junction table
-- going forward and ignore `staff_id`.
--
-- Backward compatible: existing rows get their `staff_id` migrated into the
-- junction table automatically. Apply via Supabase SQL Editor (paste + Run)
-- or `supabase db push`.
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. Create the junction table ────────────────────────────────────────────

create table if not exists public.calendar_event_staff (
  event_id  text not null references public.calendar_events(id) on delete cascade,
  staff_id  text not null references public.staff(id) on delete cascade,
  primary key (event_id, staff_id)
);

alter table public.calendar_event_staff owner to postgres;

-- Index for "which events is this staff member in?" lookups.
create index if not exists idx_calendar_event_staff_staff
  on public.calendar_event_staff (staff_id);

-- ── 2. RLS — mirror the calendar_events policies ───────────────────────────

alter table public.calendar_event_staff enable row level security;

-- Everyone authenticated can read all assignments (same as calendar_events_read_all).
create policy "ces_read_all"
  on public.calendar_event_staff for select
  to authenticated
  using (true);

-- Authenticated users can insert assignments for events they created.
-- We check the parent event's created_by rather than duplicating that column.
create policy "ces_insert_creator"
  on public.calendar_event_staff for insert
  to authenticated
  with check (
    exists (
      select 1 from public.calendar_events ce
      where ce.id = event_id
        and ce.created_by = public.current_staff_id()
    )
  );

-- Authenticated users can delete assignments from events they created.
create policy "ces_delete_creator"
  on public.calendar_event_staff for delete
  to authenticated
  using (
    exists (
      select 1 from public.calendar_events ce
      where ce.id = event_id
        and ce.created_by = public.current_staff_id()
    )
  );

-- Admins can do anything.
create policy "ces_write_admin"
  on public.calendar_event_staff
  to authenticated
  using (public.is_admin_tier())
  with check (public.is_admin_tier());

-- ── 3. Grants (same as other tables) ───────────────────────────────────────

grant all on table public.calendar_event_staff to anon;
grant all on table public.calendar_event_staff to authenticated;
grant all on table public.calendar_event_staff to service_role;

-- ── 4. Migrate existing staff_id data into the junction table ──────────────
-- Any calendar_events row that already has a staff_id gets a matching row in
-- the junction table. Idempotent: ON CONFLICT DO NOTHING for re-runs.

insert into public.calendar_event_staff (event_id, staff_id)
select id, staff_id
from public.calendar_events
where staff_id is not null
on conflict (event_id, staff_id) do nothing;
