-- ============================================================================
-- SPAZEHAUS — Phase 0C Convert-Inquiry RPC
-- Generated: 2026-05-12
--
-- Single transactional Postgres function that converts a pipeline inquiry
-- into a real project:
--   1. INSERT a new row in `projects` (status 'assigned', stage 4 'design-prop-signed')
--   2. INSERT 5 rows in `payment_records` (gate ① collected today; ②③④⑤ pending)
--   3. INSERT 6 rows in `signature_records` (all pending)
--   4. UPDATE the inquiry: stage='awarded', awarded_project_id, contact_log entry
--
-- Either everything succeeds or nothing does (Postgres function = transaction).
--
-- Callable via `supabase.rpc('convert_inquiry_to_project', { … })` from the client.
-- ============================================================================

create or replace function public.convert_inquiry_to_project(
  p_inquiry_id        text,
  p_project_name      text,
  p_designer_name     text,
  p_pm_name           text,
  p_designer_avatar   text,
  p_pm_avatar         text,
  p_start_date        date,
  p_target_date       date,
  p_budget            numeric,
  p_priority          text,
  p_areas             text[],
  p_proposal_deposit  numeric,
  p_assigned_to_avatar text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
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
  -- Load + validate the inquiry
  select * into v_inq from inquiries where id = p_inquiry_id;
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
$$;

-- Allow authenticated users to call this RPC
grant execute on function public.convert_inquiry_to_project(text,text,text,text,text,text,date,date,numeric,text,text[],numeric,text) to authenticated;
