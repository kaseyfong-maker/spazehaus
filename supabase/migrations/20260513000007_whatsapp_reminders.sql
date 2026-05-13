-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — WhatsApp reminders schema
--
-- Adds the persistence layer for the daily-site-photo WhatsApp reminder
-- (the Edge Function lives in supabase/functions/send-daily-reminders/).
--
-- This migration is SCHEMA-ONLY. It does NOT:
--   - schedule the function (do that via Supabase Dashboard → Database →
--     Cron Jobs once the function is deployed)
--   - configure a provider (set WHATSAPP_PROVIDER + provider-specific env
--     vars on the Edge Function; defaults to 'stub' = log-only)
--   - populate staff.phone (do that via a one-time UPDATE per staff row;
--     E.164 format e.g. '+60123456789')
--
-- ───────────────────────────────────────────────────────────────────────────

-- ── staff.whatsapp_opt_in ────────────────────────────────────────────────
-- True by default — assume staff want their automated reminders. Flip to
-- false per staff to suppress reminders without removing their phone number.
alter table public.staff
  add column if not exists whatsapp_opt_in boolean not null default true;

comment on column public.staff.whatsapp_opt_in is
  'When false, send-daily-reminders skips this staff member even if their phone is set.';

-- ── whatsapp_log ─────────────────────────────────────────────────────────
-- Append-only audit log of every reminder attempt. The Edge Function uses
-- this for dedup ("did we already ping this staff for this project today?")
-- AND for after-the-fact diagnostics.
create table if not exists public.whatsapp_log (
  id              bigserial primary key,
  staff_id        text not null references public.staff(id) on delete cascade,
  project_id      text     references public.projects(id) on delete cascade,
  reminder_type   text not null,
  -- The phone number we attempted to send to (historical — staff.phone may
  -- change later but we want to know what we actually used).
  phone           text not null,
  -- 'stub' | 'meta' | 'twilio' — which provider handled this attempt.
  provider        text not null,
  -- The provider's response identifier (Meta message id, Twilio SID, etc.).
  -- Null when status is 'failed' or 'skipped'.
  provider_message_id text,
  template_name   text,
  template_variables jsonb,
  status          text not null check (status in ('sent', 'failed', 'skipped')),
  error_message   text,
  sent_at         timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

comment on table public.whatsapp_log is
  'Audit log of every WhatsApp reminder attempt. Used for dedup + diagnostics.';

-- Dedup index — the Edge Function queries this to skip staff/project pairs
-- already pinged today (regardless of outcome — even failed attempts count
-- so we don't retry indefinitely within a single day).
create index if not exists idx_whatsapp_log_dedup
  on public.whatsapp_log (staff_id, project_id, reminder_type, (sent_at::date));

create index if not exists idx_whatsapp_log_status
  on public.whatsapp_log (status, sent_at desc);

-- ── RLS policies ─────────────────────────────────────────────────────────
alter table public.whatsapp_log enable row level security;

-- ADMIN tier (principal / admin / admin_exec) — full read + insert for
-- viewing diagnostics in the UI. Edge Function uses service_role which
-- bypasses RLS anyway, so this policy is purely for client reads.
drop policy if exists "whatsapp_log_admin_read" on public.whatsapp_log;
create policy "whatsapp_log_admin_read"
  on public.whatsapp_log
  for select
  to authenticated
  using ( public.is_admin_tier() );

-- Staff can read their own reminders (for transparency — "why did I get
-- pinged at 5pm yesterday").
drop policy if exists "whatsapp_log_own_read" on public.whatsapp_log;
create policy "whatsapp_log_own_read"
  on public.whatsapp_log
  for select
  to authenticated
  using ( staff_id = public.current_staff_id() );

-- No client-side writes — only service_role (= Edge Function) inserts here.
-- (No INSERT/UPDATE/DELETE policies = nothing through anon/authenticated.)

-- ── Audit trigger ────────────────────────────────────────────────────────
-- Don't audit-log this table — it would create cascading rows for every
-- reminder attempt. (The table IS itself an audit log.)
