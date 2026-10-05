-- A-S2-006: self-scoped capability, not an assurance check or global access.
-- Keep private unexposed and reuse its existing INVOKER membership helper.
begin;

create function public.is_current_user_platform_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_platform_admin();
$$;

revoke all on function public.is_current_user_platform_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_current_user_platform_admin() to authenticated;

comment on function public.is_current_user_platform_admin() is
  'Current caller Platform membership only. Does not check AAL2 or grant global access; global RLS remains authoritative.';

commit;
