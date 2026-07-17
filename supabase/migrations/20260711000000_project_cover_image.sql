-- ───────────────────────────────────────────────────────────────────────────
-- SAY PROJECTS — Optional project cover image
--
-- Lets an admin upload a custom cover/hero image when creating a project.
-- If left empty, the app falls back to the built-in type-based default image.
--
--  • projects.image_path  — storage path inside the `project-images` bucket
--    (nullable; NULL = use the default). We store the bucket-relative PATH,
--    not a URL, so the client derives a stable public URL via getPublicUrl().
--  • project-images bucket — PUBLIC, so the cover renders as a plain CSS
--    background with a permanent URL (no signed-URL expiry to manage). Only
--    an authenticated user can upload; anyone can read (public URL).
--
-- Idempotent: safe to re-run on cloud + local.
-- ───────────────────────────────────────────────────────────────────────────

-- ── Column ───────────────────────────────────────────────────────────────────
alter table public.projects
  add column if not exists image_path text;

-- ── Bucket (PUBLIC — cover images are non-sensitive marketing-style photos) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-images', 'project-images', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── Policies: read = public (bucket is public); write = any authenticated ────
drop policy if exists "project_images_read" on storage.objects;
create policy "project_images_read" on storage.objects
  for select to public
  using (bucket_id = 'project-images');

drop policy if exists "project_images_insert" on storage.objects;
create policy "project_images_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-images');

drop policy if exists "project_images_update" on storage.objects;
create policy "project_images_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-images')
  with check (bucket_id = 'project-images');

drop policy if exists "project_images_delete_ops" on storage.objects;
create policy "project_images_delete_ops" on storage.objects
  for delete to authenticated
  using ((bucket_id = 'project-images') and public.is_ops_tier());
