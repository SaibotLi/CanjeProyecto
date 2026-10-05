begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();
\ir ../fixtures/catalog.sql

select is((select count(*) from public.businesses),3::bigint,'Fixtures add only two test tenants');
select is((select count(*) from public.menu_items where not is_active),1::bigint,'Inactive item fixture');
select is((select count(*) from public.menu_categories where not is_active),1::bigint,'Inactive category fixture');
select is((select count(*) from public.businesses where not is_active),1::bigint,'Inactive business fixture');
select ok((select not is_available and is_active from public.menu_items where id='1fb00000-0000-4000-8000-000000000002'),'Unavailable is independent of active');
select ok((select image_path is null from public.menu_items where id='1fb00000-0000-4000-8000-000000000003'),'Imageless fixture');

select throws_ok($$insert into public.businesses (slug,name,timezone) values ('valhalla-space','Duplicate','UTC')$$,'23505',null,'Business slug globally unique');
select throws_ok(format('insert into public.businesses (slug,name,timezone) values (%L,%L,%L)', s,'Test','UTC'),
  '23514',null,'Noncanonical slug rejected: ' || s)
  from unnest(array['UPPER','with space','-leading','trailing-','double--dash','',E'newline\n',repeat('a',81)]) s;
select throws_ok($$insert into public.businesses (slug,name,timezone) values ('blank-name','   ','UTC')$$,'23514',null,'Blank business name');
select throws_ok($$insert into public.businesses (slug,name,timezone) values ('blank-zone','Test','')$$,'23514',null,'Empty timezone');
select throws_ok($$insert into public.businesses (slug,name,timezone,currency_code) values ('usd-test','Test','UTC','USD')$$,'23514',null,'Only ARS initially');
select throws_ok($$insert into public.profiles(id) values ('deaf0000-0000-4000-8000-000000000001')$$,'23503',null,'Profile requires Auth user');
select throws_ok($$insert into private.platform_admins(user_id) values ('deaf0000-0000-4000-8000-000000000001')$$,'23503',null,'Platform authority requires Auth user');
select throws_ok($$insert into public.loyalty_settings(business_id) values ('a11a0000-0000-4000-8000-000000000001')$$,'23505',null,'Settings at most one per tenant');
select throws_ok($$insert into public.menu_categories(business_id,name,slug) values ('a11a0000-0000-4000-8000-000000000001','Duplicate','cervezas')$$,'23505',null,'Category slug unique per business');
select is((select count(*) from public.menu_categories where slug='cervezas'),2::bigint,'Same category slug permitted across tenants');
select throws_ok($$update public.menu_categories set slug='Not Canonical' where id='ca110000-0000-4000-8000-000000000001'$$,'23514',null,'Category slug CHECK');
select throws_ok($$update public.menu_categories set name=E'\t\n' where id='ca110000-0000-4000-8000-000000000001'$$,'23514',null,'Whitespace-only category name');
select throws_ok($$update public.menu_categories set display_order=-1 where id='ca110000-0000-4000-8000-000000000001'$$,'23514',null,'Category negative order');
select throws_ok($$update public.menu_items set display_order=-1 where id='1de00000-0000-4000-8000-000000000001'$$,'23514',null,'Item negative order');
select throws_ok($$update public.menu_items set name=' ' where id='1de00000-0000-4000-8000-000000000001'$$,'23514',null,'Blank item name');
select throws_ok($$update public.menu_items set description=repeat('a',2001) where id='1de00000-0000-4000-8000-000000000001'$$,'23514',null,'Description limit');
select throws_ok($$update public.menu_items set image_alt=' ' where id='1de00000-0000-4000-8000-000000000001'$$,'23514',null,'Blank image alt');
select throws_ok($$update public.menu_items set image_presentation='svg' where id='1de00000-0000-4000-8000-000000000001'$$,'23514',null,'Presentation limited to photo/cutout');
select lives_ok($$update public.menu_items set image_presentation='cutout' where id='1de00000-0000-4000-8000-000000000001'$$,'Cutout accepted');
select throws_ok($$insert into public.menu_items(business_id,category_id,name) values ('a11a0000-0000-4000-8000-000000000001','ca110000-0000-4000-8000-000000000001','Missing price')$$,'23502',null,'No default free product');
select lives_ok($$insert into public.menu_items(business_id,category_id,name,price_amount) values ('a11a0000-0000-4000-8000-000000000001','ca110000-0000-4000-8000-000000000001','Cerveza demo',0)$$,'Duplicate names and explicit zero permitted');
select is((select count(*) from public.menu_items where name='Cerveza demo'),2::bigint,'Duplicate name persisted');
select ok((select id is not null and is_available and not is_featured and is_active and display_order=0 and image_presentation='photo'
  from public.menu_items where name='Cerveza demo' and price_amount=0),'UUID and item defaults applied');

select throws_ok($$update public.menu_items set category_id='cb220000-0000-4000-8000-000000000001' where id='1de00000-0000-4000-8000-000000000001'$$,
  '23503',null,'Privileged postgres cannot link Valhalla item to Business B category');
select is((select category_id::text from public.menu_items where id='1de00000-0000-4000-8000-000000000001'),
  'ca110000-0000-4000-8000-000000000001','Failed cross-business mutation leaves category unchanged');
select throws_ok($$delete from public.businesses where id='a11a0000-0000-4000-8000-000000000001'$$,'23503',null,'Business deletion restricted');
select throws_ok($$delete from public.menu_categories where id='ca110000-0000-4000-8000-000000000001'$$,'23503',null,'Category with items restricted');
select is((select count(*) from public.businesses where id='a11a0000-0000-4000-8000-000000000001'),1::bigint,'Restricted business still exists');

select lives_ok(format('update public.menu_items set price_amount=%L where id=%L',n,'1de00000-0000-4000-8000-000000000001'),'Valid price: '||n)
  from unnest(array['0','0.01','6000.00','999999999999.99']) n;
select throws_ok(format('update public.menu_items set price_amount=%L where id=%L',n,'1de00000-0000-4000-8000-000000000001'),
  case when n in ('Infinity','-Infinity','1000000000000') then '22003' else '23514' end,null,'Invalid price: '||n)
  from unnest(array['-0.01','NaN','Infinity','-Infinity','1000000000000']) n;
select lives_ok(format('update public.loyalty_settings set currency_per_point=%L where business_id=%L',n,'a11a0000-0000-4000-8000-000000000001'),'Valid divisor: '||n)
  from unnest(array['0.01','1000.00','999999999999.99']) n;
select throws_ok(format('update public.loyalty_settings set currency_per_point=%L where business_id=%L',n,'a11a0000-0000-4000-8000-000000000001'),
  case when n in ('Infinity','-Infinity','1000000000000') then '22003' else '23514' end,null,'Invalid divisor: '||n)
  from unnest(array['0','-0.01','NaN','Infinity','-Infinity','1000000000000']) n;
select lives_ok($$update public.menu_items set price_amount=6000.005 where id='1de00000-0000-4000-8000-000000000001'$$,'NUMERIC scale rounds input by PostgreSQL semantics');
select is((select price_amount from public.menu_items where id='1de00000-0000-4000-8000-000000000001'),6000.01::numeric,'Scale rounding documented, not economic logic');

-- \\A/\\Z + C collation: exercise actual CHECK, including alpha-containing UUIDs.
select lives_ok($$update public.menu_items set image_path=null where id='1de00000-0000-4000-8000-000000000001'$$,'NULL path allowed');
select lives_ok(format('update public.menu_items set image_path=%L where id=%L',
  'a11a0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.'||ext,
  '1de00000-0000-4000-8000-000000000001'),'Own canonical path: '||ext)
  from unnest(array['jpg','jpeg','png','webp','avif']) ext;
select throws_ok(format('update public.menu_items set image_path=%L where id=%L',p,'1de00000-0000-4000-8000-000000000001'),
  '23514','new row for relation "menu_items" violates check constraint "menu_items_image_path_check"','Invalid image path: '||label)
from (values
  ('foreign tenant','b22b0000-0000-4000-8000-000000000002/abcdef00-0000-4000-8000-000000000001.png'),
  ('URL','https://example.test/a11a0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.png'),
  ('upper business','A11A0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.png'),
  ('upper asset','a11a0000-0000-4000-8000-000000000001/ABCDEF00-0000-4000-8000-000000000001.png'),
  ('traversal','a11a0000-0000-4000-8000-000000000001/../abcdef00-0000-4000-8000-000000000001.png'),
  ('extra slash','a11a0000-0000-4000-8000-000000000001//abcdef00-0000-4000-8000-000000000001.png'),
  ('subdirectory','a11a0000-0000-4000-8000-000000000001/x/abcdef00-0000-4000-8000-000000000001.png'),
  ('query','a11a0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.png?x=1'),
  ('fragment','a11a0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.png#x'),
  ('newline',E'a11a0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.png\n'),
  ('space','a11a0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.png '),
  ('wrong extension','a11a0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.gif'),
  ('double extension','a11a0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.jpg.png'),
  ('uppercase extension','a11a0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.PNG'),
  ('empty',''),
  ('UUID without hyphens','a11a0000-0000-4000-8000-000000000001/abcdef00000040008000000000000001.png')
) invalid(label,p);
select is((select image_path from public.menu_items where id='1de00000-0000-4000-8000-000000000001'),
  'a11a0000-0000-4000-8000-000000000001/abcdef00-0000-4000-8000-000000000001.avif','Rejected paths leave last valid value');

-- now() is transaction-stable; insert an old timestamp instead of sleeping.
insert into public.businesses (id,slug,name,timezone,updated_at)
  values ('d44d0000-0000-4000-8000-000000000004','timestamp-test','Test','UTC','2000-01-01');
update public.businesses set name='Updated', updated_at='1900-01-01' where id='d44d0000-0000-4000-8000-000000000004';
select is((select updated_at from public.businesses where id='d44d0000-0000-4000-8000-000000000004'),now(),'UPDATE timestamp overrides supplied value');
select ok((select created_at=now() and updated_at>='2000-01-01' from public.businesses where id='d44d0000-0000-4000-8000-000000000004'),'DB created_at and changed updated_at');
select * from finish();
rollback;
