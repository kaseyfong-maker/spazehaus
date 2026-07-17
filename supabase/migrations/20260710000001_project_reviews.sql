-- ───────────────────────────────────────────────────────────────────────────
-- Project reviews — client / post-completion satisfaction feedback.
--
-- Backs the Project Detail "Review" action (was a "coming soon" toast). A review
-- is a 1–5 star rating + optional comment + who it's from. Read = any staff;
-- write = OPS tier (same gate as the rest of the project). Apply via SQL Editor
-- or `supabase db push`.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.project_reviews (
  id            text primary key,
  project_id    text not null references public.projects(id) on delete cascade,
  rating        smallint not null,
  reviewer_name text,
  comment       text,
  created_by    text references public.staff(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint project_reviews_rating_check check (rating between 1 and 5)
);

alter table public.project_reviews owner to postgres;

create index if not exists idx_project_reviews_project on public.project_reviews (project_id);

alter table public.project_reviews enable row level security;

create policy "project_reviews_read_all"
  on public.project_reviews for select
  to authenticated
  using (true);

create policy "project_reviews_write_ops"
  on public.project_reviews
  to authenticated
  using (public.is_ops_tier())
  with check (public.is_ops_tier());

grant all on table public.project_reviews to anon;
grant all on table public.project_reviews to authenticated;
grant all on table public.project_reviews to service_role;
