-- ============================================================================
-- SPAZEHAUS — Tier 1 · Signature Documents Storage Bucket
-- Generated: 2026-05-13
--
-- Companion to the Document Upload feature. Each project has 6 signature
-- documents:
--   • 3 contracts:  design-contract, renovation-contract, handover
--   • 3 drawings:   revised-3d, material-selection, 2d-shopping
--
-- Path pattern inside the bucket:
--   {project_id}/{signature_key}/{timestamp}.pdf
--
-- The bucket is PRIVATE — clients/admins access via short-lived signed URLs
-- minted client-side (see `getSignatureDocUrl()` in queries.ts).
--
-- RLS mirrors the Phase 0D OPS-tier write pattern:
--   • All authenticated staff can READ + LIST (so anyone can view a signed doc).
--   • Only OPS tier (principal/admin/admin_exec/pm/site_supervisor) can
--     INSERT / UPDATE / DELETE objects.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signature-docs',
  'signature-docs',
  false,                                         -- private; signed URLs only
  20971520,                                      -- 20 MB cap per file
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Drop in case re-applied
drop policy if exists "signature_docs_read"        on storage.objects;
drop policy if exists "signature_docs_insert_ops"  on storage.objects;
drop policy if exists "signature_docs_update_ops"  on storage.objects;
drop policy if exists "signature_docs_delete_ops"  on storage.objects;

create policy "signature_docs_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'signature-docs');

create policy "signature_docs_insert_ops"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'signature-docs' and public.is_ops_tier());

create policy "signature_docs_update_ops"
  on storage.objects for update to authenticated
  using (bucket_id = 'signature-docs' and public.is_ops_tier())
  with check (bucket_id = 'signature-docs' and public.is_ops_tier());

create policy "signature_docs_delete_ops"
  on storage.objects for delete to authenticated
  using (bucket_id = 'signature-docs' and public.is_ops_tier());
