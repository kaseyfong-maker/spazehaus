-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — Prevent hard-deleting staff (force soft-delete)
--
-- There's no delete-staff UI today, but `staff_write_admin` covers DELETE, so an
-- admin could hard-delete a staff row via the API. That would CASCADE-destroy
-- their kpi_records / leave_requests / sales_targets (FK ON DELETE CASCADE) and
-- leave dangling avatar codes in projects.team[]. Block it before any delete UI
-- exists — offboarding should set status = 'inactive' (which already revokes all
-- access via the tier helpers) and keeps history intact.
--
-- Only end-user (JWT) deletes are blocked; service-role / SQL-console
-- maintenance (auth.uid() is null) can still delete deliberately if ever needed.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.block_staff_hard_delete() returns trigger
    language plpgsql security definer set search_path to 'public'
    as $$
begin
  if auth.uid() is not null then
    raise exception
      'Staff cannot be deleted. Set status = ''inactive'' instead — it revokes all access and preserves KPI/leave history.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_block_staff_hard_delete on public.staff;
create trigger trg_block_staff_hard_delete
  before delete on public.staff
  for each row execute function public.block_staff_hard_delete();
