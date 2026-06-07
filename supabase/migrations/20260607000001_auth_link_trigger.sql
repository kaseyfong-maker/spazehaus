-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — Re-establish the auth-link trigger (durable, version-controlled)
--
-- The trigger that links a new auth.users row to its public.staff row by email
-- lives in the `auth` schema. `supabase db pull` only captures the `public`
-- schema, so it was dropped from the squashed schema dump and never recreated
-- on a fresh DB (e.g. local). Without it, staff.auth_user_id stays NULL, which
-- makes is_admin_tier()/is_ops_tier()/current_staff_id() resolve to nothing —
-- a logged-in admin isn't recognised as admin at the RLS layer.
--
-- This migration recreates the function + trigger and backfills any existing
-- auth users. Idempotent: safe to run where the trigger already exists (cloud).
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.link_staff_to_auth_user() returns trigger
    language plpgsql security definer set search_path to 'public'
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

-- Backfill: the trigger only fires on NEW inserts, so link any auth users that
-- already signed in before the trigger existed (e.g. the admin during testing).
update public.staff s
   set auth_user_id = u.id
  from auth.users u
 where lower(s.email) = lower(u.email)
   and s.auth_user_id is null;
