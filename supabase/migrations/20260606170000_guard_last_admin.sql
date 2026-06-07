-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — Don't let the last active admin be removed/demoted
--
-- "Remove staff" is a soft delete (status → 'inactive'). If the person being
-- removed (or demoted out of the admin tier) is the ONLY remaining active admin,
-- the org would be left with no one who can manage staff/payments — an
-- unrecoverable lockout from inside the app. Block that at the DB so neither the
-- UI nor a direct API call can do it.
--
-- Fires only on the specific transition (active admin → inactive or non-admin).
-- Service-role / SQL-console writes (auth.uid() is null) bypass, so recovery is
-- still possible out-of-band.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.guard_last_admin() returns trigger
    language plpgsql security definer set search_path to 'public'
    as $$
declare
  v_was_active_admin boolean;
  v_still_active_admin boolean;
  v_other_admins int;
begin
  if auth.uid() is null then
    return new;  -- system / service-role maintenance
  end if;

  v_was_active_admin :=
    old.status = 'active' and old.role in ('principal','admin','admin_exec');
  v_still_active_admin :=
    new.status = 'active' and new.role in ('principal','admin','admin_exec');

  -- Only care when an active admin is being deactivated or demoted out of tier.
  if v_was_active_admin and not v_still_active_admin then
    select count(*) into v_other_admins
      from public.staff
     where id <> old.id
       and status = 'active'
       and role in ('principal','admin','admin_exec');
    if v_other_admins = 0 then
      raise exception 'Cannot remove or demote the last active admin — promote another admin first.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_last_admin on public.staff;
create trigger trg_guard_last_admin
  before update on public.staff
  for each row execute function public.guard_last_admin();
