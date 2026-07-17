-- ───────────────────────────────────────────────────────────────────────────
-- Per-staff in-app notification preferences.
--
-- Backs the Profile → Notifications settings screen. One row per staff member,
-- created lazily on first save (the UI upserts). A missing row means "all on"
-- (the client falls back to defaults), so we don't need to seed every staff.
--
-- master switch `notifications_enabled` gates the per-category toggles. Each
-- staff member reads/writes ONLY their own row (staff_id = current_staff_id()).
-- Apply via Supabase SQL Editor or `supabase db push`.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.notification_preferences (
  staff_id              text primary key references public.staff(id) on delete cascade,
  notifications_enabled boolean not null default true,
  reminders             boolean not null default true,
  announcements         boolean not null default true,
  payment_alerts        boolean not null default true,
  task_updates          boolean not null default true,
  updated_at            timestamptz not null default now()
);

alter table public.notification_preferences owner to postgres;

-- keep updated_at fresh on edits
create or replace function public.touch_notification_preferences_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.touch_notification_preferences_updated_at();

-- ── RLS — each staff manages only their own row ─────────────────────────────
alter table public.notification_preferences enable row level security;

create policy "notif_prefs_read_own"
  on public.notification_preferences for select
  to authenticated
  using (staff_id = public.current_staff_id());

create policy "notif_prefs_insert_own"
  on public.notification_preferences for insert
  to authenticated
  with check (staff_id = public.current_staff_id());

create policy "notif_prefs_update_own"
  on public.notification_preferences for update
  to authenticated
  using (staff_id = public.current_staff_id())
  with check (staff_id = public.current_staff_id());

-- ── Grants ─────────────────────────────────────────────────────────────────
grant all on table public.notification_preferences to anon;
grant all on table public.notification_preferences to authenticated;
grant all on table public.notification_preferences to service_role;
