-- TEST-ONLY. Include inside a pgTAP transaction; rollback at the end.
-- Never referenced by config.toml or normal seed.sql.
insert into public.businesses (id, slug, name, timezone, is_active) values
  ('b22b0000-0000-4000-8000-000000000002', 'business-b-test', 'Business B TEST', 'UTC', true),
  ('c33c0000-0000-4000-8000-000000000003', 'inactive-business-test', 'Inactive TEST', 'UTC', false);
insert into public.loyalty_settings (business_id) values
  ('b22b0000-0000-4000-8000-000000000002'), ('c33c0000-0000-4000-8000-000000000003');
insert into public.menu_categories (id, business_id, name, slug, is_active) values
  ('cb220000-0000-4000-8000-000000000001', 'b22b0000-0000-4000-8000-000000000002', 'B category TEST', 'cervezas', true),
  ('cb220000-0000-4000-8000-000000000002', 'b22b0000-0000-4000-8000-000000000002', 'Inactive category TEST', 'inactive', false);
insert into public.menu_items (id, business_id, category_id, name, price_amount, is_active, is_available) values
  ('1fb00000-0000-4000-8000-000000000001', 'b22b0000-0000-4000-8000-000000000002', 'cb220000-0000-4000-8000-000000000001', 'Inactive product TEST', 1000.00, false, true),
  ('1fb00000-0000-4000-8000-000000000002', 'b22b0000-0000-4000-8000-000000000002', 'cb220000-0000-4000-8000-000000000001', 'Unavailable product TEST', 1000.00, true, false),
  ('1fb00000-0000-4000-8000-000000000003', 'b22b0000-0000-4000-8000-000000000002', 'cb220000-0000-4000-8000-000000000001', 'Imageless product TEST', 1000.00, true, true);
