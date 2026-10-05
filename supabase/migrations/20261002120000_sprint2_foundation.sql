-- Task 2B: structural foundation only. No application grants or RLS policies.
-- Atomic creation: tables cannot become visible before the deny baseline.
begin;

create schema private authorization postgres;
revoke all on schema private from public, anon, authenticated, service_role;

create table public.businesses (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  slug text not null constraint businesses_slug_key unique,
  name text not null,
  currency_code text not null default 'ARS',
  timezone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_slug_check check (
    char_length(slug) between 1 and 80 and
    slug collate "C" ~ E'\\A[a-z0-9]+(-[a-z0-9]+)*\\Z'
  ),
  constraint businesses_name_check check (
    char_length(name) between 1 and 120 and btrim(name) <> '' and name ~ '[^[:space:]]'
  ),
  constraint businesses_currency_code_check check (currency_code = 'ARS'),
  constraint businesses_timezone_check check (
    char_length(timezone) between 1 and 100 and btrim(timezone) = timezone and timezone ~ '[^[:space:]]'
  )
);

create table public.profiles (
  id uuid primary key,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_auth_user_fkey foreign key (id)
    references auth.users(id) on update restrict on delete cascade,
  constraint profiles_display_name_check check (
    display_name is null or (
      char_length(display_name) between 1 and 80 and
      btrim(display_name) <> '' and display_name ~ '[^[:space:]]'
    )
  )
);

create table public.business_memberships (
  business_id uuid not null,
  user_id uuid not null,
  role text not null constraint business_memberships_role_check check (role = 'admin'),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id),
  constraint business_memberships_business_fkey foreign key (business_id)
    references public.businesses(id) on update restrict on delete restrict,
  constraint business_memberships_profile_fkey foreign key (user_id)
    references public.profiles(id) on update restrict on delete cascade
);
create index business_memberships_user_business_idx
  on public.business_memberships (user_id, business_id);

create table private.platform_admins (
  user_id uuid primary key,
  created_at timestamptz not null default now(),
  constraint platform_admins_auth_user_fkey foreign key (user_id)
    references auth.users(id) on update restrict on delete cascade
);

create table public.loyalty_settings (
  business_id uuid primary key,
  currency_per_point numeric(14,2) not null default 1000.00,
  points_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loyalty_settings_business_fkey foreign key (business_id)
    references public.businesses(id) on update restrict on delete restrict,
  constraint loyalty_settings_currency_per_point_check check (
    currency_per_point > 0 and currency_per_point <= 999999999999.99 and
    currency_per_point not in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
  )
);

create table public.menu_categories (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  business_id uuid not null,
  name text not null,
  slug text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_categories_business_fkey foreign key (business_id)
    references public.businesses(id) on update restrict on delete restrict,
  constraint menu_categories_business_slug_key unique (business_id, slug),
  constraint menu_categories_business_id_key unique (business_id, id),
  constraint menu_categories_name_check check (
    char_length(name) between 1 and 80 and btrim(name) <> '' and name ~ '[^[:space:]]'
  ),
  constraint menu_categories_slug_check check (
    char_length(slug) between 1 and 80 and
    slug collate "C" ~ E'\\A[a-z0-9]+(-[a-z0-9]+)*\\Z'
  ),
  constraint menu_categories_display_order_check check (display_order >= 0)
);
create index menu_categories_business_order_idx
  on public.menu_categories (business_id, display_order, id);

create table public.menu_items (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  business_id uuid not null,
  category_id uuid not null,
  name text not null,
  description text,
  price_amount numeric(14,2) not null,
  image_path text,
  image_alt text,
  image_presentation text not null default 'photo',
  is_available boolean not null default true,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_business_fkey foreign key (business_id)
    references public.businesses(id) on update restrict on delete restrict,
  constraint menu_items_business_category_fkey foreign key (business_id, category_id)
    references public.menu_categories(business_id, id) on update restrict on delete restrict,
  constraint menu_items_name_check check (
    char_length(name) between 1 and 120 and btrim(name) <> '' and name ~ '[^[:space:]]'
  ),
  constraint menu_items_description_check check (
    description is null or char_length(description) <= 2000
  ),
  constraint menu_items_price_amount_check check (
    price_amount >= 0 and price_amount <= 999999999999.99 and
    price_amount not in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
  ),
  constraint menu_items_image_path_check check (
    image_path is null or (
      char_length(image_path) in (77, 78) and
      image_path collate "C" ~ (
        E'\\A' || business_id::text ||
        E'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|jpeg|png|webp|avif)\\Z'
      )
    )
  ),
  constraint menu_items_image_alt_check check (
    image_alt is null or (
      char_length(image_alt) between 1 and 240 and btrim(image_alt) <> '' and image_alt ~ '[^[:space:]]'
    )
  ),
  constraint menu_items_image_presentation_check check (image_presentation in ('photo', 'cutout')),
  constraint menu_items_display_order_check check (display_order >= 0)
);
-- Tenant/category prefix covers the composite FK and ordered category reads.
create index menu_items_business_category_order_idx
  on public.menu_items (business_id, category_id, display_order, id);

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.business_memberships enable row level security;
alter table public.loyalty_settings enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table private.platform_admins enable row level security;

-- Explicitly remove default grants on our objects only (not Supabase internals).
revoke all on table public.businesses, public.profiles, public.business_memberships,
  public.loyalty_settings, public.menu_categories, public.menu_items,
  private.platform_admins from public, anon, authenticated, service_role;

create function private.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
alter function private.set_updated_at() owner to postgres;
revoke all on function private.set_updated_at() from public, anon, authenticated, service_role;

create trigger businesses_set_updated_at before update on public.businesses
  for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger loyalty_settings_set_updated_at before update on public.loyalty_settings
  for each row execute function private.set_updated_at();
create trigger menu_categories_set_updated_at before update on public.menu_categories
  for each row execute function private.set_updated_at();
create trigger menu_items_set_updated_at before update on public.menu_items
  for each row execute function private.set_updated_at();

-- Auth runs as supabase_auth_admin, not as an application user. Fixed INSERT
-- needs definer rights; no metadata, exception swallowing or application RPC.
create function private.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
alter function private.create_profile_for_auth_user() owner to postgres;
revoke all on function private.create_profile_for_auth_user()
  from public, anon, authenticated, service_role, supabase_auth_admin;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.create_profile_for_auth_user();

comment on table private.platform_admins is
  'DB authority only. No API exposure or app privileges in 2B; read/MFA policies belong to 2C.';
comment on column public.menu_items.image_path is
  'Canonical relative path scoped to business_id; CHECK does not prove object existence.';
comment on column public.menu_items.price_amount is
  'ARS major units, numeric(14,2). No economic operations implemented.';

commit;
