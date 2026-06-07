-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — Magic-link gate: only known staff emails may request a link
--
-- The Login page runs UNAUTHENTICATED (the `anon` PostgREST role). Row-level
-- security hides the `staff` table from `anon`, so the page can't check
-- membership directly. This SECURITY DEFINER function exposes a single yes/no
-- — does a staff row exist for this email? — without returning any staff data.
-- Granted to `anon` so the pre-login check works before any session exists.
--
-- Trade-off: this is intentionally an email-existence oracle (a probe can learn
-- whether an address belongs to staff). Acceptable for an internal tool, and
-- the upside is that an unknown email never triggers a Supabase auth.users
-- signup — keeping orphan auth accounts (and the half-linked-staff edge case)
-- from ever being created.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.staff_email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.staff
    where lower(email) = lower(trim(p_email))
  );
$$;

comment on function public.staff_email_exists(text) is
  'Pre-login gate: true when a staff row exists for the given email. Callable by anon so the Login page can block magic-link requests from unknown emails.';

grant execute on function public.staff_email_exists(text) to anon;
grant execute on function public.staff_email_exists(text) to authenticated;
