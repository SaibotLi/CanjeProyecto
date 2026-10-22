-- SaaS 3E. LOCAL first. No billing, public provisioning or global Platform writes.
begin;

-- These names belong to the platform router, not to a tenant. Existing slugs stay stable.
alter table public.businesses add constraint businesses_reserved_slug_check check (
  slug not in ('admin','api','assets','auth','billing','contact','contacto','icons','login',
    'negocios','onboarding','planes','platform','points','precios','pricing','privacidad',
    'profile','register','rewards','settings','terms','www','operar'));

create table public.business_entitlements (
  business_id uuid primary key references public.businesses(id) on update restrict on delete restrict,
  loyalty_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.business_entitlements is
  'Effective commercial capabilities, assigned only by trusted provisioning. Not billing or operational loyalty_settings. Menu is the base service; inactive business controls publication.';

create table public.business_presentation (
  business_id uuid primary key references public.businesses(id) on update restrict on delete restrict,
  tagline text not null default '' check (char_length(tagline) <= 160),
  description text not null default '' check (char_length(description) <= 1000),
  city text not null default '' check (char_length(city) <= 100),
  region text not null default '' check (char_length(region) <= 100),
  country_code text not null default 'AR' check (country_code collate "C" ~ '^[A-Z]{2}$'),
  address text not null default '' check (char_length(address) <= 240),
  contact_phone text not null default '' check (char_length(contact_phone) <= 40 and contact_phone ~ '^[+0-9() .-]*$'),
  instagram_handle text not null default '' check (instagram_handle collate "C" ~ '^[A-Za-z0-9._]{0,30}$'),
  website_url text not null default '' check (website_url = '' or
    (char_length(website_url) <= 2048 and website_url collate "C" ~ '^https://[^[:space:]@]+$')),
  template text not null default 'night' check (template in ('night','light','warm')),
  accent text not null default 'amber' check (accent in ('amber','teal','rose','blue')),
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_presentation_logo_path_check check (logo_path is null or
    (char_length(logo_path) in (77,78) and logo_path collate "C" ~
      (E'\\A' || business_id::text || E'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|jpeg|png|webp|avif)\\Z')))
);
alter table public.business_entitlements enable row level security;
alter table public.business_presentation enable row level security;
revoke all on public.business_entitlements, public.business_presentation from public, anon, authenticated, service_role;
grant select on public.business_entitlements, public.business_presentation to anon, authenticated;
grant update (tagline,description,city,region,country_code,address,contact_phone,instagram_handle,
  website_url,template,accent,logo_path) on public.business_presentation to authenticated;

create policy public_read on public.business_entitlements for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id=business_id and b.is_active));
create policy member_read on public.business_entitlements for select to authenticated
  using (private.is_business_admin(business_id) or private.is_business_staff(business_id));
create policy platform_admin_read on public.business_entitlements for select to authenticated
  using ((select auth.jwt()->>'aal')='aal2' and (select private.is_platform_admin()));
create policy public_read on public.business_presentation for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id=business_id and b.is_active));
create policy member_read on public.business_presentation for select to authenticated
  using (private.is_business_admin(business_id) or private.is_business_staff(business_id));
create policy platform_admin_read on public.business_presentation for select to authenticated
  using ((select auth.jwt()->>'aal')='aal2' and (select private.is_platform_admin()));
create policy business_admin_update on public.business_presentation for update to authenticated
  using (private.is_business_admin(business_id) and exists (select 1 from public.businesses b where b.id=business_id and b.is_active))
  with check (private.is_business_admin(business_id) and exists (select 1 from public.businesses b where b.id=business_id and b.is_active));

create trigger business_entitlements_set_updated_at before update on public.business_entitlements
  for each row execute function private.set_updated_at();
create trigger business_presentation_set_updated_at before update on public.business_presentation
  for each row execute function private.set_updated_at();

-- Preserve existing Sprint 3 behaviour for ALL existing businesses, never by a hardcoded UUID.
insert into public.business_entitlements(business_id,loyalty_enabled) select id,true from public.businesses;
insert into public.business_presentation(business_id) select id from public.businesses;

-- Default-deny capabilities for future businesses. Provisioning fills presentation/settings
-- explicitly in the same transaction; ordinary INSERTs cannot silently grant a subscription.
create function private.initialize_business_configuration()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  insert into public.business_entitlements(business_id) values (new.id);
  insert into public.business_presentation(business_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.initialize_business_configuration() from public,anon,authenticated,service_role;
create trigger businesses_initialize_configuration after insert on public.businesses
  for each row execute function private.initialize_business_configuration();

-- The only provisioning primitive is owner-only and not exposed through Data API.
-- A future trusted signup/billing workflow can call this same atomic primitive.
-- The future server must derive owner_user_id from verified identity, never an untrusted form.
create function private.provision_business(owner_user_id uuid, business_name text, business_slug text,
  with_loyalty boolean default false, business_timezone text default 'America/Argentina/Cordoba')
returns uuid language plpgsql security invoker set search_path='' as $$
declare created_business_id uuid;
begin
  if with_loyalty is null or not exists (select 1 from auth.users u join public.profiles p on p.id=u.id
    where u.id=owner_user_id and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= now())) then
    raise exception using errcode='PT400',message='confirmed_owner_required';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name=business_timezone) then
    raise exception using errcode='PT400',message='invalid_business_timezone';
  end if;
  insert into public.businesses(name,slug,timezone) values (business_name,business_slug,business_timezone) returning id into created_business_id;
  update public.business_entitlements e set loyalty_enabled=with_loyalty where e.business_id=created_business_id;
  insert into public.loyalty_settings(business_id,points_enabled) values (created_business_id,with_loyalty);
  insert into public.business_memberships(business_id,user_id,role) values (created_business_id,owner_user_id,'admin');
  return created_business_id;
end;
$$;
revoke all on function private.provision_business(uuid,text,text,boolean,text) from public,anon,authenticated,service_role;

-- Called only from the existing economic DEFINER functions. The row lock serializes
-- new operations against entitlement revocation. Historical receipt recovery/read stays available.
create function private.require_loyalty_entitlement(target_business uuid, lock_row boolean)
returns void language plpgsql volatile security invoker set search_path='' as $$
declare enabled boolean;
begin
  if lock_row then
    select e.loyalty_enabled into enabled from public.business_entitlements e where e.business_id=target_business for share;
  else
    select e.loyalty_enabled into enabled from public.business_entitlements e where e.business_id=target_business;
  end if;
  if enabled is distinct from true then raise exception using errcode='PT403',message='loyalty_not_contracted'; end if;
end;
$$;
revoke all on function private.require_loyalty_entitlement(uuid,boolean) from public,anon,authenticated,service_role;

-- Economic function replacements follow; existing contracts preserved.
create or replace function private.lookup_loyalty_customer(business_id uuid, customer_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare code text; customer record;
begin
  perform private.loyalty_operator(business_id,false,false);
  if not exists (select 1 from public.businesses b where b.id = business_id and b.is_active) then
    raise exception using errcode = 'PT403', message = 'business_inactive';
  end if;
  perform private.require_loyalty_entitlement(business_id,false);
  code := private.normalize_customer_code(customer_code);
  select p.customer_code,p.display_name into customer from public.profiles p join auth.users u on u.id=p.id
    where p.customer_code=code and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= pg_catalog.now());
  if not found then raise exception using errcode = 'PT404', message = 'customer_unavailable'; end if;
  return pg_catalog.jsonb_build_object('customer_code',customer.customer_code,'display_name',customer.display_name);
end;
$$;

create or replace function private.credit_points(business_id uuid, customer_code text, paid_amount jsonb, request_id uuid, reference text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); operator_role text; code text; amount numeric; ref text;
  customer uuid; active boolean; rule record; existing public.point_transactions; result public.point_transactions;
begin
  operator_role := private.loyalty_operator(business_id,false,true);
  select b.is_active into active from public.businesses b where b.id=business_id for share;
  code := private.normalize_customer_code(customer_code); amount := private.parse_paid_amount(paid_amount);
  ref := nullif(pg_catalog.btrim(reference),'');
  if request_id is null or (ref is not null and char_length(ref)>120) then
    raise exception using errcode = 'PT400', message = 'invalid_request_or_reference';
  end if;
  select t.* into existing from public.point_transactions t where t.business_id=credit_points.business_id and t.request_id=credit_points.request_id;
  if found then
    if existing.entry_type <> 'credit' or existing.actor_id <> actor or existing.customer_code <> code
      or existing.paid_amount <> amount or existing.reference is distinct from ref then
      raise exception using errcode = 'PT409', message = 'idempotency_conflict';
    end if;
    return private.loyalty_receipt(existing);
  end if;
  perform private.require_loyalty_entitlement(business_id,true);
  if active is distinct from true then raise exception using errcode = 'PT403', message = 'business_inactive'; end if;
  select s.currency_per_point,s.points_enabled into rule from public.loyalty_settings s where s.business_id=credit_points.business_id for share;
  if not found or not rule.points_enabled then raise exception using errcode = 'PT403', message = 'points_disabled_or_unconfigured'; end if;
  select p.id into customer from public.profiles p join auth.users u on u.id=p.id where p.customer_code=code
    and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= pg_catalog.now()) for key share of p;
  if not found then raise exception using errcode = 'PT404', message = 'customer_unavailable'; end if;
  if customer=actor then raise exception using errcode = 'PT403', message = 'self_credit_denied'; end if;
  insert into public.point_transactions (business_id,customer_id,customer_code,actor_id,actor_role,entry_type,
    paid_amount,currency_per_point,points_delta,request_id,reference)
    values (business_id,customer,code,actor,operator_role,'credit',amount,rule.currency_per_point,
      pg_catalog.floor(amount/rule.currency_per_point)::bigint,request_id,ref)
    on conflict on constraint point_transactions_request_key do nothing returning * into result;
  if found then return private.loyalty_receipt(result); end if;
  -- A concurrent winner may have been invisible to the INSERT snapshot. A new
  -- READ COMMITTED statement sees its committed row; never UPDATE the ledger.
  select t.* into existing from public.point_transactions t where t.business_id=credit_points.business_id and t.request_id=credit_points.request_id;
  if not found then raise exception using errcode = 'PT409', message = 'retry_same_request'; end if;
  if existing.entry_type <> 'credit' or existing.actor_id <> actor or existing.customer_code <> code
    or existing.paid_amount <> amount or existing.reference is distinct from ref then
    raise exception using errcode = 'PT409', message = 'idempotency_conflict';
  end if;
  return private.loyalty_receipt(existing);
end;
$$;

create or replace function private.reverse_credit(business_id uuid, original_id uuid, reason text, request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); active boolean; why text := pg_catalog.btrim(reason);
  original public.point_transactions; existing public.point_transactions; result public.point_transactions;
begin
  perform private.loyalty_operator(business_id,true,true);
  select b.is_active into active from public.businesses b where b.id=business_id for share;
  if request_id is null or why is null or char_length(why) not between 1 and 240 then
    raise exception using errcode = 'PT400', message = 'invalid_request_or_reason';
  end if;
  select t.* into existing from public.point_transactions t where t.business_id=reverse_credit.business_id and t.request_id=reverse_credit.request_id;
  if found then
    if existing.entry_type <> 'reversal' or existing.actor_id <> actor or existing.reverses_id is distinct from original_id or existing.reason <> why then
      raise exception using errcode = 'PT409', message = 'idempotency_conflict';
    end if;
    return private.loyalty_receipt(existing);
  end if;
  perform private.require_loyalty_entitlement(business_id,true);
  if active is distinct from true then raise exception using errcode = 'PT403', message = 'business_inactive'; end if;
  select t.* into original from public.point_transactions t where t.business_id=reverse_credit.business_id and t.id=original_id for update;
  if not found or original.entry_type <> 'credit' then raise exception using errcode = 'PT404', message = 'credit_unavailable'; end if;
  -- Recheck after waiting for an original-row lock: a concurrent same-request
  -- reversal must recover the winner, rather than report already reversed.
  select t.* into existing from public.point_transactions t where t.business_id=reverse_credit.business_id and t.request_id=reverse_credit.request_id;
  if found then
    if existing.entry_type <> 'reversal' or existing.actor_id <> actor or existing.reverses_id is distinct from original_id or existing.reason <> why then
      raise exception using errcode = 'PT409', message = 'idempotency_conflict';
    end if;
    return private.loyalty_receipt(existing);
  end if;
  if exists (select 1 from public.point_transactions t where t.reverses_id=original_id) then
    raise exception using errcode = 'PT409', message = 'credit_already_reversed';
  end if;
  insert into public.point_transactions (business_id,customer_id,customer_code,actor_id,actor_role,entry_type,
    paid_amount,currency_per_point,points_delta,request_id,reference,reverses_id,reason)
    values (business_id,original.customer_id,original.customer_code,actor,'admin','reversal',original.paid_amount,
      original.currency_per_point,-original.points_delta,request_id,original.reference,original_id,why)
    on conflict on constraint point_transactions_request_key do nothing returning * into result;
  if found then return private.loyalty_receipt(result); end if;
  select t.* into existing from public.point_transactions t where t.business_id=reverse_credit.business_id and t.request_id=reverse_credit.request_id;
  if not found or existing.entry_type <> 'reversal' or existing.actor_id <> actor or existing.reverses_id is distinct from original_id or existing.reason <> why then
    raise exception using errcode = 'PT409', message = 'idempotency_conflict';
  end if;
  return private.loyalty_receipt(existing);
end;
$$;

notify pgrst, 'reload schema';
commit;
