begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

-- Independently maintained expected catalog, NOT generated from live policies.
-- Compare exact deparsed expressions, ignoring whitespace only (not parentheses).
create temporary table expected_policies(s text,t text,n text,c text,r name[],u text,w text);
insert into expected_policies values
 ('private','platform_admins','self_read','SELECT',array['authenticated']::name[],'(user_id = ( SELECT auth.uid() AS uid))',null),
 ('public','business_memberships','self_read','SELECT',array['authenticated']::name[],'(user_id = ( SELECT auth.uid() AS uid))',null),
 ('public','profiles','self_read','SELECT',array['authenticated']::name[],'(id = ( SELECT auth.uid() AS uid))',null),
 ('public','profiles','self_update','UPDATE',array['authenticated']::name[],'(id = ( SELECT auth.uid() AS uid))','(id = ( SELECT auth.uid() AS uid))'),
 ('public','businesses','public_read','SELECT',array['anon','authenticated']::name[],'is_active',null),
 ('public','businesses','business_admin_read','SELECT',array['authenticated']::name[],'private.is_business_admin(id)',null),
 ('public','businesses','business_admin_update','UPDATE',array['authenticated']::name[],'(is_active AND private.is_business_admin(id))','(is_active AND private.is_business_admin(id))'),
 ('public','loyalty_settings','public_read','SELECT',array['anon','authenticated']::name[],'(EXISTS ( SELECT 1 FROM businesses business WHERE ((business.id = loyalty_settings.business_id) AND business.is_active)))',null),
 ('public','loyalty_settings','business_admin_read','SELECT',array['authenticated']::name[],'private.is_business_admin(business_id)',null),
 ('public','loyalty_settings','business_admin_update','UPDATE',array['authenticated']::name[],'(private.is_business_admin(business_id) AND (EXISTS ( SELECT 1 FROM businesses business WHERE ((business.id = loyalty_settings.business_id) AND business.is_active))))','(private.is_business_admin(business_id) AND (EXISTS ( SELECT 1 FROM businesses business WHERE ((business.id = loyalty_settings.business_id) AND business.is_active))))'),
 ('public','menu_categories','public_read','SELECT',array['anon','authenticated']::name[],'(is_active AND (EXISTS ( SELECT 1 FROM businesses business WHERE ((business.id = menu_categories.business_id) AND business.is_active))))',null),
 ('public','menu_items','public_read','SELECT',array['anon','authenticated']::name[],'(is_active AND (EXISTS ( SELECT 1 FROM businesses business WHERE ((business.id = menu_items.business_id) AND business.is_active))) AND (EXISTS ( SELECT 1 FROM menu_categories category WHERE ((category.id = menu_items.category_id) AND (category.business_id = menu_items.business_id) AND category.is_active))))',null);
insert into expected_policies select 'public',t,'platform_admin_read','SELECT',array['authenticated']::name[],
  '((( SELECT (auth.jwt() ->> ''aal''::text)) = ''aal2''::text) AND ( SELECT private.is_platform_admin() AS is_platform_admin))',null
  from unnest(array['businesses','profiles','business_memberships','loyalty_settings','menu_categories','menu_items']) t;
insert into expected_policies select 'public',t,'business_admin_read','SELECT',array['authenticated']::name[],
  'private.is_business_admin(business_id)',null
  from unnest(array['menu_categories','menu_items']) t;
-- Independent exact expected predicates for the forward-only active-tenant fix.
insert into expected_policies select 'public',t,n,c,array['authenticated']::name[],
  case when c='UPDATE' then expression else null end,expression
  from unnest(array['menu_categories','menu_items']) t
  cross join (values ('business_admin_insert','INSERT'),('business_admin_update','UPDATE')) p(n,c)
  cross join lateral (select '(private.is_business_admin(business_id) AND (EXISTS ( SELECT 1 FROM businesses business WHERE ((business.id = '||t||'.business_id) AND business.is_active))))' as expression) predicate;
select is((select count(*) from pg_policies where schemaname in ('public','private')),24::bigint,'Exactly 24 policies; no accidental policies');
select results_eq($$select jsonb_build_array(schemaname,tablename,policyname,cmd,roles,permissive,
  regexp_replace(qual,'\s','','g'),regexp_replace(with_check,'\s','','g'))
  from pg_policies where schemaname in ('public','private') order by schemaname,tablename,policyname$$,
  $$select jsonb_build_array(s,t,n,c,r,'PERMISSIVE',regexp_replace(u,'\s','','g'),regexp_replace(w,'\s','','g'))
  from expected_policies order by s,t,n$$,'Exact policy table/name/command/roles/mode/USING/WITH CHECK inventory');
select is((select count(*) from pg_policies where schemaname in ('public','private') and cmd='ALL'),0::bigint,'No FOR ALL');
select is((select count(*) from pg_policies where schemaname in ('public','private') and policyname='platform_admin_read' and cmd<>'SELECT'),0::bigint,'No platform write policies');
select ok(qual not like '%private.%' and with_check is null,'Public policy has no authorization helper: '||tablename)
  from pg_policies where schemaname='public' and policyname='public_read';

-- Complete effective table and column privileges, including inherited/PUBLIC ACL.
create temporary table expected_acl(s text,t text,anon_read boolean,auth_read boolean,i text[],u text[]);
insert into expected_acl values
 ('public','businesses',true,true,array[]::text[],array['name']),
 ('public','profiles',false,true,array[]::text[],array['display_name']),
 ('public','business_memberships',false,true,array[]::text[],array[]::text[]),
 ('private','platform_admins',false,false,array[]::text[],array[]::text[]),
 ('public','loyalty_settings',true,true,array[]::text[],array['currency_per_point','points_enabled']),
 ('public','menu_categories',true,true,array['business_id','name','slug','display_order','is_active'],array['name','slug','display_order','is_active']),
 ('public','menu_items',true,true,array['business_id','category_id','name','description','price_amount','image_path','image_alt','image_presentation','is_available','is_featured','is_active','display_order'],array['category_id','name','description','price_amount','image_path','image_alt','image_presentation','is_available','is_featured','is_active','display_order']);
select is(has_table_privilege(r,format('%I.%I',s,t),p),case when p='SELECT' and r='anon' then anon_read when p='SELECT' and r='authenticated' then auth_read else false end,
  r||' '||s||'.'||t||' table '||p)
 from expected_acl cross join unnest(array['anon','authenticated','service_role']) r
 cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p;
select is(has_column_privilege(r,format('%I.%I',e.s,e.t),a.attname,p),
  case when p='SELECT' and r='anon' then e.anon_read
    when p='SELECT' and r='authenticated' then e.auth_read or (e.s='private' and a.attname='user_id')
    when p='INSERT' and r='authenticated' then a.attname=any(e.i)
    when p='UPDATE' and r='authenticated' then a.attname=any(e.u) else false end,
  r||' '||e.t||'.'||a.attname||' column '||p)
 from expected_acl e join pg_attribute a on a.attrelid=format('%I.%I',e.s,e.t)::regclass and a.attnum>0 and not a.attisdropped
 cross join unnest(array['anon','authenticated','service_role']) r
 cross join unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) p;
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  cross join lateral aclexplode(c.relacl) a where n.nspname in ('public','private') and c.relkind='r' and
  (a.grantee not in (c.relowner,'anon'::regrole::oid,'authenticated'::regrole::oid) or a.is_grantable and a.grantee<>c.relowner)),0::bigint,'Only expected table grantees, no PUBLIC or app grant options');
select is((select count(*) from pg_attribute att join pg_class c on c.oid=att.attrelid join pg_namespace n on n.oid=c.relnamespace
  cross join lateral aclexplode(att.attacl) a where n.nspname in ('public','private') and c.relkind='r' and
  (a.grantee not in (c.relowner,'authenticated'::regrole::oid) or a.is_grantable and a.grantee<>c.relowner)),0::bigint,'Only expected column grantees, no PUBLIC or app grant options');
select ok(not has_schema_privilege(r,s,'CREATE'),r||' cannot CREATE in '||s)
 from unnest(array['anon','authenticated']) r cross join unnest(array['public','private']) s;
select is(has_schema_privilege(r,'private','USAGE'),r='authenticated','Private USAGE: '||r)
 from unnest(array['anon','authenticated','service_role']) r;
select is((select count(*) from pg_namespace n cross join lateral aclexplode(n.nspacl) a where n.nspname='private' and a.grantee=0),0::bigint,'No PUBLIC private schema privilege');

create temporary table expected_functions(n text,args text,ret text,def boolean,vol text,src text);
insert into expected_functions values
 ('is_business_admin','uuid','boolean',false,'s',$$select exists ( select 1 from public.business_memberships as membership where membership.user_id = (select auth.uid()) and membership.business_id = target_business_id and membership.role = 'admin' );$$),
 ('is_platform_admin','','boolean',false,'s',$$select exists ( select 1 from private.platform_admins as administrator where administrator.user_id = (select auth.uid()) );$$),
 ('set_updated_at','','trigger',false,'v',$$begin new.updated_at := pg_catalog.now(); return new; end;$$),
 ('create_profile_for_auth_user','','trigger',true,'v',$$begin insert into public.profiles (id) values (new.id); return new; end;$$);
select functions_are('private',array['create_profile_for_auth_user','is_business_admin','is_platform_admin','set_updated_at']);
select functions_are('public',array['is_current_user_platform_admin']);
create temporary view function_inventory as select e.*,p.oid,p.proowner,p.prosecdef,p.provolatile,p.proconfig,p.prosrc
 from expected_functions e join pg_proc p on p.oid=format('private.%I(%s)',e.n,e.args)::regprocedure;
select is(pg_get_userbyid(proowner),'postgres','Function owner '||n) from function_inventory;
select is(prosecdef,def,'Function security mode '||n) from function_inventory;
select is(provolatile::text,vol,'Function volatility '||n) from function_inventory;
select is(array_to_string(proconfig,','),'search_path=""','Function search_path '||n) from function_inventory;
select is(pg_get_function_identity_arguments(oid),case when n='is_business_admin' then 'target_business_id uuid' else '' end,'Exact argument names/types '||n) from function_inventory;
select is(pg_get_function_result(oid),ret,'Return type '||n) from function_inventory;
select is(regexp_replace(p.prosrc,'\s','','g'),regexp_replace(e.src,'\s','','g'),'Exact static helper SQL '||e.n)
 from expected_functions e join pg_proc p on p.oid=format('private.%I(%s)',e.n,e.args)::regprocedure where e.src is not null;
select is(has_function_privilege(r,format('private.%I(%s)',e.n,e.args),'EXECUTE'),r='authenticated' and e.ret='boolean','Function EXECUTE '||r||'/'||e.n)
 from expected_functions e cross join unnest(array['anon','authenticated','service_role','supabase_auth_admin']) r;
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
where n.nspname in ('public','private') and
 (a.grantee not in (p.proowner,'authenticated'::regrole::oid) or a.is_grantable and a.grantee<>p.proowner)),0::bigint,'Only expected function grantees, no PUBLIC EXECUTE or app grant option');

-- SQL role-level least privilege check (NOT proof of JWT/AAL; REST handles those).
insert into auth.users(id) values ('fa2c0000-0000-4000-8000-000000000001'),('fa2c0000-0000-4000-8000-000000000002');
insert into private.platform_admins(user_id) values ('fa2c0000-0000-4000-8000-000000000001'),('fa2c0000-0000-4000-8000-000000000002');
insert into public.business_memberships(business_id,user_id,role) values ('a11a0000-0000-4000-8000-000000000001','fa2c0000-0000-4000-8000-000000000001','admin');
set local request.jwt.claims = '{"sub":"fa2c0000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select is(current_user::text,'authenticated','SQL assertions execute as app role');
select is((select count(user_id) from private.platform_admins),1::bigint,'Invoker sees only own private authority row');
select ok(private.is_platform_admin(),'Own SQL helper works without AAL gate (global policies gate AAL)');
select ok(private.is_business_admin('a11a0000-0000-4000-8000-000000000001'),'Invoker sees own membership');
select ok(not private.is_business_admin('b22b0000-0000-4000-8000-000000000002'),'No foreign membership authority');
select throws_ok('select created_at from private.platform_admins','42501',null,'Private created_at column not granted');
select throws_ok($$insert into private.platform_admins(user_id) values ('fa2c0000-0000-4000-8000-000000000001')$$,'42501',null,'No private INSERT even own/platform');
select throws_ok($$update private.platform_admins set user_id=user_id where user_id='fa2c0000-0000-4000-8000-000000000001'$$,'42501',null,'No private UPDATE');
select throws_ok($$delete from private.platform_admins where user_id='fa2c0000-0000-4000-8000-000000000001'$$,'42501',null,'No private DELETE');
set local request.jwt.claims = '{}';
select ok(not private.is_platform_admin(),'Missing Auth UID fails closed');
select ok(not private.is_business_admin('a11a0000-0000-4000-8000-000000000001'),'Missing UID fails closed for membership');
set local role anon;
select throws_ok('select private.is_platform_admin()','42501',null,'Anon cannot invoke private helper');
reset role;
select * from finish();
rollback;
