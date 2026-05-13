-- ============================================================================
-- SPAZEHAUS — Phase 0D Role-based RLS
-- Generated: 2026-05-13
--
-- Replaces the permissive "any authenticated user" policies from Phase 0A
-- with a role-aware design. Three tiers:
--
--   ADMIN      — principal, admin, admin_exec
--                Full read/write everywhere. Approve leave. Edit announcements.
--                Read audit log. Read all KPI + sales targets.
--
--   OPERATIONS — pm, site_supervisor
--                Read everything. Write on operational tables they touch:
--                projects, payment_records, signature_records, site_photos,
--                calendar_events, their own leave_requests + own KPI/targets.
--
--   FIELD      — designer, sales
--                Read everything. Write on records assigned to them
--                (inquiries with assigned_to_id, quotations they created, etc.)
--                + their own leave_requests + read only their own KPI/targets.
--
-- The policies use stable SECURITY DEFINER functions to look up the caller's
-- staff_id + role, avoiding repeated subqueries inside every policy.
-- ============================================================================

-- ─── HELPERS ────────────────────────────────────────────────────────────────

create or replace function public.current_staff_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.staff where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.staff where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_staff_avatar()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select avatar_code from public.staff where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin_tier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.staff where auth_user_id = auth.uid() limit 1)
      in ('principal','admin','admin_exec'),
    false
  );
$$;

create or replace function public.is_ops_tier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.staff where auth_user_id = auth.uid() limit 1)
      in ('principal','admin','admin_exec','pm','site_supervisor'),
    false
  );
$$;

grant execute on function public.current_staff_id()    to authenticated;
grant execute on function public.current_staff_role()  to authenticated;
grant execute on function public.current_staff_avatar() to authenticated;
grant execute on function public.is_admin_tier()       to authenticated;
grant execute on function public.is_ops_tier()         to authenticated;

-- ─── DROP PERMISSIVE PHASE-0A POLICIES ──────────────────────────────────────

drop policy if exists "authenticated_read_staff"             on staff;
drop policy if exists "authenticated_write_staff"            on staff;
drop policy if exists "authenticated_read_projects"          on projects;
drop policy if exists "authenticated_write_projects"         on projects;
drop policy if exists "authenticated_read_payments"          on payment_records;
drop policy if exists "authenticated_write_payments"         on payment_records;
drop policy if exists "authenticated_read_signatures"        on signature_records;
drop policy if exists "authenticated_write_signatures"       on signature_records;
drop policy if exists "authenticated_read_inquiries"         on inquiries;
drop policy if exists "authenticated_write_inquiries"        on inquiries;
drop policy if exists "authenticated_read_quotations"        on quotations;
drop policy if exists "authenticated_write_quotations"       on quotations;
drop policy if exists "authenticated_read_quotation_items"   on quotation_items;
drop policy if exists "authenticated_write_quotation_items"  on quotation_items;
drop policy if exists "authenticated_read_leave"             on leave_requests;
drop policy if exists "authenticated_write_leave"            on leave_requests;
drop policy if exists "authenticated_read_candidates"        on candidates;
drop policy if exists "authenticated_write_candidates"       on candidates;
drop policy if exists "authenticated_read_announcements"     on announcements;
drop policy if exists "authenticated_write_announcements"    on announcements;
drop policy if exists "authenticated_read_site_photos"       on site_photos;
drop policy if exists "authenticated_write_site_photos"      on site_photos;
drop policy if exists "authenticated_read_sales_targets"     on sales_targets;
drop policy if exists "authenticated_write_sales_targets"    on sales_targets;
drop policy if exists "authenticated_read_audit_log"         on audit_log;
drop policy if exists "authenticated_read_calendar_events"   on calendar_events;
drop policy if exists "authenticated_write_calendar_events"  on calendar_events;
drop policy if exists "authenticated_read_kpi_records"       on kpi_records;
drop policy if exists "authenticated_write_kpi_records"      on kpi_records;

-- ─── STAFF ──────────────────────────────────────────────────────────────────
-- Everyone authenticated can read the directory.
-- Anyone can update their own row (phone, etc.). Admin tier can write any row.

create policy "staff_read_all"
  on staff for select to authenticated
  using (true);

create policy "staff_update_self"
  on staff for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "staff_write_admin"
  on staff for all to authenticated
  using (public.is_admin_tier())
  with check (public.is_admin_tier());

-- ─── PROJECTS ───────────────────────────────────────────────────────────────
-- All staff read all projects. Ops tier writes any project.
-- Field tier (designer/sales) can update a project they're attached to
-- (designer_id, pm_id, or avatar in team).

create policy "projects_read_all"
  on projects for select to authenticated
  using (true);

create policy "projects_write_admin_or_ops"
  on projects for all to authenticated
  using (public.is_ops_tier())
  with check (public.is_ops_tier());

create policy "projects_update_assigned"
  on projects for update to authenticated
  using (
    designer_id = public.current_staff_id()
    or pm_id      = public.current_staff_id()
    or public.current_staff_avatar() = any(team)
  )
  with check (
    designer_id = public.current_staff_id()
    or pm_id      = public.current_staff_id()
    or public.current_staff_avatar() = any(team)
  );

-- ─── PAYMENT RECORDS ────────────────────────────────────────────────────────
-- Sensitive financials. Read by everyone, write only by ops tier.

create policy "payments_read_all"
  on payment_records for select to authenticated
  using (true);

create policy "payments_write_ops"
  on payment_records for all to authenticated
  using (public.is_ops_tier())
  with check (public.is_ops_tier());

-- ─── SIGNATURE RECORDS ──────────────────────────────────────────────────────

create policy "signatures_read_all"
  on signature_records for select to authenticated
  using (true);

create policy "signatures_write_ops"
  on signature_records for all to authenticated
  using (public.is_ops_tier())
  with check (public.is_ops_tier());

-- ─── INQUIRIES ──────────────────────────────────────────────────────────────
-- Sales staff can read all and update their own (where assigned_to_id = self).
-- Ops tier full access.

create policy "inquiries_read_all"
  on inquiries for select to authenticated
  using (true);

create policy "inquiries_write_ops"
  on inquiries for all to authenticated
  using (public.is_ops_tier())
  with check (public.is_ops_tier());

create policy "inquiries_update_own"
  on inquiries for update to authenticated
  using (assigned_to_id = public.current_staff_id())
  with check (assigned_to_id = public.current_staff_id());

create policy "inquiries_insert_any_authenticated"
  on inquiries for insert to authenticated
  with check (true);                               -- anyone logged-in can log a new inquiry

-- ─── QUOTATIONS + ITEMS ─────────────────────────────────────────────────────

create policy "quotations_read_all"
  on quotations for select to authenticated
  using (true);

create policy "quotations_write_ops"
  on quotations for all to authenticated
  using (public.is_ops_tier())
  with check (public.is_ops_tier());

create policy "quotations_update_creator"
  on quotations for update to authenticated
  using (created_by = public.current_staff_id())
  with check (created_by = public.current_staff_id());

create policy "quotations_insert_any_authenticated"
  on quotations for insert to authenticated
  with check (true);

create policy "quotation_items_read_all"
  on quotation_items for select to authenticated
  using (true);

create policy "quotation_items_write_ops"
  on quotation_items for all to authenticated
  using (public.is_ops_tier())
  with check (public.is_ops_tier());

create policy "quotation_items_via_quotation"
  on quotation_items for all to authenticated
  using (
    exists (
      select 1 from quotations q
      where q.id = quotation_items.quotation_id
        and q.created_by = public.current_staff_id()
    )
  )
  with check (
    exists (
      select 1 from quotations q
      where q.id = quotation_items.quotation_id
        and q.created_by = public.current_staff_id()
    )
  );

-- ─── LEAVE REQUESTS ─────────────────────────────────────────────────────────
-- Everyone reads (visibility = required for site planning).
-- Anyone can apply for their own leave (insert with staff_id = self).
-- Anyone can update their own pending requests.
-- Admin tier can update any (approve/reject).

create policy "leave_read_all"
  on leave_requests for select to authenticated
  using (true);

create policy "leave_insert_self"
  on leave_requests for insert to authenticated
  with check (staff_id = public.current_staff_id());

create policy "leave_update_self_pending"
  on leave_requests for update to authenticated
  using (staff_id = public.current_staff_id() and status = 'pending')
  with check (staff_id = public.current_staff_id());

create policy "leave_write_admin"
  on leave_requests for all to authenticated
  using (public.is_admin_tier())
  with check (public.is_admin_tier());

-- ─── CANDIDATES (RECRUITMENT) ──────────────────────────────────────────────
-- Read by all. Write by admin tier only.

create policy "candidates_read_all"
  on candidates for select to authenticated
  using (true);

create policy "candidates_write_admin"
  on candidates for all to authenticated
  using (public.is_admin_tier())
  with check (public.is_admin_tier());

-- ─── ANNOUNCEMENTS ──────────────────────────────────────────────────────────
-- Read by all. Write by admin tier.

create policy "announcements_read_all"
  on announcements for select to authenticated
  using (true);

create policy "announcements_write_admin"
  on announcements for all to authenticated
  using (public.is_admin_tier())
  with check (public.is_admin_tier());

-- ─── SITE PHOTOS ────────────────────────────────────────────────────────────
-- Read by all. Insert by anyone (site supervisor uploads from the field, but
-- any authenticated staff may upload via the Reminders page). Update/delete by
-- the uploader, ops tier, or admin.

create policy "site_photos_read_all"
  on site_photos for select to authenticated
  using (true);

create policy "site_photos_insert_any"
  on site_photos for insert to authenticated
  with check (true);

create policy "site_photos_update_uploader"
  on site_photos for update to authenticated
  using (uploaded_by_id = public.current_staff_id() or public.is_ops_tier())
  with check (uploaded_by_id = public.current_staff_id() or public.is_ops_tier());

create policy "site_photos_delete_ops"
  on site_photos for delete to authenticated
  using (public.is_ops_tier());

-- ─── SALES TARGETS ──────────────────────────────────────────────────────────
-- Personal data. Each staff reads their own; admin tier reads everyone.

create policy "sales_targets_read_self_or_admin"
  on sales_targets for select to authenticated
  using (staff_id = public.current_staff_id() or public.is_admin_tier());

create policy "sales_targets_write_admin"
  on sales_targets for all to authenticated
  using (public.is_admin_tier())
  with check (public.is_admin_tier());

-- ─── KPI RECORDS ────────────────────────────────────────────────────────────
-- Personal performance review data. Self + admin tier.

create policy "kpi_read_self_or_admin"
  on kpi_records for select to authenticated
  using (staff_id = public.current_staff_id() or public.is_admin_tier());

create policy "kpi_write_admin"
  on kpi_records for all to authenticated
  using (public.is_admin_tier())
  with check (public.is_admin_tier());

-- ─── CALENDAR EVENTS ────────────────────────────────────────────────────────
-- Read by all. Create/edit by anyone for events linked to themselves; admin
-- tier full access.

create policy "calendar_events_read_all"
  on calendar_events for select to authenticated
  using (true);

create policy "calendar_events_write_admin"
  on calendar_events for all to authenticated
  using (public.is_admin_tier())
  with check (public.is_admin_tier());

create policy "calendar_events_insert_self"
  on calendar_events for insert to authenticated
  with check (created_by = public.current_staff_id() or staff_id = public.current_staff_id());

create policy "calendar_events_update_self"
  on calendar_events for update to authenticated
  using (created_by = public.current_staff_id() or staff_id = public.current_staff_id())
  with check (created_by = public.current_staff_id() or staff_id = public.current_staff_id());

-- ─── AUDIT LOG ──────────────────────────────────────────────────────────────
-- Admin tier reads everything; everyone else can see only their own actions.

create policy "audit_log_read_admin"
  on audit_log for select to authenticated
  using (public.is_admin_tier());

create policy "audit_log_read_own"
  on audit_log for select to authenticated
  using (changed_by = auth.uid());

-- ─── STORAGE: SITE-PHOTOS BUCKET ────────────────────────────────────────────
-- Phase 0C.2 set permissive policies; tighten now. Any authenticated staff
-- can list + upload + read (signed URLs). Only the uploader's own files (path
-- prefix matches their staff id) or ops tier can delete.

drop policy if exists "auth_read_site_photos"   on storage.objects;
drop policy if exists "auth_insert_site_photos" on storage.objects;
drop policy if exists "auth_update_site_photos" on storage.objects;
drop policy if exists "auth_delete_site_photos" on storage.objects;

create policy "site_photos_storage_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'site-photos');

create policy "site_photos_storage_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-photos');

create policy "site_photos_storage_update_ops"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-photos' and public.is_ops_tier())
  with check (bucket_id = 'site-photos' and public.is_ops_tier());

create policy "site_photos_storage_delete_ops"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-photos' and public.is_ops_tier());
