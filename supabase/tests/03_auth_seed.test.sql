begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();
select is((select count(*) from public.businesses),1::bigint,'Normal seed contains only Valhalla');
select is((select slug from public.businesses),'valhalla-space','Seed slug');
select is((select currency_code from public.businesses),'ARS','Seed currency');
select is((select timezone from public.businesses),'America/Argentina/Buenos_Aires','Seed timezone');
select is((select currency_per_point from public.loyalty_settings),1000.00::numeric,'Seed divisor');
select ok((select points_enabled from public.loyalty_settings),'Seed points flag');
select is((select count(*) from public.menu_categories),4::bigint,'Four seed categories');
select results_eq('select slug from public.menu_categories order by display_order',array['cervezas','tragos','vinos-espumantes','sin-alcohol'],'Same category slugs as presentation');
select is((select count(*) from public.menu_items),5::bigint,'Five generic demo products');
select is((select count(*) from public.menu_items where description like 'DEMO:%'),5::bigint,'All seed products explicitly demo');
select is((select count(*) from public.menu_items where image_path is not null),0::bigint,'Seed does not invent Storage assets');
select is((select count(*) from auth.users),0::bigint,'Seed contains no Auth users');
select is((select count(*) from public.business_memberships),0::bigint,'Seed contains no memberships');
select is((select count(*) from private.platform_admins),0::bigint,'Seed contains no platform authority');

-- Structural SQL test as migration owner. The CLI test role cannot SET ROLE
-- supabase_auth_admin; genuine GoTrue signup is tested by local-smoke.test.mjs.
insert into auth.users(id) values ('fa110000-0000-4000-8000-000000000001');
select is((select count(*) from public.profiles where id='fa110000-0000-4000-8000-000000000001'),1::bigint,'Auth insert triggers minimal profile');
select ok((select display_name is null and created_at=now() and updated_at=now() from public.profiles where id='fa110000-0000-4000-8000-000000000001'),'Profile only id and DB defaults');
select throws_ok($$update public.profiles set display_name=' ' where id='fa110000-0000-4000-8000-000000000001'$$,'23514',null,'Blank display name');
select throws_ok($$update public.profiles set display_name=repeat('a',81) where id='fa110000-0000-4000-8000-000000000001'$$,'23514',null,'Display name limit');
select lives_ok($$update public.profiles set display_name='Demo tester' where id='fa110000-0000-4000-8000-000000000001'$$,'Valid display name');
select throws_ok($$insert into public.business_memberships(business_id,user_id,role) values ('a11a0000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','customer')$$,'23514',null,'Customer is implicit, not membership');
select throws_ok($$insert into public.business_memberships(business_id,user_id,role) values ('a11a0000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','staff')$$,'23514',null,'Staff is forbidden');
insert into public.business_memberships(business_id,user_id,role) values
  ('a11a0000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','admin');
select throws_ok($$insert into public.business_memberships(business_id,user_id,role) values ('a11a0000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','admin')$$,'23505',null,'Membership composite PK');
delete from public.business_memberships where user_id='fa110000-0000-4000-8000-000000000001';
select is((select count(*) from public.business_memberships),0::bigint,'Membership physically revocable');
insert into public.business_memberships(business_id,user_id,role) values
  ('a11a0000-0000-4000-8000-000000000001','fa110000-0000-4000-8000-000000000001','admin');
insert into private.platform_admins(user_id) values ('fa110000-0000-4000-8000-000000000001');
select ok((select created_at=now() from private.platform_admins),'Platform timestamp DB default');
delete from auth.users where id='fa110000-0000-4000-8000-000000000001';
select is((select count(*) from public.profiles),0::bigint,'Auth deletion cascades to profile');
select is((select count(*) from public.business_memberships),0::bigint,'Auth/profile deletion removes obsolete membership');
select is((select count(*) from private.platform_admins),0::bigint,'Auth deletion cascades to platform authority');
select is((select count(*) from public.menu_items),5::bigint,'Identity deletion does not cascade catalog');

-- Intentional failure injection inside rollback-only transaction, not a migration.
alter table public.profiles add constraint task_2b_test_reject_profile check (false) not valid;
select throws_ok($$insert into auth.users(id) values ('fa110000-0000-4000-8000-000000000002')$$,'23514',null,'Profile failure propagates to Auth insert');
select is((select count(*) from auth.users where id='fa110000-0000-4000-8000-000000000002'),0::bigint,'Failed signup leaves no Auth row');
select is((select count(*) from public.profiles),0::bigint,'Failed signup leaves no partial profile');
alter table public.profiles drop constraint task_2b_test_reject_profile;
select * from finish();
rollback;
