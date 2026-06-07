-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — Fix convert_inquiry_to_project: cast priority text → enum
--
-- BUG (pre-existing, caught by the Cypress convert test): `p_priority` is a
-- `text` parameter inserted into `projects.priority`, which is the enum
-- `project_priority`. Postgres implicitly coerces string *literals* to an enum
-- but NOT a text *variable*, so every real conversion failed with
-- "42804: column 'priority' is of type project_priority but expression is of
-- type text". Add an explicit `::public.project_priority` cast. (status uses the
-- literal 'assigned', so it was unaffected.)
--
-- Function body is otherwise identical to 20260606130000 (authz gate + row lock).
-- ───────────────────────────────────────────────────────────────────────────

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
  -- Authorization: only OPS tier (pm/site_supervisor) and admins may convert.
  if not public.is_ops_tier() then
    raise exception 'Not authorized to convert inquiries' using errcode = '42501';
  end if;

  -- Load + validate the inquiry (FOR UPDATE serializes concurrent conversions).
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

  v_type := case when v_inq.category = 'Residential' then 'Residential' else 'Commercial' end;

  v_design_fee  := round(p_budget * 0.07);
  v_reno_total  := greatest(0, p_budget - p_proposal_deposit - v_design_fee);
  v_reno_dep    := round(v_reno_total * 0.5);
  v_progressive := round(v_reno_total * 0.3);
  v_final       := v_reno_total - v_reno_dep - v_progressive;

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
    p_start_date, p_target_date, 'assigned', p_priority::public.project_priority, 0,
    null, null, coalesce(array[p_designer_avatar, p_pm_avatar], '{}'),
    'design-prop-signed', v_today,
    0, 0, 0,
    coalesce(p_areas, '{}'), format('Converted from inquiry %s on %s.', v_inq.id, to_char(v_today, 'DD/MM/YYYY'))
  );

  update projects
     set designer_id = (select id from staff where avatar_code = p_designer_avatar limit 1),
         pm_id       = (select id from staff where avatar_code = p_pm_avatar       limit 1)
   where id = v_new_id;

  insert into payment_records (project_id, gate, label, amount, status, collected_date, reference) values
    (v_new_id, 1, 'Proposal Deposit',          p_proposal_deposit, 'completed', v_today, 'PD-' || to_char(v_today, 'YYYY') || '-NEW');
  insert into payment_records (project_id, gate, label, amount, status) values
    (v_new_id, 2, 'Design Contract Fee',       v_design_fee, 'pending'),
    (v_new_id, 3, 'Renovation Deposit (50%)',  v_reno_dep,    'pending'),
    (v_new_id, 4, 'Progressive Payment',       v_progressive, 'pending'),
    (v_new_id, 5, 'Final Payment',             v_final,       'pending');

  update payment_records
     set notes = 'To be split into instalments'
   where project_id = v_new_id and gate = 4;

  insert into signature_records (project_id, signature_key, label, group_name, status) values
    (v_new_id, 'design-contract',     'Design Contract',            'contract', 'pending'),
    (v_new_id, 'revised-3d',          'Revised 3D Drawing',         'drawing',  'pending'),
    (v_new_id, 'renovation-contract', 'Renovation Contract',        'contract', 'pending'),
    (v_new_id, 'material-selection',  'Material Selection',         'drawing',  'pending'),
    (v_new_id, '2d-shopping',         '2D Drawing / Shopping List', 'drawing',  'pending'),
    (v_new_id, 'handover',            'Handover Acceptance',        'contract', 'pending');

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
