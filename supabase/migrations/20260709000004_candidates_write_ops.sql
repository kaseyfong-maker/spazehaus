-- ───────────────────────────────────────────────────────────────────────────
-- Let the OPS tier manage recruitment (candidates), not just the admin tier.
--
-- WHY: the candidates table was writable only by is_admin_tier()
-- (principal / admin / admin_exec). But PMs run the recruitment pipeline in
-- practice — so as a PM, "Add Candidate" failed the RLS check, and "Advance"
-- silently updated 0 rows (a blocked UPDATE returns no error), making the
-- feature look broken.
--
-- Fix: replace the admin-only write policy with an ops-tier one. is_ops_tier()
-- = principal / admin / admin_exec / pm / site_supervisor — the same gate used
-- for editing projects, payments and signatures. Reads stay open to all staff.
-- ───────────────────────────────────────────────────────────────────────────

drop policy if exists "candidates_write_admin" on public.candidates;

create policy "candidates_write_ops"
  on public.candidates
  to authenticated
  using (public.is_ops_tier())
  with check (public.is_ops_tier());
