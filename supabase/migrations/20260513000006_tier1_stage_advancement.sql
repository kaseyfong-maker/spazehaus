-- ============================================================================
-- SPAZEHAUS — Tier 1 · Stage Advancement
-- Generated: 2026-05-13
--
-- Closes the workflow loop: when a payment_records row flips to
-- status='completed' (or a signature_records row flips to status='completed'),
-- the project's `current_stage_id` auto-advances past every stage whose
-- requirements are now satisfied.
--
--   Example — at stage 5 (proposal-deposit), mark ① collected:
--     5 (proposal-deposit, paymentGate 1)     → met → advance
--     6 (design-proposal, milestone)          → milestone-only auto-passes
--     7 (design-quotation, milestone)         → milestone-only auto-passes
--     8 (proposal-meeting, milestone)         → milestone-only auto-passes
--     9 (design-contract, paymentGate 2 + sig) → NOT met → stop
--   → current_stage_id becomes 'design-contract'
--
-- Special cases:
--   • Stage 9 (design-contract) requires BOTH paymentGate 2 collected
--     AND the design-contract signature signed.
--   • Stage 22 (progressive-pay) is considered satisfied only when EVERY
--     instalment row for that project (gate=4) is status='completed'.
--   • Retroactively completing a checkpoint BEHIND the current stage
--     never regresses — only advancement is allowed.
--
-- Implementation:
--   • New `lifecycle_stages` table — canonical 29-row source of truth that
--     mirrors LIFECYCLE_STAGES in client/src/lib/lifecycleData.ts.
--   • SECURITY DEFINER function `maybe_advance_project_stage(project_id)`
--     iteratively advances while the current stage's requirements hold.
--   • Triggers on `payment_records` and `signature_records` call the function
--     after any status transition into 'completed'.
-- ============================================================================

-- ─── LIFECYCLE STAGES TABLE ─────────────────────────────────────────────────

create table lifecycle_stages (
  id              text primary key,
  order_index     int  not null unique check (order_index between 1 and 99),
  label           text not null,
  phase           text not null check (phase in ('Inquiry','Design','Pre-Build','Build','Closeout')),
  stage_type      text not null check (stage_type in ('milestone','payment','contract-sign','drawing-sign','loop')),
  payment_gate    smallint check (payment_gate between 1 and 5),
  signature_key   text
);

-- Mirrors LIFECYCLE_STAGES in client/src/lib/lifecycleData.ts — keep in lockstep.
insert into lifecycle_stages (id, order_index, label, phase, stage_type, payment_gate, signature_key) values
  ('new-inquiry',          1,  'New Inquiry',                       'Inquiry',  'milestone',     null, null),
  ('inquiry-form',         2,  'Fill In Inquiry Form',              'Inquiry',  'milestone',     null, null),
  ('showroom-meet',        3,  'Showroom Meet Up',                  'Inquiry',  'milestone',     null, null),
  ('design-prop-signed',   4,  'Design Proposal Signed',            'Design',   'milestone',     null, null),
  ('proposal-deposit',     5,  'Proposal Deposit Collected',        'Design',   'payment',       1,    null),
  ('design-proposal',      6,  'Design Proposal',                   'Design',   'milestone',     null, null),
  ('design-quotation',     7,  'Design Quotation',                  'Design',   'milestone',     null, null),
  ('proposal-meeting',     8,  'Proposal Meeting',                  'Design',   'milestone',     null, null),
  ('design-contract',      9,  'Design Contract Signed',            'Design',   'contract-sign', 2,    'design-contract'),
  ('3d-drawing',           10, '3D Drawing',                        'Pre-Build','milestone',     null, null),
  ('reno-quotation',       11, 'Renovation Quotation',              'Pre-Build','milestone',     null, null),
  ('3d-meeting',           12, '3D Meeting',                        'Pre-Build','milestone',     null, null),
  ('revised-3d',           13, 'Revised 3D Drawing',                'Pre-Build','drawing-sign',  null, 'revised-3d'),
  ('reno-contract',        14, 'Renovation Contract Signed',        'Pre-Build','contract-sign', null, 'renovation-contract'),
  ('reno-deposit',         15, 'Renovation Deposit Collected',      'Pre-Build','payment',       3,    null),
  ('work-schedule',        16, 'Work Schedule',                     'Pre-Build','milestone',     null, null),
  ('material-selection',   17, 'Material Selection',                'Pre-Build','drawing-sign',  null, 'material-selection'),
  ('2d-shopping',          18, '2D Drawing / Shopping List',        'Pre-Build','drawing-sign',  null, '2d-shopping'),
  ('kick-off',             19, 'Kick Off Renovation',               'Build',    'milestone',     null, null),
  ('contractor-brief',     20, 'Contractor Briefing',               'Build',    'milestone',     null, null),
  ('site-inspection',      21, 'Site Inspection',                   'Build',    'milestone',     null, null),
  ('progressive-pay',      22, 'Progressive Payment',               'Build',    'payment',       4,    null),
  ('site-report',          23, 'Site Report',                       'Build',    'milestone',     null, null),
  ('site-completed',       24, 'Site Completed / As-Built Drawing', 'Closeout', 'milestone',     null, null),
  ('furniture-delivery',   25, 'Furniture Delivery',                'Closeout', 'milestone',     null, null),
  ('handover',             26, 'Handover',                          'Closeout', 'contract-sign', null, 'handover'),
  ('final-payment',        27, 'Final Payment',                     'Closeout', 'payment',       5,    null),
  ('completion',           28, 'Project Completion',                'Closeout', 'milestone',     null, null),
  ('defect-period',        29, 'Defect Period',                     'Closeout', 'milestone',     null, null);

alter table lifecycle_stages enable row level security;

-- Read-only reference data — every authenticated user can read; nobody writes
-- through the API (only migrations).
create policy "lifecycle_stages_read_all"
  on lifecycle_stages for select to authenticated
  using (true);

-- Add a foreign key from projects.current_stage_id so we can join on label
-- (and reject typos). All existing rows are already valid stage_ids.
alter table projects
  add constraint projects_current_stage_id_fkey
  foreign key (current_stage_id) references lifecycle_stages(id)
  on update cascade
  on delete set null;

-- ─── ADVANCEMENT FUNCTION ───────────────────────────────────────────────────
--
-- Given a project_id, iteratively advance current_stage_id forward as long as
-- the current stage's requirements are satisfied. Stops at the first stage
-- with unmet requirements (or end of list).
--
-- Returns the new current_stage_id (or the existing one if no change).

create or replace function public.maybe_advance_project_stage(p_project_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage record;
  v_satisfied boolean;
  v_next_id text;
  v_iterations int := 0;
  v_max_iter int := 35;          -- > 29 stages, with safety margin
begin
  -- Loop forward until the current stage isn't satisfied (or we hit the end)
  loop
    v_iterations := v_iterations + 1;
    if v_iterations > v_max_iter then
      exit;                       -- safety belt — should never trip
    end if;

    -- Re-read the project's current stage every iteration
    select s.*
      into v_stage
    from projects p
    join lifecycle_stages s on s.id = p.current_stage_id
    where p.id = p_project_id;

    if not found then
      return null;                -- project has no current_stage_id set
    end if;

    -- Evaluate the current stage's requirements
    v_satisfied := case
      -- Design Contract Signed (stage 9) — needs BOTH signature + payment gate 2
      when v_stage.id = 'design-contract' then
        exists (
          select 1 from payment_records
          where project_id = p_project_id and gate = 2 and status = 'completed'
        )
        and exists (
          select 1 from signature_records
          where project_id = p_project_id
            and signature_key = 'design-contract'
            and status = 'completed'
        )

      -- Progressive Payment (stage 22, gate 4) — needs EVERY instalment completed
      when v_stage.id = 'progressive-pay' then
        not exists (
          select 1 from payment_records
          where project_id = p_project_id
            and gate = 4
            and status not in ('completed','skipped')
        )
        and exists (
          select 1 from payment_records
          where project_id = p_project_id and gate = 4
        )

      -- Other payment-gated stages — just need that gate completed
      when v_stage.payment_gate is not null then
        exists (
          select 1 from payment_records
          where project_id = p_project_id
            and gate = v_stage.payment_gate
            and status = 'completed'
        )

      -- Signature-only stages — that signature must be completed
      when v_stage.signature_key is not null then
        exists (
          select 1 from signature_records
          where project_id = p_project_id
            and signature_key = v_stage.signature_key
            and status = 'completed'
        )

      -- Milestone-only stages — auto-pass when we're transiting through them
      -- (the user has no UI to manually advance, so we treat them as "complete"
      --  once a downstream checkpoint has driven us into them)
      else true
    end;

    exit when not v_satisfied;

    -- Find the next stage by order; stop if we're already at the last one
    select id
      into v_next_id
    from lifecycle_stages
    where order_index = v_stage.order_index + 1;

    exit when v_next_id is null;

    update projects
       set current_stage_id = v_next_id
     where id = p_project_id;
  end loop;

  return v_stage.id;
end;
$$;

grant execute on function public.maybe_advance_project_stage(text) to authenticated;

-- ─── TRIGGERS ───────────────────────────────────────────────────────────────
-- Fire on any INSERT or status UPDATE that lands a payment / signature in
-- 'completed'. We only call the advancement function on actual transitions
-- (status IS DISTINCT FROM old.status) so idempotent updates are no-ops.

create or replace function public.tr_payment_status_advance()
returns trigger
language plpgsql
as $$
begin
  if NEW.status = 'completed'
     and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
    perform public.maybe_advance_project_stage(NEW.project_id);
  end if;
  return NEW;
end;
$$;

create trigger trg_payments_advance_stage
  after insert or update of status on payment_records
  for each row execute function public.tr_payment_status_advance();

create or replace function public.tr_signature_status_advance()
returns trigger
language plpgsql
as $$
begin
  if NEW.status = 'completed'
     and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
    perform public.maybe_advance_project_stage(NEW.project_id);
  end if;
  return NEW;
end;
$$;

create trigger trg_signatures_advance_stage
  after insert or update of status on signature_records
  for each row execute function public.tr_signature_status_advance();
