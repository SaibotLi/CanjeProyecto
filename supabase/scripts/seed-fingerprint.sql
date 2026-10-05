-- Read-only logical-state checksum. DB timestamps intentionally differ on reset.
select pg_catalog.md5(jsonb_build_object(
  'businesses',(select jsonb_agg(to_jsonb(t)-'created_at'-'updated_at' order by id) from public.businesses t),
  'settings',(select jsonb_agg(to_jsonb(t)-'created_at'-'updated_at' order by business_id) from public.loyalty_settings t),
  'categories',(select jsonb_agg(to_jsonb(t)-'created_at'-'updated_at' order by id) from public.menu_categories t),
  'items',(select jsonb_agg(to_jsonb(t)-'created_at'-'updated_at' order by id) from public.menu_items t)
)::text);
