-- Task 2G LOCAL. A-S2-003 APPROVED: public file/info, protected listing/management.
-- Forward-only; never edit foundation/authorization/active-business migrations.
-- DELETE gate remains STOP pending orphan concurrency decision. Deny by absence.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

create policy menu_images_business_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'menu-images' and char_length(name) in (77, 78)
    and name collate "C" ~ E'\\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|jpeg|png|webp|avif)\\Z'
    and exists (
      select 1 from public.businesses as business
      where business.id::text = (storage.foldername(objects.name))[1]
        and private.is_business_admin(business.id)
    )
  );

create policy menu_images_platform_read on storage.objects
  for select to authenticated
  using (bucket_id = 'menu-images'
    and (select auth.jwt()->>'aal') = 'aal2'
    and (select private.is_platform_admin()));

create policy menu_images_business_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-images' and storage.allow_only_operation('object.upload')
    and char_length(name) in (77, 78)
    and name collate "C" ~ E'\\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|jpeg|png|webp|avif)\\Z'
    and (user_metadata is null or user_metadata = '{}'::jsonb)
    and (metadata->>'mimetype') = case storage.extension(name)
      when 'jpg' then 'image/jpeg' when 'jpeg' then 'image/jpeg'
      when 'png' then 'image/png' when 'webp' then 'image/webp'
      when 'avif' then 'image/avif' end
    and exists (
      select 1 from public.businesses as business
      where business.id::text = (storage.foldername(objects.name))[1]
        and private.is_business_admin(business.id) and business.is_active
    )
  );

-- No UPDATE/DELETE/ALL/bucket policies or new grants. Managed Storage ACLs and
-- functions remain untouched. No overwrite/move/copy/signed/TUS/S3 upload grants.
-- Public known-path download/info bypass SELECT RLS intentionally, per contract.
commit;
