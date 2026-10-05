begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select results_eq($$select jsonb_build_array(id,name,public,file_size_limit,allowed_mime_types,type::text,versioning_status)
 from storage.buckets order by id$$,
 $$values (jsonb_build_array('menu-images','menu-images',true,5242880,
 array['image/jpeg','image/png','image/webp','image/avif'],'STANDARD','DISABLED'))$$,
 'Exactly reproducible public menu-images bucket, 5 MiB and explicit MIME allowlist');
select is((select count(*) from storage.objects),0::bigint,'Normal seed has no Storage objects');
select ok(relrowsecurity,'Managed Storage RLS enabled: '||relname) from pg_class
 where oid in ('storage.objects'::regclass,'storage.buckets'::regclass);
select is(pg_get_userbyid(relowner),'supabase_storage_admin','Managed owner unchanged: '||relname)
 from pg_class where oid in ('storage.objects'::regclass,'storage.buckets'::regclass);

-- Independent expected deparse, reviewed from the explicit contract; not built
-- by selecting/normalizing live policies into the expected side of the assertion.
create temporary table expected_storage(n text,c text,u text,w text);
insert into expected_storage values
('menu_images_business_read','SELECT',
$$((bucket_id = 'menu-images'::text) AND (char_length(name) = ANY (ARRAY[77, 78])) AND ((name COLLATE "C") ~ '\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|jpeg|png|webp|avif)\Z'::text) AND (EXISTS ( SELECT 1 FROM businesses business WHERE (((business.id)::text = (storage.foldername(objects.name))[1]) AND private.is_business_admin(business.id)))))$$,null),
('menu_images_platform_read','SELECT',
$$((bucket_id = 'menu-images'::text) AND (( SELECT (auth.jwt() ->> 'aal'::text)) = 'aal2'::text) AND ( SELECT private.is_platform_admin() AS is_platform_admin))$$,null),
('menu_images_business_insert','INSERT',null,
$$((bucket_id = 'menu-images'::text) AND storage.allow_only_operation('object.upload'::text) AND (char_length(name) = ANY (ARRAY[77, 78])) AND ((name COLLATE "C") ~ '\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|jpeg|png|webp|avif)\Z'::text) AND ((user_metadata IS NULL) OR (user_metadata = '{}'::jsonb)) AND ((metadata ->> 'mimetype'::text) = CASE storage.extension(name) WHEN 'jpg'::text THEN 'image/jpeg'::text WHEN 'jpeg'::text THEN 'image/jpeg'::text WHEN 'png'::text THEN 'image/png'::text WHEN 'webp'::text THEN 'image/webp'::text WHEN 'avif'::text THEN 'image/avif'::text ELSE NULL::text END) AND (EXISTS ( SELECT 1 FROM businesses business WHERE (((business.id)::text = (storage.foldername(objects.name))[1]) AND private.is_business_admin(business.id) AND business.is_active))))$$);
select is((select count(*) from pg_policies where schemaname='storage'),3::bigint,'Exactly three Storage policies; application DELETE deferred beyond Sprint 2 (A-S2-004)');
select results_eq($$select jsonb_build_array(tablename,policyname,cmd,roles,permissive,
 regexp_replace(qual,'\s','','g'),regexp_replace(with_check,'\s','','g'))
 from pg_policies where schemaname='storage' order by policyname$$,
 $$select jsonb_build_array('objects',n,c,array['authenticated'],'PERMISSIVE',
 regexp_replace(u,'\s','','g'),regexp_replace(w,'\s','','g')) from expected_storage order by n$$,
 'Exact Storage policies: bucket/real canonical path/current membership/active writes/AAL2/operation/empty metadata/MIME');
select is((select count(*) from pg_policies where schemaname='storage' and cmd in ('ALL','UPDATE','DELETE')),0::bigint,'No overwrite/move/delete policies');
select is((select count(*) from pg_policies where schemaname='storage' and tablename='buckets'),0::bigint,'No app bucket administration');
select is((select count(*) from pg_policies where schemaname='storage' and 'anon'=any(roles)),0::bigint,'No anon management policy needed for public download');

-- Preserve the exact managed baseline ACL, not GRANT ALL by application migration.
select is(has_table_privilege(r,'storage.'||t,p),
 case when r='service_role' then true else p in ('SELECT','INSERT','UPDATE','DELETE') end,
 'Managed ACL unchanged: '||r||'/'||t||'/'||p)
 from unnest(array['anon','authenticated','service_role']) r
 cross join unnest(array['objects','buckets']) t
 cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p;
select is((select count(*) from pg_class c cross join lateral aclexplode(c.relacl) a
 where c.oid in ('storage.objects'::regclass,'storage.buckets'::regclass) and
 (a.grantee not in (c.relowner,'postgres'::regrole::oid,'service_role'::regrole::oid,'authenticated'::regrole::oid,'anon'::regrole::oid)
 or a.is_grantable and a.grantee in ('authenticated'::regrole::oid,'anon'::regrole::oid,'service_role'::regrole::oid))),
 0::bigint,'No unexpected PUBLIC/grantees/application grant options');
select has_trigger('storage','objects','protect_objects_delete','Managed delete protection preserved');
select has_trigger('storage','buckets','protect_buckets_delete','Managed bucket delete protection preserved');
select is(storage.foldername('not-uuid/sub/file.png'),array['not-uuid','sub'],'foldername splits, does not validate canonical path');
select is(storage.extension('tenant/asset.PNG'),'PNG','extension does not normalize uppercase');
select ok(not storage.allow_only_operation('object.upload'),'Missing operation fails closed');
select * from finish();
rollback;
