-- Task 2C correction: every business-scoped application write needs an active
-- tenant AND current membership. Keep read policies, helpers and ACLs unchanged.
-- Forward-only: do not edit the applied foundation/authorization migrations.
begin;

alter policy business_admin_insert on public.menu_categories
  with check (private.is_business_admin(business_id) and exists (
    select 1 from public.businesses as business
    where business.id = menu_categories.business_id and business.is_active
  ));
alter policy business_admin_update on public.menu_categories
  using (private.is_business_admin(business_id) and exists (
    select 1 from public.businesses as business
    where business.id = menu_categories.business_id and business.is_active
  ))
  with check (private.is_business_admin(business_id) and exists (
    select 1 from public.businesses as business
    where business.id = menu_categories.business_id and business.is_active
  ));

alter policy business_admin_insert on public.menu_items
  with check (private.is_business_admin(business_id) and exists (
    select 1 from public.businesses as business
    where business.id = menu_items.business_id and business.is_active
  ));
alter policy business_admin_update on public.menu_items
  using (private.is_business_admin(business_id) and exists (
    select 1 from public.businesses as business
    where business.id = menu_items.business_id and business.is_active
  ))
  with check (private.is_business_admin(business_id) and exists (
    select 1 from public.businesses as business
    where business.id = menu_items.business_id and business.is_active
  ));

commit;
