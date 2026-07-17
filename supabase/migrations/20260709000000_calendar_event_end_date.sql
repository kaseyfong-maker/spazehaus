-- ───────────────────────────────────────────────────────────────────────────
-- Multi-day calendar events: add an optional end_date to calendar_events.
--
-- NULL end_date  → single-day event (end_date is treated as = event_date).
-- end_date > event_date → the event spans event_date … end_date (inclusive) and
-- renders as a bar across those days in the app.
--
-- Backward compatible: existing rows get NULL (still single-day). Apply on the
-- live DB via the Supabase SQL Editor (paste + Run) or `supabase db push`.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.calendar_events
  add column if not exists end_date date;

-- Guard against an inverted range at the DB level.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'calendar_events_end_date_after_start'
  ) then
    alter table public.calendar_events
      add constraint calendar_events_end_date_after_start
      check (end_date is null or end_date >= event_date);
  end if;
end $$;
