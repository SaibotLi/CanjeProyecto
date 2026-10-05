begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

create temporary table expected_tables (schema_name text, table_name text, columns text[], pk text[]);
insert into expected_tables values
  ('public', 'businesses', array['id','slug','name','currency_code','timezone','is_active','created_at','updated_at'], array['id']),
  ('public', 'profiles', array['id','display_name','created_at','updated_at'], array['id']),
  ('public', 'business_memberships', array['business_id','user_id','role','created_at'], array['business_id','user_id']),
  ('public', 'loyalty_settings', array['business_id','currency_per_point','points_enabled','created_at','updated_at'], array['business_id']),
  ('public', 'menu_categories', array['id','business_id','name','slug','display_order','is_active','created_at','updated_at'], array['id']),
  ('public', 'menu_items', array['id','business_id','category_id','name','description','price_amount','image_path','image_alt','image_presentation','is_available','is_featured','is_active','display_order','created_at','updated_at'], array['id']),
  ('private', 'platform_admins', array['user_id','created_at'], array['user_id']);
select has_schema('private', 'Private schema exists');
select tables_are('public', array['businesses','profiles','business_memberships','loyalty_settings','menu_categories','menu_items']);
select tables_are('private', array['platform_admins']);
select has_table(schema_name, table_name, schema_name || '.' || table_name || ' exists') from expected_tables;
select columns_are(schema_name, table_name, columns, table_name || ' exact fields') from expected_tables;
select col_is_pk(schema_name, table_name, pk, table_name || ' exact primary key') from expected_tables;
select ok(c.relrowsecurity, e.table_name || ' RLS enabled')
  from expected_tables e join pg_class c on c.oid = format('%I.%I', e.schema_name, e.table_name)::regclass;
-- 2C deliberately supersedes absent app ACL/policy baseline; exact inventory is
-- tested in 04_authorization_inventory, without weakening structural invariants.
select ok(not has_table_privilege(r.role_name, format('%I.%I', e.schema_name, e.table_name),
  'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'), e.table_name || ' no grants to ' || r.role_name)
  from expected_tables e cross join (values ('service_role')) r(role_name);
select ok(not has_schema_privilege(r, 'private', 'USAGE,CREATE'), 'Private has no app privileges: ' || r)
  from unnest(array['anon','service_role']) r;
select is((select count(*) from information_schema.columns c join expected_tables e
  on c.table_schema=e.schema_name and c.table_name=e.table_name
  where c.is_nullable='YES' and c.column_name not in ('display_name','description','image_path','image_alt')),
  0::bigint, 'Only approved optional fields are nullable');
select col_is_null('public','profiles','display_name','Display name nullable');
select col_is_null('public','menu_items','description','Description nullable');
select col_is_null('public','menu_items','image_path','Image path nullable');
select col_is_null('public','menu_items','image_alt','Image alt nullable');
select col_type_is('public','menu_items','price_amount','numeric(14,2)','Price exact numeric type');
select col_type_is('public','loyalty_settings','currency_per_point','numeric(14,2)','Divisor exact numeric type');
select col_type_is('public','business_memberships','role','text','Role text, not enum');
select col_hasnt_default('public','menu_items','price_amount','Price has no default');
select col_default_is('public','loyalty_settings','currency_per_point','1000.00','Divisor default');
select col_default_is('public','loyalty_settings','points_enabled','true','Points enabled default');
select col_default_is('public','menu_items','image_presentation','photo','Photo default');
select col_default_is('public','menu_items','is_available','true','Availability default');
select col_default_is('public','menu_items','is_featured','false','Featured default');
select col_default_is('public','menu_items','is_active','true','Item active default');
select col_default_is('public','businesses','is_active','true','Business active default');
select col_default_is('public','menu_categories','is_active','true','Category active default');
select col_default_is('public','menu_items','display_order','0','Item order default');
select col_default_is('public','menu_categories','display_order','0','Category order default');
select is((select count(*) from information_schema.columns c join expected_tables e
  on c.table_schema=e.schema_name and c.table_name=e.table_name
  where c.column_name in ('created_at','updated_at') and c.data_type='timestamp with time zone'
    and c.is_nullable='NO' and c.column_default='now()'), 12::bigint, '12 DB timestamp defaults');
select ok((select column_default like '%gen_random_uuid()%' from information_schema.columns
  where table_schema='public' and table_name=t and column_name='id'), t || ' DB UUID default')
  from unnest(array['businesses','menu_categories','menu_items']) t;

-- Verify both endpoints, column order and explicit delete/update actions of EVERY FK.
create temporary table expected_fks (constraint_name text, source_table text, source_cols text[], target_schema text, target_table text, target_cols text[], delete_action text);
insert into expected_fks values
  ('profiles_auth_user_fkey','profiles',array['id'],'auth','users',array['id'],'c'),
  ('business_memberships_business_fkey','business_memberships',array['business_id'],'public','businesses',array['id'],'r'),
  ('business_memberships_profile_fkey','business_memberships',array['user_id'],'public','profiles',array['id'],'c'),
  ('platform_admins_auth_user_fkey','platform_admins',array['user_id'],'auth','users',array['id'],'c'),
  ('loyalty_settings_business_fkey','loyalty_settings',array['business_id'],'public','businesses',array['id'],'r'),
  ('menu_categories_business_fkey','menu_categories',array['business_id'],'public','businesses',array['id'],'r'),
  ('menu_items_business_fkey','menu_items',array['business_id'],'public','businesses',array['id'],'r'),
  ('menu_items_business_category_fkey','menu_items',array['business_id','category_id'],'public','menu_categories',array['business_id','id'],'r');
select fk_ok(case when source_table='platform_admins' then 'private' else 'public' end,
  source_table, source_cols, target_schema, target_table, target_cols, constraint_name || ' correct endpoints') from expected_fks;
select is((select c.confdeltype::text || c.confupdtype::text from pg_constraint c
  where c.conname=e.constraint_name and c.conrelid=format('%I.%I',
    case when e.source_table='platform_admins' then 'private' else 'public' end, e.source_table)::regclass),
  e.delete_action || 'r', e.constraint_name || ' exact actions') from expected_fks e;
select is((select count(*) from pg_constraint c join expected_tables e
  on c.conrelid=format('%I.%I',e.schema_name,e.table_name)::regclass where c.contype='f'), 8::bigint, 'Exactly eight FKs');
select has_index('public','business_memberships','business_memberships_user_business_idx','Inverse membership index');
select has_index('public','menu_categories','menu_categories_business_order_idx','Category read index');
select has_index('public','menu_items','menu_items_business_category_order_idx','Item read index');
select ok((select pg_get_indexdef(indexrelid) like '%(user_id, business_id)%' from pg_index
  where indexrelid='public.business_memberships_user_business_idx'::regclass), 'Membership inverse index order');
select ok((select pg_get_indexdef(indexrelid) like '%(business_id, display_order, id)%' from pg_index
  where indexrelid='public.menu_categories_business_order_idx'::regclass), 'Category read index order');
select ok((select pg_get_indexdef(indexrelid) like '%(business_id, category_id, display_order, id)%' from pg_index
  where indexrelid='public.menu_items_business_category_order_idx'::regclass), 'Item read/FK index order');
select has_unique('public','businesses','Business UNIQUE');
select has_unique('public','menu_categories','Category UNIQUE');
select is((select count(*) from pg_constraint where conrelid='public.menu_items'::regclass and contype='u'),
  0::bigint, 'Items have no UNIQUE name');
select is((select count(*) from pg_constraint c join expected_tables e
  on c.conrelid=format('%I.%I',e.schema_name,e.table_name)::regclass where c.contype='c'), 17::bigint, '17 native named CHECKs');

select has_trigger('auth','users','on_auth_user_created','Auth signup trigger');
select triggers_are('public',t,array[t || '_set_updated_at'])
  from unnest(array['businesses','profiles','loyalty_settings','menu_categories','menu_items']) t;
select triggers_are('public','business_memberships',array[]::text[]);
select triggers_are('private','platform_admins',array[]::text[]);
select function_returns('private','create_profile_for_auth_user',array[]::text[],'trigger');
select is_definer('private','create_profile_for_auth_user',array[]::text[]);
select isnt_definer('private','set_updated_at',array[]::text[]);
select is(pg_get_userbyid(proowner),'postgres','Safe owner: ' || proname)
  from pg_proc where oid in ('private.create_profile_for_auth_user()'::regprocedure,'private.set_updated_at()'::regprocedure);
select is(array_to_string(proconfig,','),'search_path=""','Empty search path: ' || proname)
  from pg_proc where oid in ('private.create_profile_for_auth_user()'::regprocedure,'private.set_updated_at()'::regprocedure);
select ok(not has_function_privilege(r, 'private.' || f || '()', 'EXECUTE'), 'No direct EXECUTE: ' || r || '/' || f)
  from unnest(array['anon','authenticated','service_role','supabase_auth_admin']) r
  cross join unnest(array['create_profile_for_auth_user','set_updated_at']) f;
select * from finish();
rollback;
