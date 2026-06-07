-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — Security hardening (pre-test audit fixes)
--
-- Closes four DB-layer worst-case holes found in the audit. RLS + grants are
-- the ONLY security boundary (the browser holds the publishable key and can
-- call any RPC/table directly), so every fix here is server-side.
--
--   1. anon could call SECURITY DEFINER RPCs that forge data (CRITICAL)
--   2. staff.status was never enforced — terminated staff kept full access
--   3. self-edit guard missed columns (avatar/leave/kpi/job → escalation)
--   4. convert_inquiry_to_project had no caller authz + a concurrent-convert race
-- ───────────────────────────────────────────────────────────────────────────


-- ── 1 + 2. Identity/tier helpers: ignore deactivated staff ──────────────────
-- Adding `status <> 'inactive'` means a terminated staff member resolves to
-- NULL identity / false tier everywhere RLS depends on these — fully revoking
-- their access at the only layer that can enforce it. on-leave / on-project are
-- legitimate working states and remain active.

create or replace function public.current_staff_id() returns text
    language sql stable security definer set search_path to 'public'
    as $$
  select id from public.staff
   where auth_user_id = auth.uid() and status <> 'inactive' limit 1;
$$;

create or replace function public.current_staff_role() returns public.staff_role
    language sql stable security definer set search_path to 'public'
    as $$
  select role from public.staff
   where auth_user_id = auth.uid() and status <> 'inactive' limit 1;
$$;

create or replace function public.current_staff_avatar() returns text
    language sql stable security definer set search_path to 'public'
    as $$
  select avatar_code from public.staff
   where auth_user_id = auth.uid() and status <> 'inactive' limit 1;
$$;

create or replace function public.is_admin_tier() returns boolean
    language sql stable security definer set search_path to 'public'
    as $$
  select coalesce(
    (select role from public.staff
      where auth_user_id = auth.uid() and status <> 'inactive' limit 1)
      in ('principal','admin','admin_exec'),
    false
  );
$$;

create or replace function public.is_ops_tier() returns boolean
    language sql stable security definer set search_path to 'public'
    as $$
  select coalesce(
    (select role from public.staff
      where auth_user_id = auth.uid() and status <> 'inactive' limit 1)
      in ('principal','admin','admin_exec','pm','site_supervisor'),
    false
  );
$$;

-- Block deactivated staff from even requesting a magic link.
create or replace function public.staff_email_exists(p_email text) returns boolean
    language sql stable security definer set search_path to 'public'
    as $$
  select exists (
    select 1 from public.staff
    where lower(email) = lower(trim(p_email))
      and status <> 'inactive'
  );
$$;


-- ── 3. Self-edit guard: lock every column a self-editor must not change ──────
-- The self-edit UI only exposes phone + whatsapp_opt_in. Everything else is
-- admin-only. Of the previously-unguarded columns, avatar_code was the worst:
-- projects_update_assigned grants write when current_staff_avatar() is in a
-- project's team[], so self-setting avatar_code = hijacking another project's
-- write access. leave_balance/kpi_grade were self-grantable HR fraud vectors.

create or replace function public.guard_staff_sensitive_columns() returns trigger
    language plpgsql security definer set search_path to 'public'
    as $$
begin
  -- System / service-role context (no end-user JWT) — e.g. the auth-linking
  -- trigger and admin maintenance. Allow unconditionally.
  if auth.uid() is null then
    return new;
  end if;

  -- Admin tier may change anything.
  if public.is_admin_tier() then
    return new;
  end if;

  -- A staff member self-editing their own row may change ONLY phone +
  -- whatsapp_opt_in. Reject any change to a privileged column.
  if new.role is distinct from old.role then
    raise exception 'Only an admin can change a staff member''s role';
  end if;
  if new.status is distinct from old.status then
    raise exception 'Only an admin can change a staff member''s status';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Only an admin can change a staff member''s email (it is the magic-link key)';
  end if;
  if new.auth_user_id is distinct from old.auth_user_id then
    raise exception 'auth_user_id is managed by the system';
  end if;
  if new.id is distinct from old.id then
    raise exception 'staff id is immutable';
  end if;
  if new.avatar_code is distinct from old.avatar_code then
    raise exception 'Only an admin can change a staff member''s avatar code';
  end if;
  if new.name is distinct from old.name then
    raise exception 'Only an admin can change a staff member''s name';
  end if;
  if new.job_title is distinct from old.job_title then
    raise exception 'Only an admin can change a staff member''s job title';
  end if;
  if new.dept is distinct from old.dept then
    raise exception 'Only an admin can change a staff member''s department';
  end if;
  if new.leave_balance_annual is distinct from old.leave_balance_annual then
    raise exception 'Only an admin can change leave balances';
  end if;
  if new.leave_balance_medical is distinct from old.leave_balance_medical then
    raise exception 'Only an admin can change leave balances';
  end if;
  if new.kpi_grade is distinct from old.kpi_grade then
    raise exception 'Only an admin can change a KPI grade';
  end if;

  return new;
end;
$$;


-- ── 4. Lock down the DEFINER RPCs that mutate business/financial data ───────
-- maybe_advance_project_stage is only ever called from the payment/signature
-- triggers (which run as the table owner, unaffected by these grants), so no
-- end-user role needs EXECUTE.
revoke execute on function public.maybe_advance_project_stage(text) from anon;
revoke execute on function public.maybe_advance_project_stage(text) from authenticated;

-- convert_inquiry_to_project is called from the UI by an OPS user, so keep the
-- authenticated grant but revoke anon, and gate the caller INSIDE the function
-- (SECURITY DEFINER bypasses RLS, so it must check the tier itself). Also take
-- a row lock on the inquiry to serialize two simultaneous conversions of the
-- same inquiry (otherwise both could pass the 'awarded' check → two projects).
revoke execute on function public.convert_inquiry_to_project(
  text, text, text, text, text, text, date, date, numeric, text, text[], numeric, text
) from anon;

create or replace function public.convert_inquiry_to_project("p_inquiry_id" text, "p_project_name" text, "p_designer_name" text, "p_pm_name" text, "p_designer_avatar" text, "p_pm_avatar" text, "p_start_date" date, "p_target_date" date, "p_budget" numeric, "p_priority" text, "p_areas" text[], "p_proposal_deposit" numeric, "p_assigned_to_avatar" text DEFAULT NULL::text) returns text
    language plpgsql security definer set search_path to 'public'
    as $_$
declare
  v_inq         inquiries%rowtype;
  v_new_id      text;
  v_max         int;
  v_today       date := current_date;
  v_design_fee  numeric;
  v_reno_total  numeric;
  v_reno_dep    numeric;
  v_progressive numeric;
  v_final       numeric;
  v_type        text;
  v_log_entry   jsonb;
begin
  -- Authorization: SECURITY DEFINER bypasses RLS, so gate the caller here.
  -- Only OPS tier (pm/site_supervisor) and admins may convert an inquiry.
  if not public.is_ops_tier() then
    raise exception 'Not authorized to convert inquiries' using errcode = '42501';
  end if;

  -- Load + validate the inquiry. FOR UPDATE serializes concurrent conversions
  -- of the same inquiry so the awarded-check below can't be won by two callers.
  select * into v_inq from inquiries where id = p_inquiry_id for update;
  if not found then
    raise exception 'Inquiry % not found', p_inquiry_id;
  end if;
  if v_inq.stage = 'awarded' then
    raise exception 'Inquiry % is already awarded', p_inquiry_id;
  end if;
  if v_inq.stage = 'rejected' then
    raise exception 'Cannot convert rejected inquiry %', p_inquiry_id;
  end if;

  -- Generate next PRJ id (PRJ001, PRJ002, …)
  select coalesce(max(substring(id from 4)::int), 0) into v_max
    from projects
   where id ~ '^PRJ\d+$';
  v_new_id := 'PRJ' || lpad((v_max + 1)::text, 3, '0');

  -- Map customer category → project type (Residential vs Commercial)
  v_type := case when v_inq.category = 'Residential' then 'Residential' else 'Commercial' end;

  -- Payment allocation
  v_design_fee  := round(p_budget * 0.07);
  v_reno_total  := greatest(0, p_budget - p_proposal_deposit - v_design_fee);
  v_reno_dep    := round(v_reno_total * 0.5);
  v_progressive := round(v_reno_total * 0.3);
  v_final       := v_reno_total - v_reno_dep - v_progressive;

  -- 1. Insert new project
  insert into projects (
    id, name, client_name, client_contact, client_email,
    project_type, property_type, location, size_sqft, budget,
    start_date, target_date, status, priority, progress,
    designer_id, pm_id, team,
    current_stage_id, lifecycle_started_at,
    photo_count, task_count, tasks_completed,
    areas, description
  )
  values (
    v_new_id, p_project_name, v_inq.client_name, v_inq.contact, v_inq.email,
    v_type, v_inq.property_type, v_inq.location, coalesce(v_inq.estimated_size, 1000), p_budget,
    p_start_date, p_target_date, 'assigned', p_priority, 0,
    null, null, coalesce(array[p_designer_avatar, p_pm_avatar], '{}'),
    'design-prop-signed', v_today,
    0, 0, 0,
    coalesce(p_areas, '{}'), format('Converted from inquiry %s on %s.', v_inq.id, to_char(v_today, 'DD/MM/YYYY'))
  );

  -- Designer/PM are stored by name in mock; resolve staff_id by avatar code for the FK
  update projects
     set designer_id = (select id from staff where avatar_code = p_designer_avatar limit 1),
         pm_id       = (select id from staff where avatar_code = p_pm_avatar       limit 1)
   where id = v_new_id;

  -- 2. Insert payment records (5 gates; gate 1 collected today)
  insert into payment_records (project_id, gate, label, amount, status, collected_date, reference) values
    (v_new_id, 1, 'Proposal Deposit',          p_proposal_deposit, 'completed', v_today, 'PD-' || to_char(v_today, 'YYYY') || '-NEW');
  insert into payment_records (project_id, gate, label, amount, status) values
    (v_new_id, 2, 'Design Contract Fee',       v_design_fee, 'pending'),
    (v_new_id, 3, 'Renovation Deposit (50%)',  v_reno_dep,    'pending'),
    (v_new_id, 4, 'Progressive Payment',       v_progressive, 'pending'),
    (v_new_id, 5, 'Final Payment',             v_final,       'pending');

  -- Notes on gate 4
  update payment_records
     set notes = 'To be split into instalments'
   where project_id = v_new_id and gate = 4;

  -- 3. Insert signature records (all 6 pending)
  insert into signature_records (project_id, signature_key, label, group_name, status) values
    (v_new_id, 'design-contract',     'Design Contract',            'contract', 'pending'),
    (v_new_id, 'revised-3d',          'Revised 3D Drawing',         'drawing',  'pending'),
    (v_new_id, 'renovation-contract', 'Renovation Contract',        'contract', 'pending'),
    (v_new_id, 'material-selection',  'Material Selection',         'drawing',  'pending'),
    (v_new_id, '2d-shopping',         '2D Drawing / Shopping List', 'drawing',  'pending'),
    (v_new_id, 'handover',            'Handover Acceptance',        'contract', 'pending');

  -- 4. Flip the inquiry to awarded + append contact log entry
  v_log_entry := jsonb_build_object(
    'date', to_char(v_today, 'DD/MM/YYYY'),
    'type', 'meet',
    'note', format('Design proposal signed · converted to project %s (RM %s)', v_new_id, to_char(p_budget, 'FM999G999G999')),
    'by', coalesce(p_assigned_to_avatar, v_inq.assigned_to_id, 'GT')
  );

  update inquiries
     set stage              = 'awarded',
         awarded_project_id = v_new_id,
         awarded_date       = v_today,
         last_updated       = v_today,
         contact_log        = contact_log || jsonb_build_array(v_log_entry)
   where id = p_inquiry_id;

  return v_new_id;
end;
$_$;
