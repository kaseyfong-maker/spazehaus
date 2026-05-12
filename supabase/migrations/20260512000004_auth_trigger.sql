-- ============================================================================
-- SPAZEHAUS — Phase 0B Auth Trigger
-- Generated: 2026-05-12
--
-- When a new auth.users row is created (first magic-link sign-in),
-- automatically link it to the matching staff row by email.
--
-- This is what makes "sign in with magic link" actually map to a real
-- staff record without any client-side glue.
-- ============================================================================

create or replace function public.link_staff_to_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.staff
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null;
  return new;
end;
$$;

drop trigger if exists trg_link_staff_on_auth_insert on auth.users;
create trigger trg_link_staff_on_auth_insert
  after insert on auth.users
  for each row execute function public.link_staff_to_auth_user();

-- Backfill: in case any auth.users rows already exist (e.g. from a previous
-- test), link them now.
update public.staff s
   set auth_user_id = u.id
  from auth.users u
 where lower(s.email) = lower(u.email)
   and s.auth_user_id is null;
