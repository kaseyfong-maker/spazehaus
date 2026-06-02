-- ─────────────────────────────────────────────────────────────────────────────
-- Tier 1.5 — Column-level guard on staff self-edits
-- ─────────────────────────────────────────────────────────────────────────────
-- Context: the Phase 0D RLS policy `staff_update_self` lets a staff member
-- update their OWN row so they can maintain phone / WhatsApp opt-in from the
-- Profile page. But Postgres RLS is ROW-level, not COLUMN-level — so on its own
-- that policy would also let a non-admin self-promote (set their own `role` /
-- `status`) or change their `email` (which would break magic-link auth linkage)
-- via a crafted API call, bypassing the UI's field restrictions.
--
-- This BEFORE UPDATE trigger closes that hole: non-admins may not change the
-- privileged columns on any staff row (including their own). Admins are exempt,
-- and so is the system/service-role context (no JWT) — critically, the
-- `link_staff_to_auth_user` auth trigger runs with auth.uid() = null and must be
-- allowed to set `auth_user_id` during sign-in linking.

create or replace function public.guard_staff_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- System / service-role context (no end-user JWT). This covers the
  -- auth-linking trigger that stamps auth_user_id on first sign-in, plus any
  -- admin/maintenance writes via the service role. Allow unconditionally.
  if auth.uid() is null then
    return new;
  end if;

  -- Admin tier may change anything.
  if public.is_admin_tier() then
    return new;
  end if;

  -- Everyone else (a staff member self-editing their own row) may not touch
  -- the privileged columns. `is distinct from` is null-safe.
  if new.role is distinct from old.role then
    raise exception 'Only an admin can change a staff member''s role';
  end if;
  if new.status is distinct from old.status then
    raise exception 'Only an admin can change a staff member''s status';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Only an admin can change a staff member''s email (it is the magic-link key)';
  end if;
  if new.auth_user_id is distinct from old.auth_user_id then
    raise exception 'auth_user_id is managed by the system';
  end if;
  if new.id is distinct from old.id then
    raise exception 'staff id is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_staff_sensitive on public.staff;
create trigger trg_guard_staff_sensitive
  before update on public.staff
  for each row
  execute function public.guard_staff_sensitive_columns();
