-- ───────────────────────────────────────────────────────────────────────────
-- Real per-project tasks.
--
-- The Project Detail "Tasks" tab was a hardcoded mock array, so task counts on
-- the page never reflected reality. This table makes tasks real: add / edit /
-- remove / mark-done, and the Quick Stats derive their "X/Y done" from here.
--
-- assignee_id / created_by reference staff by ID (not avatar code — codes can
-- collide). Read = any authenticated staff; write = OPS tier (same gate as
-- editing the project itself). Apply via Supabase SQL Editor or `supabase db push`.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.project_tasks (
  id          text primary key,
  project_id  text not null references public.projects(id) on delete cascade,
  title       text not null,
  area        text,
  status      text not null default 'pending',
  assignee_id text references public.staff(id) on delete set null,
  due_date    date,
  sort_order  integer not null default 0,
  created_by  text references public.staff(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint project_tasks_status_check check (status in ('pending','in-progress','completed'))
);

alter table public.project_tasks owner to postgres;

create index if not exists idx_project_tasks_project on public.project_tasks (project_id);
create index if not exists idx_project_tasks_assignee on public.project_tasks (assignee_id);

-- keep updated_at fresh on edits
create or replace function public.touch_project_tasks_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_project_tasks_updated_at on public.project_tasks;
create trigger trg_project_tasks_updated_at
  before update on public.project_tasks
  for each row execute function public.touch_project_tasks_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.project_tasks enable row level security;

create policy "project_tasks_read_all"
  on public.project_tasks for select
  to authenticated
  using (true);

create policy "project_tasks_write_ops"
  on public.project_tasks
  to authenticated
  using (public.is_ops_tier())
  with check (public.is_ops_tier());

-- ── Grants ─────────────────────────────────────────────────────────────────
grant all on table public.project_tasks to anon;
grant all on table public.project_tasks to authenticated;
grant all on table public.project_tasks to service_role;
