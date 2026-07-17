-- ───────────────────────────────────────────────────────────────────────────
-- Client-submitted reviews from the public portal (/portal/:token).
--
-- Reviews should come FROM the client, not be typed by staff. The public portal
-- is unauthenticated (anon role), so this SECURITY DEFINER RPC lets a visitor
-- holding a valid project token submit ONE review — validated by the token, the
-- same way get_client_portal_data works. Staff view the result read-only.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.submit_client_review(
  p_token         uuid,
  p_rating        integer,
  p_comment       text default null,
  p_reviewer_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id   text;
  v_client_name  text;
begin
  select id, client_name into v_project_id, v_client_name
  from public.projects
  where client_access_token = p_token;

  if v_project_id is null then
    raise exception 'Invalid or expired review link';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  insert into public.project_reviews (id, project_id, rating, reviewer_name, comment, created_by)
  values (
    'REV-' || replace(gen_random_uuid()::text, '-', ''),
    v_project_id,
    p_rating,
    coalesce(nullif(btrim(p_reviewer_name), ''), v_client_name),
    nullif(btrim(p_comment), ''),
    null
  );
end;
$$;

alter function public.submit_client_review(uuid, integer, text, text) owner to postgres;
grant execute on function public.submit_client_review(uuid, integer, text, text) to anon, authenticated;
