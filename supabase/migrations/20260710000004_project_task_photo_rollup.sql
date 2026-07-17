-- ───────────────────────────────────────────────────────────────────────────
-- Keep the denormalized rollup columns on `projects` in sync with reality.
--
-- BUG: project cards (Dashboard "Recent Projects", Projects list) read the
-- stored columns `projects.task_count` / `tasks_completed` / `photo_count`.
-- When tasks & site photos became real tables (`project_tasks`, `site_photos`)
-- nothing kept those columns updated, so cards showed 0/0 tasks while the
-- Project Detail page — which counts the real tables — showed the true numbers.
--
-- FIX: recompute the rollups whenever project_tasks / site_photos change, and
-- backfill existing rows once. `progress` is derived from task completion when
-- a project has tasks; projects with no tasks keep their existing progress
-- (e.g. a "Done" project with no granular tasks logged stays at its set value).
-- Apply via Supabase SQL editor or `supabase db push`.
-- ───────────────────────────────────────────────────────────────────────────

-- ── Task rollup: task_count, tasks_completed, progress ──────────────────────
create or replace function public.recalc_project_task_rollup(p_project_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_done  int;
begin
  select count(*), count(*) filter (where status = 'completed')
    into v_total, v_done
    from public.project_tasks
   where project_id = p_project_id;

  update public.projects
     set task_count      = v_total,
         tasks_completed = v_done,
         progress        = case when v_total > 0
                                then round(v_done::numeric * 100 / v_total)::int
                                else progress end
   where id = p_project_id;
end;
$$;

create or replace function public.trg_project_tasks_rollup()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_project_task_rollup(old.project_id);
    return old;
  end if;
  perform public.recalc_project_task_rollup(new.project_id);
  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    perform public.recalc_project_task_rollup(old.project_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_tasks_rollup on public.project_tasks;
create trigger trg_project_tasks_rollup
  after insert or update or delete on public.project_tasks
  for each row execute function public.trg_project_tasks_rollup();

-- ── Photo rollup: photo_count ───────────────────────────────────────────────
create or replace function public.recalc_project_photo_rollup(p_project_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.projects
     set photo_count = (select count(*) from public.site_photos where project_id = p_project_id)
   where id = p_project_id;
end;
$$;

create or replace function public.trg_site_photos_rollup()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_project_photo_rollup(old.project_id);
    return old;
  end if;
  perform public.recalc_project_photo_rollup(new.project_id);
  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    perform public.recalc_project_photo_rollup(old.project_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_site_photos_rollup on public.site_photos;
create trigger trg_site_photos_rollup
  after insert or update or delete on public.site_photos
  for each row execute function public.trg_site_photos_rollup();

-- ── One-time backfill of every existing project ─────────────────────────────
update public.projects p set
  task_count      = coalesce(t.total, 0),
  tasks_completed = coalesce(t.done, 0),
  progress        = case when coalesce(t.total, 0) > 0
                         then round(t.done::numeric * 100 / t.total)::int
                         else p.progress end
from (
  select id from public.projects
) ids
left join (
  select project_id, count(*) total, count(*) filter (where status = 'completed') done
    from public.project_tasks group by project_id
) t on t.project_id = ids.id
where p.id = ids.id;

update public.projects p set
  photo_count = coalesce(ph.cnt, 0)
from (
  select id from public.projects
) ids
left join (
  select project_id, count(*) cnt from public.site_photos group by project_id
) ph on ph.project_id = ids.id
where p.id = ids.id;
