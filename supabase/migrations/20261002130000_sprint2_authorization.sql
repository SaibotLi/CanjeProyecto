-- Task 2C. Additive, LOCAL-validated authorization. No fixtures or Storage.
-- Contract: docs/TASK_2C_AUTHORIZATION_PLAN.md. Never edit applied foundation.
begin;

create function private.is_business_admin(target_business_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.business_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.business_id = target_business_id
      and membership.role = 'admin'
  );
$$;
create function private.is_platform_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from private.platform_admins as administrator
    where administrator.user_id = (select auth.uid())
  );
$$;
alter function private.is_business_admin(uuid) owner to postgres;
alter function private.is_platform_admin() owner to postgres;
revoke all on function private.is_business_admin(uuid), private.is_platform_admin()
  from public, anon, authenticated, service_role;
grant execute on function private.is_business_admin(uuid), private.is_platform_admin()
  to authenticated;

revoke create on schema public from public, anon, authenticated;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;
revoke all on table public.businesses, public.profiles, public.business_memberships,
  public.loyalty_settings, public.menu_categories, public.menu_items,
  private.platform_admins from public, anon, authenticated, service_role;

grant select on public.businesses, public.loyalty_settings, public.menu_categories,
  public.menu_items to anon, authenticated;
grant select on public.profiles, public.business_memberships to authenticated;
grant select (user_id) on private.platform_admins to authenticated;
grant update (name) on public.businesses to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant update (currency_per_point, points_enabled) on public.loyalty_settings to authenticated;
grant insert (business_id, name, slug, display_order, is_active)
  on public.menu_categories to authenticated;
grant update (name, slug, display_order, is_active) on public.menu_categories to authenticated;
grant insert (business_id, category_id, name, description, price_amount, image_path,
  image_alt, image_presentation, is_available, is_featured, is_active, display_order)
  on public.menu_items to authenticated;
grant update (category_id, name, description, price_amount, image_path, image_alt,
  image_presentation, is_available, is_featured, is_active, display_order)
  on public.menu_items to authenticated;

-- Self-only base predicate: must NOT call is_platform_admin (no recursion).
create policy self_read on private.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));
create policy self_read on public.business_memberships for select to authenticated
  using (user_id = (select auth.uid()));
create policy platform_admin_read on public.business_memberships for select to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2' and (select private.is_platform_admin()));
create policy self_read on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy self_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy platform_admin_read on public.profiles for select to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2' and (select private.is_platform_admin()));

-- Public expressions do not call helpers. All admin policies target authenticated.
create policy public_read on public.businesses for select to anon, authenticated
  using (is_active);
create policy business_admin_read on public.businesses for select to authenticated
  using (private.is_business_admin(id));
create policy business_admin_update on public.businesses for update to authenticated
  using (is_active and private.is_business_admin(id))
  with check (is_active and private.is_business_admin(id));
create policy platform_admin_read on public.businesses for select to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2' and (select private.is_platform_admin()));

create policy public_read on public.loyalty_settings for select to anon, authenticated
  using (exists (select 1 from public.businesses as business
    where business.id = loyalty_settings.business_id and business.is_active));
create policy business_admin_read on public.loyalty_settings for select to authenticated
  using (private.is_business_admin(business_id));
create policy business_admin_update on public.loyalty_settings for update to authenticated
  using (private.is_business_admin(business_id) and exists (select 1 from public.businesses as business
    where business.id = loyalty_settings.business_id and business.is_active))
  with check (private.is_business_admin(business_id) and exists (select 1 from public.businesses as business
    where business.id = loyalty_settings.business_id and business.is_active));
create policy platform_admin_read on public.loyalty_settings for select to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2' and (select private.is_platform_admin()));

create policy public_read on public.menu_categories for select to anon, authenticated
  using (is_active and exists (select 1 from public.businesses as business
    where business.id = menu_categories.business_id and business.is_active));
create policy business_admin_read on public.menu_categories for select to authenticated
  using (private.is_business_admin(business_id));
create policy business_admin_insert on public.menu_categories for insert to authenticated
  with check (private.is_business_admin(business_id));
create policy business_admin_update on public.menu_categories for update to authenticated
  using (private.is_business_admin(business_id)) with check (private.is_business_admin(business_id));
create policy platform_admin_read on public.menu_categories for select to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2' and (select private.is_platform_admin()));

create policy public_read on public.menu_items for select to anon, authenticated
  using (is_active and exists (select 1 from public.businesses as business
    where business.id = menu_items.business_id and business.is_active)
    and exists (select 1 from public.menu_categories as category
      where category.id = menu_items.category_id
        and category.business_id = menu_items.business_id and category.is_active));
create policy business_admin_read on public.menu_items for select to authenticated
  using (private.is_business_admin(business_id));
create policy business_admin_insert on public.menu_items for insert to authenticated
  with check (private.is_business_admin(business_id));
create policy business_admin_update on public.menu_items for update to authenticated
  using (private.is_business_admin(business_id)) with check (private.is_business_admin(business_id));
create policy platform_admin_read on public.menu_items for select to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2' and (select private.is_platform_admin()));
comment on table private.platform_admins is
  'DB-only authority, no Data API. Authenticated SELECT(user_id) own row for INVOKER helper; global public reads also require signed AAL2. No app writes.';
commit;
