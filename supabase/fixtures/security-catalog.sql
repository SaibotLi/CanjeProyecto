-- Task 2C only. Applied by guarded REST setup, never normal seed/config.
insert into public.menu_categories (id,business_id,name,slug) values
  ('cc330000-0000-4000-8000-000000000001','c33c0000-0000-4000-8000-000000000003','Inactive business category TEST','test');
insert into public.menu_items (id,business_id,category_id,name,price_amount) values
  ('1fb00000-0000-4000-8000-000000000004','b22b0000-0000-4000-8000-000000000002','cb220000-0000-4000-8000-000000000002','Active under inactive category TEST',1000),
  ('1fc00000-0000-4000-8000-000000000001','c33c0000-0000-4000-8000-000000000003','cc330000-0000-4000-8000-000000000001','Inactive business product TEST',1000);
