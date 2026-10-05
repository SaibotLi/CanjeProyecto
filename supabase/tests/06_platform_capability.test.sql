begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select has_function('public','is_current_user_platform_admin',array[]::text[]);
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='is_current_user_platform_admin'),1::bigint,'No identity-taking overloads');
select is(pg_get_function_identity_arguments('public.is_current_user_platform_admin()'::regprocedure),'','No parameters');
select is(pg_get_function_result('public.is_current_user_platform_admin()'::regprocedure),'boolean','Only boolean result');
select is(pg_get_userbyid(proowner),'postgres','Reviewed owner') from pg_proc where oid='public.is_current_user_platform_admin()'::regprocedure;
select ok(not prosecdef,'SECURITY INVOKER') from pg_proc where oid='public.is_current_user_platform_admin()'::regprocedure;
select is(provolatile::text,'s','STABLE') from pg_proc where oid='public.is_current_user_platform_admin()'::regprocedure;
select is(array_to_string(proconfig,','),'search_path=""','Empty search_path') from pg_proc where oid='public.is_current_user_platform_admin()'::regprocedure;
select is(l.lanname::text,'sql','Static SQL language') from pg_proc p join pg_language l on l.oid=p.prolang where p.oid='public.is_current_user_platform_admin()'::regprocedure;
select is(regexp_replace(prosrc,'\s','','g'),'selectprivate.is_platform_admin();','Exact delegation: no AAL or metadata/identity input') from pg_proc where oid='public.is_current_user_platform_admin()'::regprocedure;
select is(has_function_privilege(r,'public.is_current_user_platform_admin()','EXECUTE'),r='authenticated','Effective EXECUTE '||r)
 from unnest(array['anon','authenticated','service_role','supabase_auth_admin']) r;
select is((select count(*) from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.oid='public.is_current_user_platform_admin()'::regprocedure and
 (a.grantee not in (p.proowner,'authenticated'::regrole::oid) or (a.is_grantable and a.grantee<>p.proowner))),0::bigint,'No PUBLIC/extra grantee/app grant option');

-- Role-level proof only. Genuine JWT/AAL/revocation proof lives in REST tests.
insert into auth.users(id) values('fa2f0000-0000-4000-8000-000000000006');
insert into private.platform_admins(user_id) values('fa2f0000-0000-4000-8000-000000000006');
set local request.jwt.claims = '{"sub":"fa2f0000-0000-4000-8000-000000000006","role":"authenticated","aal":"aal1"}';
set local role authenticated;
select ok(public.is_current_user_platform_admin(),'Invoker reuses self grants at AAL1');
set local request.jwt.claims = '{}';
select ok(not public.is_current_user_platform_admin(),'Missing UID returns false');
set local role anon;
select throws_ok('select public.is_current_user_platform_admin()','42501',null,'Anon cannot execute');
reset role;
select * from finish();
rollback;
