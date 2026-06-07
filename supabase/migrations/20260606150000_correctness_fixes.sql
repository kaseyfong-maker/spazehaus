-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — Correctness fixes (audit follow-up)
--
--   1. maybe_advance_project_stage advanced by `order_index + 1`. If any gap
--      exists in lifecycle_stages.order_index (e.g. a stage was removed), the
--      lookup returns NULL at the gap and the project silently gets stuck
--      mid-lifecycle even though downstream checkpoints are paid/signed. Select
--      the next stage by `order_index > current ORDER BY order_index LIMIT 1`.
--
--   2. site_photos INSERT was WITH CHECK (true): any authenticated user could
--      insert a photo row for ANY project with an arbitrary storage_path /
--      uploaded_by_id (attribution forgery / point a portal token at a bogus
--      path). Site photos are a site-supervisor SOP, so require OPS tier OR
--      that the row is attributed to the inserter.
-- ───────────────────────────────────────────────────────────────────────────


-- ── 1. Stage advance: tolerate gaps in order_index ──────────────────────────
create or replace function public.maybe_advance_project_stage("p_project_id" text) returns text
    language plpgsql security definer set search_path to 'public'
    as $$
declare
  v_stage record;
  v_satisfied boolean;
  v_next_id text;
  v_iterations int := 0;
  v_max_iter int := 35;          -- > 29 stages, with safety margin
begin
  loop
    v_iterations := v_iterations + 1;
    if v_iterations > v_max_iter then
      exit;                       -- safety belt — should never trip
    end if;

    select s.*
      into v_stage
    from projects p
    join lifecycle_stages s on s.id = p.current_stage_id
    where p.id = p_project_id;

    if not found then
      return null;                -- project has no current_stage_id set
    end if;

    v_satisfied := case
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

      when v_stage.payment_gate is not null then
        exists (
          select 1 from payment_records
          where project_id = p_project_id
            and gate = v_stage.payment_gate
            and status = 'completed'
        )

      when v_stage.signature_key is not null then
        exists (
          select 1 from signature_records
          where project_id = p_project_id
            and signature_key = v_stage.signature_key
            and status = 'completed'
        )

      else true
    end;

    exit when not v_satisfied;

    -- Next stage by order — `>` not `= +1`, so a gap in order_index can't strand
    -- a project mid-lifecycle.
    select id
      into v_next_id
    from lifecycle_stages
    where order_index > v_stage.order_index
    order by order_index
    limit 1;

    exit when v_next_id is null;

    update projects
       set current_stage_id = v_next_id
     where id = p_project_id;
  end loop;

  return v_stage.id;
end;
$$;


-- ── 2. Tighten site_photos INSERT ───────────────────────────────────────────
drop policy if exists "site_photos_insert_any" on public.site_photos;
create policy "site_photos_insert_ops_or_own"
  on public.site_photos
  for insert
  to authenticated
  with check (
    public.is_ops_tier()
    or uploaded_by_id = public.current_staff_id()
  );
