-- Rollback-only SQL contract tests. Real signed JWT/API proof is loyalty-rest.test.mjs.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();
select has_table('public','point_transactions','Economic ledger exists');
select columns_are('public','point_transactions',array['id','business_id','customer_id','customer_code','actor_id','actor_role','entry_type','currency_code','paid_amount','currency_per_point','points_delta','request_id','reference','reverses_id','reason','created_at'],'Exact economic audit fields');
select is(a.atttypmod,-1,'Money remains unconstrained NUMERIC before CHECK: '||a.attname)
  from pg_attribute a where a.attrelid='public.point_transactions'::regclass and a.attname in ('paid_amount','currency_per_point');
select ok((select relrowsecurity from pg_class where oid='public.point_transactions'::regclass),'Ledger RLS enabled, deny baseline');
select is((select count(*) from pg_policies where schemaname='public' and tablename='point_transactions'),0::bigint,'No permissive direct ledger policies');
select ok(not has_table_privilege(r,'public.point_transactions','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),'No direct economic privileges: '||r)
  from unnest(array['anon','authenticated','service_role']) r;
select col_not_null('public','profiles','customer_code','Customer code is required');
select has_unique('public','profiles','Unique customer identifiers');
select is((select count(*) from public.profiles where customer_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$'),0::bigint,'All generated/backfilled codes are canonical');
select ok((select pg_get_constraintdef(oid) like '%staff%' from pg_constraint where conname='business_memberships_role_check'),'Staff is an explicit membership value');
select results_eq($$select jsonb_build_array(cmd,roles,permissive,qual,with_check)
  from pg_policies where schemaname='public' and tablename='businesses' and policyname='business_staff_read'$$,
  $$select jsonb_build_array('SELECT',array['authenticated']::name[],'PERMISSIVE','private.is_business_staff(id)',null::text)$$,
  'Staff policy adds only own-business READ, with exact role/expression');
select ok((select prosrc like '%role = ''admin''%' and prosrc not like '%staff%' from pg_proc where oid='private.is_business_admin(uuid)'::regprocedure),'Existing Admin helper remains Admin-only');

create temporary table expected_loyalty_functions(schema_name text, function_name text, signature text, definer boolean, app_execute boolean);
insert into expected_loyalty_functions values
('private','is_business_staff','uuid',false,true),
('private','new_customer_code','',false,false),
('private','preserve_customer_code','',false,false),
('private','prevent_economic_mutation','',false,false),
('private','validate_economic_insert','',false,false),
('private','normalize_customer_code','text',false,false),
('private','parse_paid_amount','jsonb',false,false),
('private','loyalty_operator','uuid,boolean,boolean',false,false),
('private','loyalty_receipt','public.point_transactions',false,false),
('private','lookup_loyalty_customer','uuid,text',true,true),
('private','credit_points','uuid,text,jsonb,uuid,text',true,true),
('private','reverse_credit','uuid,uuid,text,uuid',true,true),
('private','my_loyalty','uuid,timestamptz,uuid,integer',true,true),
('private','loyalty_history','uuid,timestamptz,uuid,integer',true,true),
('public','lookup_loyalty_customer','uuid,text',false,true),
('public','credit_points','uuid,text,jsonb,uuid,text',false,true),
('public','reverse_credit','uuid,uuid,text,uuid',false,true),
('public','get_my_loyalty','uuid,timestamptz,uuid,integer',false,true),
('public','get_loyalty_history','uuid,timestamptz,uuid,integer',false,true);
select is(p.prosecdef,e.definer,'Exact execution mode: '||e.function_name)
  from expected_loyalty_functions e join pg_proc p on p.oid=format('%I.%I(%s)',e.schema_name,e.function_name,e.signature)::regprocedure;
select is(pg_get_userbyid(p.proowner),'postgres','Migration owner: '||e.function_name)
  from expected_loyalty_functions e join pg_proc p on p.oid=format('%I.%I(%s)',e.schema_name,e.function_name,e.signature)::regprocedure;
select is(array_to_string(p.proconfig,','),'search_path=""','Empty search path: '||e.function_name)
  from expected_loyalty_functions e join pg_proc p on p.oid=format('%I.%I(%s)',e.schema_name,e.function_name,e.signature)::regprocedure;
select is(has_function_privilege(r,format('%I.%I(%s)',e.schema_name,e.function_name,e.signature),'EXECUTE'),
  r='authenticated' and e.app_execute,'Exact EXECUTE: '||r||'/'||e.function_name)
  from expected_loyalty_functions e cross join unnest(array['anon','authenticated','service_role','supabase_auth_admin']) r;
select is((select count(*) from expected_loyalty_functions e join pg_proc p on p.oid=format('%I.%I(%s)',e.schema_name,e.function_name,e.signature)::regprocedure
  cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where a.grantee=0 or (a.grantee<>p.proowner and a.is_grantable)),0::bigint,'No PUBLIC execute or application grant options');
select ok(c.confdeltype='r' and c.confupdtype='r','Economic FK has no cascade: '||c.conname)
  from pg_constraint c where c.conrelid='public.point_transactions'::regclass and c.contype='f';

select is(private.parse_paid_amount('"1000.01"'),1000.01::numeric,'Exact cents without float');
select is(private.parse_paid_amount('"999999999999.99"'),999999999999.99::numeric,'Exact upper money bound');
select throws_ok(format('select private.parse_paid_amount(%L::jsonb)',value),'PT400',null,'Reject amount before numeric conversion: '||value)
  from unnest(array['"1000.001"','"1000.000"','"1e3"','"NaN"','"Infinity"','"-1"','"1,00"','" 1000"','"1000000000000"','"0"','1000','1000.001','null','{}','[]']) value;

insert into auth.users(id,email_confirmed_at) values
('ad3b0000-0000-4000-8000-000000000001',now()),
('5a3b0000-0000-4000-8000-000000000001',now()),
('c03b0000-0000-4000-8000-000000000001',now());
insert into public.business_memberships(business_id,user_id,role) values
('a11a0000-0000-4000-8000-000000000001','ad3b0000-0000-4000-8000-000000000001','admin'),
('a11a0000-0000-4000-8000-000000000001','5a3b0000-0000-4000-8000-000000000001','staff');
select throws_ok($$update public.profiles set customer_code='ABCDEFGHJK' where id='c03b0000-0000-4000-8000-000000000001'$$,'PT403','customer_code_immutable','Even owner UPDATE cannot rewrite a customer code');
set local request.jwt.claims = '{"sub":"5a3b0000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}';
create temporary table economic_receipts as select public.credit_points('a11a0000-0000-4000-8000-000000000001',
  (select customer_code from public.profiles where id='c03b0000-0000-4000-8000-000000000001'),'"1999.99"','de3b0000-0000-4000-8000-000000000001',null) receipt;
select is((select receipt->>'points_delta' from economic_receipts),'1','Whole-transaction floor computed by PostgreSQL');
select throws_ok($$insert into public.point_transactions(business_id,customer_id,customer_code,actor_id,actor_role,entry_type,paid_amount,currency_per_point,points_delta,request_id)
  select business_id,customer_id,customer_code,actor_id,actor_role,entry_type,1000.001,currency_per_point,1,gen_random_uuid()
  from public.point_transactions where entry_type='credit' limit 1$$,'23514',null,'Privileged direct insert cannot silently round excess precision');
select throws_ok($$insert into public.point_transactions(business_id,customer_id,customer_code,actor_id,actor_role,entry_type,paid_amount,currency_per_point,points_delta,request_id,reverses_id,reason)
  select business_id,customer_id,customer_code,'ad3b0000-0000-4000-8000-000000000001','admin','reversal',2000,currency_per_point,-2,gen_random_uuid(),id,'Malformed copy'
  from public.point_transactions where entry_type='credit' limit 1$$,'23514','invalid_reversal_original','Reversal cannot rewrite original money or delta');
select throws_ok($$update public.point_transactions set points_delta=100$$,'PT403','ledger_immutable','Owner UPDATE blocked');
select throws_ok($$delete from public.point_transactions$$,'PT403','ledger_immutable','Owner DELETE blocked');
select throws_ok($$truncate public.point_transactions$$,'PT403','ledger_immutable','Owner TRUNCATE blocked');
select throws_ok($$delete from auth.users where id='c03b0000-0000-4000-8000-000000000001'$$,'23503',null,'Auth deletion cannot cascade economic history');
select throws_ok(format('select public.reverse_credit(%L,%L,%L,%L)','a11a0000-0000-4000-8000-000000000001',receipt->>'id','Correction','de3b0000-0000-4000-8000-000000000002'),'PT403','business_access_denied','Staff cannot reverse') from economic_receipts;
set local request.jwt.claims = '{"sub":"ad3b0000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}';
select is(public.reverse_credit('a11a0000-0000-4000-8000-000000000001',(receipt->>'id')::uuid,'Correction','de3b0000-0000-4000-8000-000000000002')->>'points_delta','-1','Admin appends exact compensating reversal') from economic_receipts;
select throws_ok(format('select public.reverse_credit(%L,%L,%L,%L)','a11a0000-0000-4000-8000-000000000001',receipt->>'id','Again','de3b0000-0000-4000-8000-000000000003'),'PT409','credit_already_reversed','Only one complete reversal') from economic_receipts;
set local request.jwt.claims = '{"sub":"c03b0000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}';
select is(public.get_my_loyalty('a11a0000-0000-4000-8000-000000000001')->>'balance','0','Balance is complete ledger SUM');
select is(jsonb_array_length(public.get_my_loyalty('a11a0000-0000-4000-8000-000000000001')->'history'),2,'Both immutable movements remain');
select ok(not (public.get_my_loyalty('a11a0000-0000-4000-8000-000000000001')->'history'->0 ? 'actor_id'),'Self history hides operator identifiers');
select * from finish();
rollback;
