-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — Correct the DEFINER-RPC grants (follow-up to 20260606130000)
--
-- Postgres grants EXECUTE to PUBLIC by default, and anon/authenticated inherit
-- it — so "REVOKE ... FROM anon" alone is a no-op (the prior migration's revoke
-- didn't actually block anon). The real lever is REVOKE ... FROM PUBLIC.
--
-- Constraint: tr_payment_status_advance / tr_signature_status_advance are NOT
-- SECURITY DEFINER — they run as the invoking (authenticated) user and call
-- maybe_advance_project_stage. So authenticated MUST keep EXECUTE or completing
-- a payment/signature would fail. We therefore:
--   • revoke from PUBLIC + anon  → unauthenticated callers blocked
--   • (re)grant to authenticated → triggers keep working; a direct authenticated
--     call is harmless (the function only advances when gates are truly met).
-- ───────────────────────────────────────────────────────────────────────────

revoke execute on function public.maybe_advance_project_stage(text) from public;
revoke execute on function public.maybe_advance_project_stage(text) from anon;
grant  execute on function public.maybe_advance_project_stage(text) to authenticated;

-- convert_inquiry_to_project already self-gates with is_ops_tier(), but drop the
-- PUBLIC/anon EXECUTE too so it isn't even reachable without a session. The
-- explicit authenticated grant from the base schema remains (revoking PUBLIC
-- does not remove an explicit role grant).
revoke execute on function public.convert_inquiry_to_project(
  text, text, text, text, text, text, date, date, numeric, text, text[], numeric, text
) from public;
revoke execute on function public.convert_inquiry_to_project(
  text, text, text, text, text, text, date, date, numeric, text, text[], numeric, text
) from anon;
