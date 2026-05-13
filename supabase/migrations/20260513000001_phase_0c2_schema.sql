-- ============================================================================
-- SPAZEHAUS — Phase 0C.2 Schema
-- Generated: 2026-05-13
--
-- New tables introduced to migrate the remaining mock-backed pages to Supabase:
--
--   • calendar_events   — site visits, client meetings, leave overlays, company events
--                         (used by /calendar)
--   • kpi_records       — per-staff monthly KPI score breakdown (Part A/B/C)
--                         (used by /company/kpi, StaffProfile KPI tab, Profile badge)
--
-- Also: site_photos Storage bucket + access policies (Phase 0C.2b — used by
-- /reminders for the daily close-door photo SOP).
--
-- RLS policies follow the same "permissive for authenticated" pattern used by
-- Phase 0A. Phase 0D will tighten these.
-- ============================================================================

-- ─── CALENDAR EVENTS ────────────────────────────────────────────────────────
-- Free-form events overlaid on the company calendar. Most events tie back to
-- a project or a leave_request via *_id; standalone company events leave both
-- nullable.

create type calendar_event_type as enum ('project', 'meeting', 'leave', 'event');

create table calendar_events (
  id              text primary key,                      -- E001 style
  title           text not null,
  event_date      date not null,
  start_time      time,
  end_time        time,
  event_type      calendar_event_type not null,
  color           text not null,                         -- oklch(...) hex/string
  project_id      text references projects(id)        on delete set null,
  leave_id        text references leave_requests(id)  on delete set null,
  staff_id        text references staff(id)           on delete set null,
  notes           text,
  created_by      text references staff(id)           on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_calendar_events_date    on calendar_events(event_date);
create index idx_calendar_events_project on calendar_events(project_id);
create index idx_calendar_events_staff   on calendar_events(staff_id);

create trigger trg_calendar_events_uat
  before update on calendar_events
  for each row execute function set_updated_at();

create trigger trg_audit_calendar_events
  after insert or update or delete on calendar_events
  for each row execute function audit_change();

-- ─── KPI RECORDS ────────────────────────────────────────────────────────────
-- One row per (staff_id, year, month). The three Part columns mirror the
-- 2026 Annual Meeting PDF's review structure (Part A 30pt · Part B 50pt · Part C 20pt).

create table kpi_records (
  id              bigserial primary key,
  staff_id        text not null references staff(id) on delete cascade,
  year            int  not null check (year >= 2020 and year <= 2099),
  month           int  not null check (month between 1 and 12),
  part_a_score    int  not null check (part_a_score >= 0 and part_a_score <= 30),
  part_b_score    int  not null check (part_b_score >= 0 and part_b_score <= 50),
  part_c_score    int  not null check (part_c_score >= 0 and part_c_score <= 20),
  total_score     int  generated always as (part_a_score + part_b_score + part_c_score) stored,
  rating          text not null check (rating in ('A','B','C')),
  reviewer_id     text references staff(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (staff_id, year, month)
);

create index idx_kpi_records_staff_year on kpi_records(staff_id, year);

create trigger trg_kpi_records_uat
  before update on kpi_records
  for each row execute function set_updated_at();

create trigger trg_audit_kpi_records
  after insert or update or delete on kpi_records
  for each row execute function audit_change();

-- ─── RLS (PERMISSIVE — Phase 0D tightens) ───────────────────────────────────

alter table calendar_events enable row level security;
alter table kpi_records     enable row level security;

create policy "authenticated_read_calendar_events"  on calendar_events for select to authenticated using (true);
create policy "authenticated_write_calendar_events" on calendar_events for all    to authenticated using (true) with check (true);

create policy "authenticated_read_kpi_records"      on kpi_records     for select to authenticated using (true);
create policy "authenticated_write_kpi_records"     on kpi_records     for all    to authenticated using (true) with check (true);

-- ─── SITE PHOTO STORAGE BUCKET ──────────────────────────────────────────────
-- Phase 0C.2b — daily close-door photo SOP for active sites.
-- We create the bucket as PRIVATE and access via signed URLs (the Reminders
-- page generates a short-lived signed URL per photo). Path pattern:
--   site-photos/{project_id}/{photo_date}/{nanoid}.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-photos',
  'site-photos',
  false,                                                -- private; signed URLs only
  10485760,                                             -- 10 MB cap per photo
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Bucket access — authenticated staff can read + upload to any path inside the
-- `site-photos` bucket. Phase 0D adds per-project ownership checks.
create policy "auth_read_site_photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'site-photos');

create policy "auth_insert_site_photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-photos');

create policy "auth_update_site_photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-photos')
  with check (bucket_id = 'site-photos');

create policy "auth_delete_site_photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-photos');
