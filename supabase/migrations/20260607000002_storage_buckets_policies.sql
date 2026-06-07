-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — Storage buckets + policies (codify the dashboard-only setup)
--
-- The `site-photos` and `signature-docs` buckets and their storage.objects RLS
-- policies were created via the Supabase dashboard, so they live ONLY on the
-- cloud project — `db pull` didn't capture them and a fresh DB (local) had none.
-- This migration recreates them exactly (verified via `supabase db diff`) so
-- local == cloud and storage is version-controlled.
--
-- Idempotent: safe to run on cloud where these already exist.
-- ───────────────────────────────────────────────────────────────────────────

-- ── Buckets (both PRIVATE — access only via RLS + signed URLs) ───────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('signature-docs', 'signature-docs', false, 20971520, array['application/pdf','image/jpeg','image/png']),
  ('site-photos',    'site-photos',    false, null, null)
on conflict (id) do nothing;

-- Drop any local-testing stand-in policies (if the manual setup snippet was run).
drop policy if exists "local_read"  on storage.objects;
drop policy if exists "local_write" on storage.objects;
drop policy if exists "local_upd"   on storage.objects;

-- ── signature-docs: read = any authenticated; write = OPS tier ───────────────
drop policy if exists "signature_docs_read" on storage.objects;
create policy "signature_docs_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'signature-docs');

drop policy if exists "signature_docs_insert_ops" on storage.objects;
create policy "signature_docs_insert_ops" on storage.objects
  for insert to authenticated
  with check ((bucket_id = 'signature-docs') and public.is_ops_tier());

drop policy if exists "signature_docs_update_ops" on storage.objects;
create policy "signature_docs_update_ops" on storage.objects
  for update to authenticated
  using ((bucket_id = 'signature-docs') and public.is_ops_tier())
  with check ((bucket_id = 'signature-docs') and public.is_ops_tier());

drop policy if exists "signature_docs_delete_ops" on storage.objects;
create policy "signature_docs_delete_ops" on storage.objects
  for delete to authenticated
  using ((bucket_id = 'signature-docs') and public.is_ops_tier());

-- ── site-photos: read = any authenticated; insert = any; update/delete = OPS ─
drop policy if exists "site_photos_storage_read" on storage.objects;
create policy "site_photos_storage_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'site-photos');

drop policy if exists "site_photos_storage_insert" on storage.objects;
create policy "site_photos_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-photos');

drop policy if exists "site_photos_storage_update_ops" on storage.objects;
create policy "site_photos_storage_update_ops" on storage.objects
  for update to authenticated
  using ((bucket_id = 'site-photos') and public.is_ops_tier())
  with check ((bucket_id = 'site-photos') and public.is_ops_tier());

drop policy if exists "site_photos_storage_delete_ops" on storage.objects;
create policy "site_photos_storage_delete_ops" on storage.objects
  for delete to authenticated
  using ((bucket_id = 'site-photos') and public.is_ops_tier());
