-- ============================================================================
-- SPAZEHAUS — Phase 0A Baseline RLS
-- Generated: 2026-05-12
--
-- Permissive policies — any authenticated user can read + write any row.
-- Phase 0D will replace these with role-aware policies once Auth is wired in
-- and staff have logged in at least once.
--
-- The point of running this now is to lock the database against ANONYMOUS
-- (un-logged-in) reads — without these policies any visitor of the project URL
-- with the anon key in hand could read everything.
-- ============================================================================

alter table staff             enable row level security;
alter table projects          enable row level security;
alter table payment_records   enable row level security;
alter table signature_records enable row level security;
alter table inquiries         enable row level security;
alter table quotations        enable row level security;
alter table quotation_items   enable row level security;
alter table leave_requests    enable row level security;
alter table candidates        enable row level security;
alter table announcements     enable row level security;
alter table site_photos       enable row level security;
alter table sales_targets     enable row level security;
alter table audit_log         enable row level security;

-- ─── Authenticated users: full access (placeholder) ─────────────────────────

create policy "authenticated_read_staff"             on staff             for select to authenticated using (true);
create policy "authenticated_write_staff"            on staff             for all    to authenticated using (true) with check (true);

create policy "authenticated_read_projects"          on projects          for select to authenticated using (true);
create policy "authenticated_write_projects"         on projects          for all    to authenticated using (true) with check (true);

create policy "authenticated_read_payments"          on payment_records   for select to authenticated using (true);
create policy "authenticated_write_payments"         on payment_records   for all    to authenticated using (true) with check (true);

create policy "authenticated_read_signatures"        on signature_records for select to authenticated using (true);
create policy "authenticated_write_signatures"       on signature_records for all    to authenticated using (true) with check (true);

create policy "authenticated_read_inquiries"         on inquiries         for select to authenticated using (true);
create policy "authenticated_write_inquiries"        on inquiries         for all    to authenticated using (true) with check (true);

create policy "authenticated_read_quotations"        on quotations        for select to authenticated using (true);
create policy "authenticated_write_quotations"       on quotations        for all    to authenticated using (true) with check (true);

create policy "authenticated_read_quotation_items"   on quotation_items   for select to authenticated using (true);
create policy "authenticated_write_quotation_items"  on quotation_items   for all    to authenticated using (true) with check (true);

create policy "authenticated_read_leave"             on leave_requests    for select to authenticated using (true);
create policy "authenticated_write_leave"            on leave_requests    for all    to authenticated using (true) with check (true);

create policy "authenticated_read_candidates"        on candidates        for select to authenticated using (true);
create policy "authenticated_write_candidates"       on candidates        for all    to authenticated using (true) with check (true);

create policy "authenticated_read_announcements"     on announcements     for select to authenticated using (true);
create policy "authenticated_write_announcements"    on announcements     for all    to authenticated using (true) with check (true);

create policy "authenticated_read_site_photos"       on site_photos       for select to authenticated using (true);
create policy "authenticated_write_site_photos"      on site_photos       for all    to authenticated using (true) with check (true);

create policy "authenticated_read_sales_targets"     on sales_targets     for select to authenticated using (true);
create policy "authenticated_write_sales_targets"    on sales_targets     for all    to authenticated using (true) with check (true);

-- Audit log: read-only for everyone authenticated. Inserts come only from the
-- audit trigger which runs as SECURITY DEFINER (table owner), so this is fine.
create policy "authenticated_read_audit_log"         on audit_log         for select to authenticated using (true);
