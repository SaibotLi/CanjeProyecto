-- Sprint 3B. Forward-only. LOCAL first; no payments, redemptions or global authority.
begin;

alter table public.business_memberships drop constraint business_memberships_role_check;
alter table public.business_memberships add constraint business_memberships_role_check check (role in ('admin','staff'));

create function private.is_business_staff(target_business_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.business_memberships m
    where m.business_id = target_business_id and m.user_id = (select auth.uid()) and m.role = 'staff');
$$;
revoke all on function private.is_business_staff(uuid) from public, anon, authenticated, service_role;
grant execute on function private.is_business_staff(uuid) to authenticated;
-- Staff may resolve its own inactive tenant; no new menu/settings/Storage writes.
create policy business_staff_read on public.businesses for select to authenticated
  using (private.is_business_staff(id));

alter table public.profiles add column customer_code text;
create function private.new_customer_code()
returns text language plpgsql volatile security invoker set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea; candidate text; i integer;
begin
  loop
    bytes := pg_catalog.uuid_send(pg_catalog.gen_random_uuid()); candidate := '';
    -- Ten independent uniform 5-bit samples; skip UUID's fixed version byte.
    foreach i in array array[0,1,2,3,4,5,7,8,9,10] loop
      candidate := candidate || pg_catalog.substr(alphabet, (pg_catalog.get_byte(bytes,i) & 31) + 1, 1);
    end loop;
    -- Serialize equal candidates through commit. UNIQUE remains the final guard.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(candidate, 31001));
    if not exists (select 1 from public.profiles p where p.customer_code = candidate) then return candidate; end if;
  end loop;
end;
$$;
revoke all on function private.new_customer_code() from public, anon, authenticated, service_role;
alter table public.profiles alter column customer_code set default private.new_customer_code();
update public.profiles set customer_code = private.new_customer_code() where customer_code is null;
alter table public.profiles alter column customer_code set not null;
alter table public.profiles add constraint profiles_customer_code_key unique (customer_code);
alter table public.profiles add constraint profiles_customer_code_check check (
  customer_code collate "C" ~ E'\\A[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}\\Z');
create function private.preserve_customer_code()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.customer_code is distinct from old.customer_code then
    raise exception using errcode = 'PT403', message = 'customer_code_immutable';
  end if;
  return new;
end;
$$;
revoke all on function private.preserve_customer_code() from public, anon, authenticated, service_role;
create trigger profiles_preserve_customer_code before update on public.profiles
  for each row execute function private.preserve_customer_code();

create table public.point_transactions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on update restrict on delete restrict,
  customer_id uuid not null references public.profiles(id) on update restrict on delete restrict,
  customer_code text not null,
  actor_id uuid not null references public.profiles(id) on update restrict on delete restrict,
  actor_role text not null check (actor_role in ('admin','staff')),
  entry_type text not null check (entry_type in ('credit','reversal')),
  currency_code text not null default 'ARS' check (currency_code = 'ARS'),
  paid_amount numeric not null,
  currency_per_point numeric not null,
  points_delta bigint not null,
  request_id uuid not null,
  reference text,
  reverses_id uuid,
  reason text,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint point_transactions_business_id_key unique (business_id,id),
  constraint point_transactions_request_key unique (business_id,request_id),
  constraint point_transactions_reversal_key unique (reverses_id),
  constraint point_transactions_reversal_fkey foreign key (business_id,reverses_id)
    references public.point_transactions(business_id,id) on update restrict on delete restrict,
  constraint point_transactions_money_check check (
    paid_amount > 0 and paid_amount <= 999999999999.99 and paid_amount <> 'NaN'::numeric and scale(paid_amount) <= 2
    and currency_per_point > 0 and currency_per_point <= 999999999999.99 and currency_per_point <> 'NaN'::numeric and scale(currency_per_point) <= 2),
  constraint point_transactions_shape_check check (
    (entry_type = 'credit' and reverses_id is null and reason is null
      and actor_id <> customer_id and points_delta = pg_catalog.floor(paid_amount / currency_per_point))
    or (entry_type = 'reversal' and reverses_id is not null and reverses_id <> id and actor_role = 'admin'
      and reason is not null and points_delta = -pg_catalog.floor(paid_amount / currency_per_point))),
  constraint point_transactions_code_check check (customer_code collate "C" ~ E'\\A[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}\\Z'),
  constraint point_transactions_reference_check check (reference is null or (char_length(reference) between 1 and 120 and btrim(reference) = reference)),
  constraint point_transactions_reason_check check (reason is null or (char_length(reason) between 1 and 240 and btrim(reason) = reason))
);
create index point_transactions_customer_history_idx on public.point_transactions (business_id,customer_id,created_at desc,id desc);
create index point_transactions_actor_history_idx on public.point_transactions (business_id,actor_id,created_at desc,id desc);
alter table public.point_transactions enable row level security;
-- Closed direct Data API surface. All reads are purpose-specific RPCs; no personal UUID leakage to customers/Staff.
revoke all on public.point_transactions from public, anon, authenticated, service_role;

create function private.prevent_economic_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin raise exception using errcode = 'PT403', message = 'ledger_immutable'; end;
$$;
revoke all on function private.prevent_economic_mutation() from public, anon, authenticated, service_role;
create trigger point_transactions_immutable before update or delete on public.point_transactions
  for each row execute function private.prevent_economic_mutation();
create trigger point_transactions_no_truncate before truncate on public.point_transactions
  for each statement execute function private.prevent_economic_mutation();

create function private.validate_economic_insert()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare original public.point_transactions;
begin
  if new.entry_type = 'reversal' then
    select t.* into original from public.point_transactions t where t.business_id=new.business_id and t.id=new.reverses_id;
    if not found or original.entry_type <> 'credit' or new.customer_id <> original.customer_id
      or new.customer_code <> original.customer_code or new.paid_amount <> original.paid_amount
      or new.currency_code <> original.currency_code or new.currency_per_point <> original.currency_per_point or new.points_delta <> -original.points_delta
      or new.reference is distinct from original.reference then
      raise exception using errcode = '23514', message = 'invalid_reversal_original';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_economic_insert() from public, anon, authenticated, service_role;
create trigger point_transactions_validate_insert before insert on public.point_transactions
  for each row execute function private.validate_economic_insert();

create function private.normalize_customer_code(value text)
returns text language plpgsql immutable security invoker set search_path = '' as $$
declare cleaned text := pg_catalog.upper(pg_catalog.btrim(value));
begin
  if cleaned is null or cleaned collate "C" !~ E'\\A([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}|[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{2})\\Z' then
    raise exception using errcode = 'PT400', message = 'invalid_customer_code';
  end if;
  return pg_catalog.replace(cleaned,'-','');
end;
$$;
create function private.parse_paid_amount(value jsonb)
returns numeric language plpgsql immutable security invoker set search_path = '' as $$
declare source text; amount numeric;
begin
  -- jsonb is deliberate: a text RPC argument would coerce a JSON number first.
  if value is null or pg_catalog.jsonb_typeof(value) <> 'string' then
    raise exception using errcode = 'PT400', message = 'amount_must_be_decimal_string';
  end if;
  source := value #>> '{}';
  if source collate "C" !~ E'\\A[0-9]{1,12}([.][0-9]{1,2})?\\Z' then
    raise exception using errcode = 'PT400', message = 'invalid_amount_precision_or_format';
  end if;
  amount := source::numeric;
  if amount <= 0 or amount > 999999999999.99 then
    raise exception using errcode = 'PT400', message = 'invalid_amount_range';
  end if;
  return amount;
end;
$$;
create function private.loyalty_operator(target_business uuid, admin_only boolean, lock_rows boolean)
returns text language plpgsql volatile security invoker set search_path = '' as $$
declare actor uuid := auth.uid(); membership_role text;
begin
  if actor is null then raise exception using errcode = 'PT401', message = 'authentication_required'; end if;
  if lock_rows then
    select m.role into membership_role from public.business_memberships m
      where m.business_id = target_business and m.user_id = actor for share;
  else
    select m.role into membership_role from public.business_memberships m
      where m.business_id = target_business and m.user_id = actor;
  end if;
  if membership_role is null or membership_role not in ('admin','staff') or (admin_only and membership_role <> 'admin') then
    raise exception using errcode = 'PT403', message = 'business_access_denied';
  end if;
  return membership_role;
end;
$$;
create function private.loyalty_receipt(entry public.point_transactions)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select pg_catalog.jsonb_build_object('id',entry.id,'business_id',entry.business_id,
    'customer_code',entry.customer_code,'entry_type',entry.entry_type,'currency_code',entry.currency_code,
    'paid_amount',entry.paid_amount::text,'currency_per_point',entry.currency_per_point::text,
    'points_delta',entry.points_delta::text,'request_id',entry.request_id,
    'reference',entry.reference,'reverses_id',entry.reverses_id,'reason',entry.reason,'created_at',entry.created_at);
$$;

create function private.lookup_loyalty_customer(business_id uuid, customer_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare code text; customer record;
begin
  perform private.loyalty_operator(business_id,false,false);
  if not exists (select 1 from public.businesses b where b.id = business_id and b.is_active) then
    raise exception using errcode = 'PT403', message = 'business_inactive';
  end if;
  code := private.normalize_customer_code(customer_code);
  select p.customer_code,p.display_name into customer from public.profiles p join auth.users u on u.id=p.id
    where p.customer_code=code and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= pg_catalog.now());
  if not found then raise exception using errcode = 'PT404', message = 'customer_unavailable'; end if;
  return pg_catalog.jsonb_build_object('customer_code',customer.customer_code,'display_name',customer.display_name);
end;
$$;

create function private.credit_points(business_id uuid, customer_code text, paid_amount jsonb, request_id uuid, reference text)
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

create function private.reverse_credit(business_id uuid, original_id uuid, reason text, request_id uuid)
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

create function private.my_loyalty(business_id uuid, before_time timestamptz, before_id uuid, page_size integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid(); balance numeric; history jsonb;
begin
  if actor is null then raise exception using errcode = 'PT401', message = 'authentication_required'; end if;
  if page_size is null or page_size not between 1 and 100 or ((before_time is null) <> (before_id is null)) then
    raise exception using errcode = 'PT400', message = 'invalid_pagination';
  end if;
  select coalesce(pg_catalog.sum(t.points_delta),0) into balance from public.point_transactions t where t.business_id=my_loyalty.business_id and t.customer_id=actor;
  select coalesce(pg_catalog.jsonb_agg(private.loyalty_receipt(q::public.point_transactions) order by q.created_at desc,q.id desc),'[]'::jsonb) into history
    from (select t.* from public.point_transactions t where t.business_id=my_loyalty.business_id and t.customer_id=actor
      and (before_time is null or (t.created_at,t.id)<(before_time,before_id)) order by t.created_at desc,t.id desc limit page_size) q;
  return pg_catalog.jsonb_build_object('business_id',business_id,'balance',balance::text,'history',history);
end;
$$;
create function private.loyalty_history(business_id uuid, before_time timestamptz, before_id uuid, page_size integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); operator_role text; history jsonb;
begin
  operator_role := private.loyalty_operator(business_id,false,false);
  if page_size is null or page_size not between 1 and 100 or ((before_time is null) <> (before_id is null)) then
    raise exception using errcode = 'PT400', message = 'invalid_pagination';
  end if;
  select coalesce(pg_catalog.jsonb_agg(private.loyalty_receipt(q::public.point_transactions) ||
      case when operator_role='admin' then pg_catalog.jsonb_build_object('actor_id',q.actor_id,'actor_role',q.actor_role) else '{}'::jsonb end
      order by q.created_at desc,q.id desc),'[]'::jsonb) into history
    from (select t.* from public.point_transactions t where t.business_id=loyalty_history.business_id
      and (operator_role='admin' or t.actor_id=actor or exists (select 1 from public.point_transactions c where c.id=t.reverses_id and c.business_id=loyalty_history.business_id and c.actor_id=actor))
      and (before_time is null or (t.created_at,t.id)<(before_time,before_id)) order by t.created_at desc,t.id desc limit page_size) q;
  return pg_catalog.jsonb_build_object('business_id',business_id,'history',history);
end;
$$;

-- Fixed, purpose-specific API. No arbitrary SQL or parameter carrying authority.
create function public.lookup_loyalty_customer(business_id uuid, customer_code text)
returns jsonb language sql volatile security invoker set search_path = '' as $$ select private.lookup_loyalty_customer(business_id,customer_code); $$;
create function public.credit_points(business_id uuid, customer_code text, paid_amount jsonb, request_id uuid, reference text default null)
returns jsonb language sql volatile security invoker set search_path = '' as $$ select private.credit_points(business_id,customer_code,paid_amount,request_id,reference); $$;
create function public.reverse_credit(business_id uuid, original_id uuid, reason text, request_id uuid)
returns jsonb language sql volatile security invoker set search_path = '' as $$ select private.reverse_credit(business_id,original_id,reason,request_id); $$;
create function public.get_my_loyalty(business_id uuid, before_time timestamptz default null, before_id uuid default null, page_size integer default 50)
returns jsonb language sql stable security invoker set search_path = '' as $$ select private.my_loyalty(business_id,before_time,before_id,page_size); $$;
create function public.get_loyalty_history(business_id uuid, before_time timestamptz default null, before_id uuid default null, page_size integer default 50)
returns jsonb language sql volatile security invoker set search_path = '' as $$ select private.loyalty_history(business_id,before_time,before_id,page_size); $$;

-- Revoke defaults explicitly for EVERY new function; helper/trigger functions owner-only.
revoke all on function private.normalize_customer_code(text), private.parse_paid_amount(jsonb),
  private.loyalty_operator(uuid,boolean,boolean), private.loyalty_receipt(public.point_transactions),
  private.lookup_loyalty_customer(uuid,text), private.credit_points(uuid,text,jsonb,uuid,text),
  private.reverse_credit(uuid,uuid,text,uuid), private.my_loyalty(uuid,timestamptz,uuid,integer),
  private.loyalty_history(uuid,timestamptz,uuid,integer), public.lookup_loyalty_customer(uuid,text),
  public.credit_points(uuid,text,jsonb,uuid,text), public.reverse_credit(uuid,uuid,text,uuid),
  public.get_my_loyalty(uuid,timestamptz,uuid,integer), public.get_loyalty_history(uuid,timestamptz,uuid,integer)
  from public, anon, authenticated, service_role;
grant execute on function private.lookup_loyalty_customer(uuid,text), private.credit_points(uuid,text,jsonb,uuid,text),
  private.reverse_credit(uuid,uuid,text,uuid), private.my_loyalty(uuid,timestamptz,uuid,integer),
  private.loyalty_history(uuid,timestamptz,uuid,integer), public.lookup_loyalty_customer(uuid,text),
  public.credit_points(uuid,text,jsonb,uuid,text), public.reverse_credit(uuid,uuid,text,uuid),
  public.get_my_loyalty(uuid,timestamptz,uuid,integer), public.get_loyalty_history(uuid,timestamptz,uuid,integer)
  to authenticated;
comment on table public.point_transactions is 'Immutable LOCAL-first economic ledger. Direct API access denied; scoped RPCs are the only application surface. No materialized balance or cascade deletion.';
comment on function public.credit_points(uuid,text,jsonb,uuid,text) is 'paid_amount MUST be a JSON string containing exact ARS decimal, never a JSON number. Current DB authority, atomic idempotency; no self credit.';
notify pgrst, 'reload schema';
commit;
