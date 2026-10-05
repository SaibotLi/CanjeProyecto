-- DEV-ONLY / LOCAL. NOT Valhalla's real menu or a production/pilot import.
-- Mock Budweiser/Fernet prices/presentations are unconfirmed; do not copy them.
-- Stable synthetic UUIDs. No users, credentials, platform authority or test tenant.
-- Repeat is a no-op: never overwrite local edits. A reset restores these defaults.
begin;
insert into public.businesses (id, slug, name, currency_code, timezone)
values ('a11a0000-0000-4000-8000-000000000001', 'valhalla-space', 'Valhalla Space',
  'ARS', 'America/Argentina/Buenos_Aires') on conflict (id) do nothing;

insert into public.loyalty_settings (business_id, currency_per_point, points_enabled)
values ('a11a0000-0000-4000-8000-000000000001', 1000.00, true)
on conflict (business_id) do nothing;

insert into public.menu_categories (id, business_id, name, slug, display_order) values
  ('ca110000-0000-4000-8000-000000000001', 'a11a0000-0000-4000-8000-000000000001', 'Cervezas', 'cervezas', 10),
  ('ca110000-0000-4000-8000-000000000002', 'a11a0000-0000-4000-8000-000000000001', 'Tragos', 'tragos', 20),
  ('ca110000-0000-4000-8000-000000000003', 'a11a0000-0000-4000-8000-000000000001', 'Vinos / Espumantes', 'vinos-espumantes', 30),
  ('ca110000-0000-4000-8000-000000000004', 'a11a0000-0000-4000-8000-000000000001', 'Sin alcohol', 'sin-alcohol', 40)
on conflict (id) do nothing;

-- Image paths intentionally NULL: there is no bucket/asset uploaded in Task 2B.
insert into public.menu_items
  (id, business_id, category_id, name, description, price_amount, is_available, is_featured, display_order)
values
  ('1de00000-0000-4000-8000-000000000001', 'a11a0000-0000-4000-8000-000000000001', 'ca110000-0000-4000-8000-000000000001', 'Cerveza demo', 'DEMO: lata 473 ml; precio ficticio.', 4000.00, true, false, 10),
  ('1de00000-0000-4000-8000-000000000002', 'a11a0000-0000-4000-8000-000000000001', 'ca110000-0000-4000-8000-000000000001', 'Cerveza demo agotada', 'DEMO: estado agotado, no stock real.', 6500.50, false, false, 20),
  ('1de00000-0000-4000-8000-000000000003', 'a11a0000-0000-4000-8000-000000000001', 'ca110000-0000-4000-8000-000000000002', 'Trago demo destacado', 'DEMO: composición y precio ficticios.', 12000.00, true, true, 10),
  ('1de00000-0000-4000-8000-000000000004', 'a11a0000-0000-4000-8000-000000000001', 'ca110000-0000-4000-8000-000000000003', 'Vino demo', 'DEMO: copa; no corresponde a la carta real.', 5500.00, true, false, 10),
  ('1de00000-0000-4000-8000-000000000005', 'a11a0000-0000-4000-8000-000000000001', 'ca110000-0000-4000-8000-000000000004', 'Bebida sin alcohol demo', 'DEMO: fallback sin imagen y precio ficticio.', 2500.00, true, false, 10)
on conflict (id) do nothing;
commit;
