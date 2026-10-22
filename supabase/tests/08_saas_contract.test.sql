begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_catalog;
select no_plan();
select has_table('public','business_entitlements','Commercial capability table exists');
select has_table('public','business_presentation','Merchant presentation table exists');
select ok((select relrowsecurity from pg_class where oid=format('public.%I',t)::regclass),'RLS enabled: '||t)
  from unnest(array['business_entitlements','business_presentation']) t;
select ok(not has_table_privilege(r,'public.business_entitlements','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),'No application capability mutation: '||r)
  from unnest(array['anon','authenticated','service_role']) r;
select ok(not has_table_privilege(r,'public.business_presentation','INSERT,DELETE,TRUNCATE,REFERENCES,TRIGGER'),'No creation/deletion/DDL on presentation: '||r)
  from unnest(array['anon','authenticated','service_role']) r;
select ok(not has_column_privilege('authenticated','public.business_presentation',c,'UPDATE'),'No identity/timestamp mutation: '||c)
  from unnest(array['business_id','created_at','updated_at']) c;
select ok(has_column_privilege('authenticated','public.business_presentation',c,'UPDATE'),'Merchant-editable presentation: '||c)
  from unnest(array['tagline','description','city','region','country_code','address','contact_phone','instagram_handle','website_url','template','accent','logo_path']) c;
select ok(not has_function_privilege(r,f,'EXECUTE'),'Internal only: '||r||'/'||f)
  from unnest(array['anon','authenticated','service_role','supabase_auth_admin']) r
  cross join unnest(array['private.provision_business(uuid,text,text,boolean,text)','private.initialize_business_configuration()','private.require_loyalty_entitlement(uuid,boolean)']) f;
select is(pg_get_userbyid(p.proowner),'postgres','New function owner') from pg_proc p
  where p.oid in ('private.provision_business(uuid,text,text,boolean,text)'::regprocedure,'private.initialize_business_configuration()'::regprocedure,'private.require_loyalty_entitlement(uuid,boolean)'::regprocedure);
select is(array_to_string(p.proconfig,','),'search_path=""','New function fixed search_path') from pg_proc p
  where p.oid in ('private.provision_business(uuid,text,text,boolean,text)'::regprocedure,'private.initialize_business_configuration()'::regprocedure,'private.require_loyalty_entitlement(uuid,boolean)'::regprocedure);
select ok(p.prosrc like '%require_loyalty_entitlement%','Economic implementation checks commercial capability: '||p.proname)
  from pg_proc p where p.oid in ('private.lookup_loyalty_customer(uuid,text)'::regprocedure,'private.credit_points(uuid,text,jsonb,uuid,text)'::regprocedure,'private.reverse_credit(uuid,uuid,text,uuid)'::regprocedure);
select is((select count(*) from public.businesses b left join public.business_entitlements e on e.business_id=b.id where e.business_id is null),0::bigint,'Complete entitlement backfill');
select is((select count(*) from public.businesses b left join public.business_presentation p on p.business_id=b.id where p.business_id is null),0::bigint,'Complete presentation backfill');
insert into public.businesses(id,slug,name,timezone) values ('cafe0000-0000-4000-8000-000000000001','sql-menu-demo','SQL local menu','UTC');
select is((select loyalty_enabled from public.business_entitlements where business_id='cafe0000-0000-4000-8000-000000000001'),false,'New business defaults to menu-only');
select is((select template from public.business_presentation where business_id='cafe0000-0000-4000-8000-000000000001'),'night','New presentation has complete reusable defaults');
select throws_ok($$insert into public.businesses(slug,name,timezone) values ('admin','Reserved','UTC')$$,'23514',null,'Platform route cannot be provisioned as business slug');
select throws_ok($$update public.business_presentation set logo_path='a11a0000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.png' where business_id='cafe0000-0000-4000-8000-000000000001'$$,'23514',null,'Logo path is scoped to business');
select throws_ok($$update public.business_presentation set template='custom-html' where business_id='cafe0000-0000-4000-8000-000000000001'$$,'23514',null,'No arbitrary template/code input');
select throws_ok($$update public.business_presentation set website_url='javascript:alert(1)' where business_id='cafe0000-0000-4000-8000-000000000001'$$,'23514',null,'No executable contact URL');
select * from finish();
rollback;
