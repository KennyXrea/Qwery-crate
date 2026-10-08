-- =============================================================================
-- Qwerty Crate · migration 4 of 4 · STORAGE (images)
--
-- One bucket, "media", for level thumbnails and player avatars:
--   levels/<level-id>/<timestamp>.webp
--   players/<player-id>/<timestamp>.webp
-- Max 2 MB per file; only PNG, JPEG and WebP.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Policies on storage.objects. All four are for admins only.
--
-- Why there is NO public "read" policy (on purpose): the bucket is public, so
-- anyone can already view a file through its public URL
-- (.../storage/v1/object/public/media/...) without any policy. A SELECT
-- policy for everyone would only add the ability to LIST every file in the
-- bucket, which the Supabase Security Advisor warns about. Admins still need
-- SELECT so they can replace (upsert) and delete files.
-- -----------------------------------------------------------------------------
drop policy if exists "media: admin read" on storage.objects;
create policy "media: admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

drop policy if exists "media: admin upload" on storage.objects;
create policy "media: admin upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

drop policy if exists "media: admin update" on storage.objects;
create policy "media: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

drop policy if exists "media: admin delete" on storage.objects;
create policy "media: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
