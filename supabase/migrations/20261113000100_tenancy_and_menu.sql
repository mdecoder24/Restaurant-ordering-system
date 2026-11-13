-- T03: tenancy, staff, tables and menu (docs/02-architecture.md §4–5).
-- Every business table carries tenant_id (and outlet_id where it belongs to an outlet).
-- Composite foreign keys on (id, tenant_id) make it impossible for a row to point at a
-- parent in another tenant, so isolation holds even for service-role writes.
-- RLS is enabled here with no policies (default deny); policies arrive in the next migration.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.tenant_status as enum ('active', 'suspended');
create type public.outlet_mode as enum ('dine_in', 'canteen');
create type public.member_role as enum ('owner', 'manager', 'waiter', 'kitchen');
create type public.table_status as enum ('free', 'occupied', 'bill_requested');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 128-bit random QR token, URL safe (Architecture §11: never the table id).
create or replace function public.new_qr_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_');
$$;

-- ---------------------------------------------------------------------------
-- Tenants and outlets
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  plan text not null default 'starter',
  status public.tenant_status not null default 'active',
  gstin text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outlets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  mode public.outlet_mode not null default 'dine_in',
  address text,
  timezone text not null default 'Asia/Kolkata',
  open_hours jsonb not null default '{}'::jsonb,
  -- { "default_rate_bps": 500, "prices_include_tax": false }
  tax_config jsonb not null default '{"default_rate_bps": 500, "prices_include_tax": false}'::jsonb,
  service_charge_bps integer not null default 0 check (service_charge_bps between 0 and 2000),
  -- { "online": true, "cash": true, "prepaid_only": false }
  payment_options jsonb not null default '{"online": true, "cash": true, "prepaid_only": false}'::jsonb,
  auto_accept boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id)
);
create index outlets_tenant_idx on public.outlets (tenant_id);

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  -- Null for PIN-only staff (kitchen/counter devices) who never get an email login.
  user_id uuid references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  role public.member_role not null,
  outlet_id uuid,
  pin_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  foreign key (outlet_id, tenant_id) references public.outlets (id, tenant_id) on delete cascade,
  -- Owners are tenant-wide; nobody may hold an owner role scoped to a single outlet.
  check (role <> 'owner' or outlet_id is null),
  -- A member needs some way to sign in.
  check (user_id is not null or pin_hash is not null)
);
create index members_user_idx on public.members (user_id) where active;
create index members_outlet_idx on public.members (outlet_id);

-- ---------------------------------------------------------------------------
-- Tables (physical) and QR tokens
-- ---------------------------------------------------------------------------
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  outlet_id uuid not null,
  label text not null check (length(trim(label)) between 1 and 40),
  seats integer not null default 4 check (seats between 1 and 50),
  qr_token text not null unique default public.new_qr_token(),
  status public.table_status not null default 'free',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (outlet_id, label),
  foreign key (outlet_id, tenant_id) references public.outlets (id, tenant_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  outlet_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 60),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (id, outlet_id),
  foreign key (outlet_id, tenant_id) references public.outlets (id, tenant_id) on delete cascade
);
create index menu_categories_outlet_idx on public.menu_categories (outlet_id, sort_order);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  outlet_id uuid not null,
  category_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 80),
  description text check (description is null or length(description) <= 500),
  price integer not null check (price >= 0), -- paise
  image_path text,
  is_veg boolean not null default true,
  dietary_tags text[] not null default '{}',
  available boolean not null default true,
  sort_order integer not null default 0,
  tax_rate_bps integer check (tax_rate_bps is null or tax_rate_bps between 0 and 2800),
  prep_station text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (outlet_id, tenant_id) references public.outlets (id, tenant_id) on delete cascade,
  -- The category must belong to the same outlet.
  foreign key (category_id, outlet_id) references public.menu_categories (id, outlet_id) on delete cascade
);
create index menu_items_outlet_category_idx on public.menu_items (outlet_id, category_id, sort_order);

create table public.item_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  item_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 40),
  price_delta integer not null default 0, -- paise, may be negative
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (item_id, tenant_id) references public.menu_items (id, tenant_id) on delete cascade
);
create index item_variants_item_idx on public.item_variants (item_id);
create unique index item_variants_one_default on public.item_variants (item_id) where is_default;

create table public.addon_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  item_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 60),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  check (min_select <= max_select),
  foreign key (item_id, tenant_id) references public.menu_items (id, tenant_id) on delete cascade
);
create index addon_groups_item_idx on public.addon_groups (item_id);

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  group_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 60),
  price integer not null default 0 check (price >= 0), -- paise
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (group_id, tenant_id) references public.addon_groups (id, tenant_id) on delete cascade
);
create index addons_group_idx on public.addons (group_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers and default-deny RLS
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'tenants', 'outlets', 'members', 'tables',
    'menu_categories', 'menu_items', 'item_variants', 'addon_groups', 'addons'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t
    );
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;
