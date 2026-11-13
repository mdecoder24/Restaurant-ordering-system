-- T11/T15/T16/T18/T19 schema: sessions, orders, events, payments, invoices, service
-- requests, daily metrics; atomic write functions; realtime broadcast triggers.
--
-- Write model: staff and guests never write these tables directly. Route handlers verify
-- identity (staff via RLS-scoped reads, guests via QR token + session cookie), validate
-- with packages/core, then call the SECURITY DEFINER functions below with the service
-- role. Staff reads go through RLS. See docs/decisions.md 2026-11-13 (T11).

-- ---------------------------------------------------------------------------
-- Outlet additions
-- ---------------------------------------------------------------------------
alter table public.outlets
  add column ticket_warn_minutes integer not null default 10 check (ticket_warn_minutes between 1 and 120),
  add column ticket_overdue_minutes integer not null default 20 check (ticket_overdue_minutes between 1 and 240),
  add column counter_qr_token text unique default public.new_qr_token();

comment on column public.outlets.counter_qr_token is
  'Canteen outlets: QR at the counter/poster, not tied to a table (Flow §4).';

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.session_status as enum ('open', 'closed');
create type public.order_status as enum ('placed', 'accepted', 'preparing', 'ready', 'served', 'rejected', 'cancelled');
create type public.order_item_status as enum ('pending', 'done');
create type public.actor_type as enum ('guest', 'staff', 'system');
create type public.payment_method as enum ('upi', 'card', 'online', 'cash');
create type public.payment_status as enum ('created', 'authorized', 'captured', 'failed', 'refunded');
create type public.service_request_type as enum ('call_waiter', 'request_bill');
create type public.service_request_status as enum ('open', 'acknowledged', 'resolved');

-- ---------------------------------------------------------------------------
-- Counters: per-outlet daily order numbers, per-tenant invoice numbers
-- ---------------------------------------------------------------------------
create table public.outlet_counters (
  outlet_id uuid not null references public.outlets (id) on delete cascade,
  day date not null,
  last_order_no integer not null default 0,
  primary key (outlet_id, day)
);

create table public.invoice_counters (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  fiscal_year text not null,
  last_no integer not null default 0,
  primary key (tenant_id, fiscal_year)
);

-- ---------------------------------------------------------------------------
-- Sessions and orders
-- ---------------------------------------------------------------------------
create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  outlet_id uuid not null,
  table_id uuid references public.tables (id) on delete set null,
  token_no integer,
  status public.session_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  guest_phone text check (guest_phone is null or guest_phone ~ '^\+?[0-9]{10,13}$'),
  -- Hash of the guest cookie secret: possession of the cookie proves session membership.
  secret_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (outlet_id, tenant_id) references public.outlets (id, tenant_id) on delete cascade
);
create unique index table_sessions_one_open_per_table on public.table_sessions (table_id) where status = 'open';
create index table_sessions_outlet_idx on public.table_sessions (outlet_id, status);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  outlet_id uuid not null,
  session_id uuid not null,
  order_no integer not null,
  status public.order_status not null default 'placed',
  note text check (note is null or length(note) <= 300),
  subtotal integer not null check (subtotal >= 0),
  service_charge integer not null default 0 check (service_charge >= 0),
  tax integer not null check (tax >= 0),
  rounding integer not null default 0,
  total integer not null check (total >= 0),
  placed_at timestamptz not null default now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  cancelled_reason text,
  idempotency_key text not null unique check (length(idempotency_key) between 8 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (outlet_id, tenant_id) references public.outlets (id, tenant_id) on delete cascade,
  foreign key (session_id, tenant_id) references public.table_sessions (id, tenant_id) on delete cascade
);
create index orders_outlet_status_idx on public.orders (outlet_id, status, placed_at);
create index orders_session_idx on public.orders (session_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_id uuid not null,
  item_id uuid references public.menu_items (id) on delete set null,
  name_snapshot text not null,
  variant_snapshot jsonb,
  addons_snapshot jsonb not null default '[]'::jsonb,
  unit_price integer not null check (unit_price >= 0),
  qty integer not null check (qty between 1 and 50),
  tax_rate_bps integer not null default 0,
  line_total integer not null check (line_total >= 0),
  note text check (note is null or length(note) <= 200),
  prep_station text,
  status public.order_item_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (order_id, tenant_id) references public.orders (id, tenant_id) on delete cascade
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  outlet_id uuid not null,
  order_id uuid not null,
  type text not null,
  actor_type public.actor_type not null,
  actor_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (order_id, tenant_id) references public.orders (id, tenant_id) on delete cascade
);
create index order_events_order_idx on public.order_events (order_id, created_at);
create index order_events_outlet_idx on public.order_events (outlet_id, created_at);

-- Append-only audit trail (Architecture §12).
create or replace function private.reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;
create trigger order_events_append_only before update or delete on public.order_events
  for each row execute function private.reject_mutation();

-- ---------------------------------------------------------------------------
-- Payments, invoices, service requests, metrics
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  outlet_id uuid not null,
  session_id uuid not null,
  method public.payment_method not null,
  provider text not null default 'cash',
  provider_order_id text,
  provider_payment_id text unique,
  amount integer not null check (amount > 0),
  refunded_amount integer not null default 0 check (refunded_amount >= 0),
  status public.payment_status not null default 'created',
  idempotency_key text unique,
  recorded_by uuid references public.members (id) on delete set null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (refunded_amount <= amount),
  foreign key (outlet_id, tenant_id) references public.outlets (id, tenant_id) on delete cascade,
  foreign key (session_id, tenant_id) references public.table_sessions (id, tenant_id) on delete cascade
);
create index payments_provider_order_idx on public.payments (provider_order_id);
create index payments_session_idx on public.payments (session_id);
create index payments_outlet_idx on public.payments (outlet_id, created_at);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  outlet_id uuid not null,
  session_id uuid not null unique,
  invoice_no text not null,
  totals jsonb not null,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, invoice_no),
  foreign key (outlet_id, tenant_id) references public.outlets (id, tenant_id) on delete cascade,
  foreign key (session_id, tenant_id) references public.table_sessions (id, tenant_id) on delete cascade
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  outlet_id uuid not null,
  session_id uuid not null,
  table_id uuid references public.tables (id) on delete set null,
  type public.service_request_type not null,
  status public.service_request_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (outlet_id, tenant_id) references public.outlets (id, tenant_id) on delete cascade,
  foreign key (session_id, tenant_id) references public.table_sessions (id, tenant_id) on delete cascade
);
create index service_requests_outlet_idx on public.service_requests (outlet_id, status, created_at);

create table public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  outlet_id uuid not null,
  date date not null,
  orders integer not null default 0,
  revenue integer not null default 0,
  aov integer not null default 0,
  avg_prep_seconds integer,
  cancelled integer not null default 0,
  top_items jsonb not null default '[]'::jsonb,
  hourly jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outlet_id, date),
  foreign key (outlet_id, tenant_id) references public.outlets (id, tenant_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Triggers and RLS (read-only for staff; writes via functions below)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['table_sessions', 'orders', 'order_items', 'payments', 'invoices', 'service_requests', 'daily_metrics'] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
  end loop;
  foreach t in array array['outlet_counters', 'invoice_counters', 'table_sessions', 'orders', 'order_items',
                           'order_events', 'payments', 'invoices', 'service_requests', 'daily_metrics'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

create or replace function private.order_outlet(p_order uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select outlet_id from public.orders where id = p_order;
$$;
grant execute on function private.order_outlet(uuid) to authenticated, service_role;

create policy table_sessions_select on public.table_sessions for select to authenticated
  using (private.is_member(tenant_id, outlet_id));
create policy orders_select on public.orders for select to authenticated
  using (private.is_member(tenant_id, outlet_id));
create policy order_items_select on public.order_items for select to authenticated
  using (private.is_member(tenant_id, private.order_outlet(order_id)));
create policy order_events_select on public.order_events for select to authenticated
  using (private.is_member(tenant_id, outlet_id));
create policy service_requests_select on public.service_requests for select to authenticated
  using (private.is_member(tenant_id, outlet_id));
-- Payments, invoices and analytics: kitchen staff have no access (Architecture §4).
create policy payments_select on public.payments for select to authenticated
  using (private.has_role(tenant_id, outlet_id, '{owner,manager,waiter}'));
create policy invoices_select on public.invoices for select to authenticated
  using (private.has_role(tenant_id, outlet_id, '{owner,manager,waiter}'));
create policy daily_metrics_select on public.daily_metrics for select to authenticated
  using (private.has_role(tenant_id, outlet_id, '{owner,manager}'));
-- Counters have no policies at all: only SECURITY DEFINER functions touch them.

-- Hide the cookie hash even from staff who can read sessions.
revoke select on public.table_sessions from authenticated, anon;
grant select (id, tenant_id, outlet_id, table_id, token_no, status, opened_at, closed_at, guest_phone, created_at, updated_at)
  on public.table_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- Write functions (service role only)
-- ---------------------------------------------------------------------------

-- Next per-outlet order number for the outlet's local day.
create or replace function private.next_order_no(p_outlet uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_day date;
  n integer;
begin
  select (now() at time zone o.timezone)::date into local_day from public.outlets o where o.id = p_outlet;
  insert into public.outlet_counters as c (outlet_id, day, last_order_no)
  values (p_outlet, local_day, 1)
  on conflict (outlet_id, day) do update set last_order_no = c.last_order_no + 1
  returning last_order_no into n;
  return n;
end;
$$;

-- Atomically create an order with its items. Prices and totals are computed by the server
-- with computeBill before this is called; the function only persists them. Replays with
-- the same idempotency key return the original order instead of creating a duplicate.
create or replace function public.place_order(
  p_session uuid,
  p_idempotency_key text,
  p_note text,
  p_totals jsonb,
  p_items jsonb
)
returns table (order_id uuid, order_no integer, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.table_sessions;
  existing public.orders;
  new_id uuid;
  new_no integer;
begin
  select * into existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    if existing.session_id <> p_session then
      raise exception 'idempotency key reused across sessions' using errcode = '22023';
    end if;
    return query select existing.id, existing.order_no, false;
    return;
  end if;

  select * into s from public.table_sessions where id = p_session for update;
  if not found or s.status <> 'open' then
    raise exception 'session is not open' using errcode = 'P0001';
  end if;

  new_no := private.next_order_no(s.outlet_id);

  insert into public.orders (tenant_id, outlet_id, session_id, order_no, note, subtotal, service_charge, tax, rounding, total, idempotency_key)
  values (
    s.tenant_id, s.outlet_id, s.id, new_no, nullif(trim(p_note), ''),
    (p_totals ->> 'subtotal')::int, (p_totals ->> 'serviceCharge')::int, (p_totals ->> 'tax')::int,
    (p_totals ->> 'rounding')::int, (p_totals ->> 'total')::int, p_idempotency_key
  )
  returning id into new_id;

  insert into public.order_items (tenant_id, order_id, item_id, name_snapshot, variant_snapshot, addons_snapshot,
                                  unit_price, qty, tax_rate_bps, line_total, note, prep_station)
  select s.tenant_id, new_id, (i ->> 'item_id')::uuid, i ->> 'name', i -> 'variant', coalesce(i -> 'addons', '[]'::jsonb),
         (i ->> 'unit_price')::int, (i ->> 'qty')::int, (i ->> 'tax_rate_bps')::int, (i ->> 'line_total')::int,
         nullif(trim(i ->> 'note'), ''), i ->> 'prep_station'
  from jsonb_array_elements(p_items) as i;

  -- Canteen sessions carry the first order's number as the pickup token.
  if s.table_id is null and s.token_no is null then
    update public.table_sessions set token_no = new_no where id = s.id;
  end if;
  if s.table_id is not null then
    update public.tables set status = 'occupied' where id = s.table_id and status = 'free';
  end if;

  insert into public.order_events (tenant_id, outlet_id, order_id, type, actor_type, payload)
  values (s.tenant_id, s.outlet_id, new_id, 'order.created', 'guest', jsonb_build_object('total', (p_totals ->> 'total')::int));

  return query select new_id, new_no, true;
end;
$$;

-- Validated status change. The caller has already checked the transition with
-- packages/core checkTransition; `p_from` makes the update conditional so two staff
-- tapping at once cannot both win.
create or replace function public.transition_order(
  p_order uuid,
  p_from public.order_status,
  p_to public.order_status,
  p_actor_type public.actor_type,
  p_actor_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  update public.orders
     set status = p_to,
         accepted_at = case when p_to = 'accepted' then now() else accepted_at end,
         ready_at = case when p_to = 'ready' then now() else ready_at end,
         served_at = case when p_to = 'served' then now() else served_at end,
         cancelled_reason = case when p_to in ('rejected', 'cancelled') then nullif(trim(p_reason), '') else cancelled_reason end
   where id = p_order and status = p_from
  returning * into o;
  if not found then
    return false;
  end if;

  if p_to = 'ready' then
    update public.order_items set status = 'done' where order_id = p_order and status = 'pending';
  end if;

  insert into public.order_events (tenant_id, outlet_id, order_id, type, actor_type, actor_id, payload)
  values (o.tenant_id, o.outlet_id, o.id, 'order.' || p_to::text, p_actor_type, p_actor_id,
          jsonb_build_object('from', p_from, 'to', p_to, 'reason', nullif(trim(p_reason), '')));
  return true;
end;
$$;

-- Amount still owed on a session: live orders minus captured payments net of refunds.
create or replace function public.session_balance(p_session uuid)
returns table (billed integer, paid integer, due integer)
language sql
stable
security definer
set search_path = ''
as $$
  with b as (
    select coalesce(sum(total), 0)::int as billed
    from public.orders where session_id = p_session and status not in ('rejected', 'cancelled')
  ), p as (
    select coalesce(sum(amount - refunded_amount), 0)::int as paid
    from public.payments where session_id = p_session and status in ('captured', 'refunded')
  )
  select b.billed, p.paid, greatest(b.billed - p.paid, 0) from b, p;
$$;

-- Next GST invoice number: <FY>/<n>, e.g. 2026-27/000042. Indian FY starts 1 April.
create or replace function public.next_invoice_no(p_tenant uuid, p_timezone text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_day date := (now() at time zone p_timezone)::date;
  fy_start integer := case when extract(month from local_day) >= 4 then extract(year from local_day)::int
                           else extract(year from local_day)::int - 1 end;
  fy text := fy_start::text || '-' || lpad(((fy_start + 1) % 100)::text, 2, '0');
  n integer;
begin
  insert into public.invoice_counters as c (tenant_id, fiscal_year, last_no) values (p_tenant, fy, 1)
  on conflict (tenant_id, fiscal_year) do update set last_no = c.last_no + 1
  returning last_no into n;
  return fy || '/' || lpad(n::text, 6, '0');
end;
$$;

-- Nightly (or on-demand) analytics rollup for one outlet-day (T19, D-10).
create or replace function public.rollup_daily_metrics(p_outlet uuid, p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.outlets;
  day_start timestamptz;
  day_end timestamptz;
begin
  select * into o from public.outlets where id = p_outlet;
  if not found then return; end if;
  day_start := (p_day::timestamp) at time zone o.timezone;
  day_end := ((p_day + 1)::timestamp) at time zone o.timezone;

  insert into public.daily_metrics as m (tenant_id, outlet_id, date, orders, revenue, aov, avg_prep_seconds, cancelled, top_items, hourly)
  select
    o.tenant_id, o.id, p_day,
    count(*) filter (where ord.status not in ('rejected', 'cancelled')),
    coalesce(sum(ord.total) filter (where ord.status not in ('rejected', 'cancelled')), 0),
    coalesce((sum(ord.total) filter (where ord.status not in ('rejected', 'cancelled'))
              / nullif(count(*) filter (where ord.status not in ('rejected', 'cancelled')), 0)), 0),
    avg(extract(epoch from ord.ready_at - ord.accepted_at)) filter (where ord.ready_at is not null and ord.accepted_at is not null),
    count(*) filter (where ord.status in ('rejected', 'cancelled')),
    coalesce((
      select jsonb_agg(t order by t.qty desc, t.name)
      from (
        select oi.name_snapshot as name, sum(oi.qty)::int as qty, sum(oi.line_total)::int as revenue
        from public.order_items oi
        join public.orders o2 on o2.id = oi.order_id
        where o2.outlet_id = o.id and o2.placed_at >= day_start and o2.placed_at < day_end
          and o2.status not in ('rejected', 'cancelled')
        group by oi.name_snapshot
      ) t
    ), '[]'::jsonb),
    coalesce((
      select jsonb_object_agg(h.hour, h.n)
      from (
        select extract(hour from o3.placed_at at time zone o.timezone)::int as hour, count(*)::int as n
        from public.orders o3
        where o3.outlet_id = o.id and o3.placed_at >= day_start and o3.placed_at < day_end
          and o3.status not in ('rejected', 'cancelled')
        group by 1
      ) h
    ), '{}'::jsonb)
  from public.orders ord
  where ord.outlet_id = o.id and ord.placed_at >= day_start and ord.placed_at < day_end
  on conflict (outlet_id, date) do update set
    orders = excluded.orders, revenue = excluded.revenue, aov = excluded.aov,
    avg_prep_seconds = excluded.avg_prep_seconds, cancelled = excluded.cancelled,
    top_items = excluded.top_items, hourly = excluded.hourly;
end;
$$;

revoke all on function public.place_order(uuid, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.transition_order(uuid, public.order_status, public.order_status, public.actor_type, uuid, text) from public, anon, authenticated;
revoke all on function public.next_invoice_no(uuid, text) from public, anon, authenticated;
revoke all on function public.rollup_daily_metrics(uuid, date) from public, anon, authenticated;
revoke all on function public.session_balance(uuid) from public, anon;
revoke all on function private.next_order_no(uuid) from public, anon, authenticated;
grant execute on function public.place_order(uuid, text, text, jsonb, jsonb) to service_role;
grant execute on function public.transition_order(uuid, public.order_status, public.order_status, public.actor_type, uuid, text) to service_role;
grant execute on function public.next_invoice_no(uuid, text) to service_role;
grant execute on function public.rollup_daily_metrics(uuid, date) to service_role;
grant execute on function public.session_balance(uuid) to authenticated, service_role;
grant execute on function private.next_order_no(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Realtime (Architecture §8): DB triggers broadcast small events on private topics.
-- Clients load state over HTTP, then apply events; on reconnect they refetch.
-- ---------------------------------------------------------------------------
create or replace function private.broadcast(topic text, event text, payload jsonb, is_private boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(payload, event, topic, is_private);
exception when others then
  -- Realtime must never block a write; clients refetch on reconnect anyway.
  raise warning 'realtime broadcast failed: %', sqlerrm;
end;
$$;

create or replace function private.on_order_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev text := case when tg_op = 'INSERT' then 'order.created' else 'order.updated' end;
  body jsonb := jsonb_build_object('id', new.id, 'status', new.status, 'session_id', new.session_id,
                                   'order_no', new.order_no, 'updated_at', new.updated_at);
  token integer;
  is_canteen boolean;
begin
  perform private.broadcast('outlet:' || new.outlet_id || ':orders', ev, body);
  perform private.broadcast('session:' || new.session_id, ev, body);

  select o.mode = 'canteen', s.token_no into is_canteen, token
  from public.outlets o join public.table_sessions s on s.id = new.session_id
  where o.id = new.outlet_id;
  if is_canteen and tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- Public pickup display: token numbers and state only, nothing personal.
    perform private.broadcast('outlet:' || new.outlet_id || ':pickup', 'token.' || new.status::text,
                              jsonb_build_object('token', coalesce(token, new.order_no), 'status', new.status), false);
  end if;
  return new;
end;
$$;
create trigger orders_broadcast after insert or update on public.orders
  for each row execute function private.on_order_change();

create or replace function private.on_order_item_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.broadcast('outlet:' || private.order_outlet(new.order_id) || ':orders', 'item.updated',
                            jsonb_build_object('id', new.id, 'order_id', new.order_id, 'status', new.status, 'updated_at', new.updated_at));
  return new;
end;
$$;
create trigger order_items_broadcast after update on public.order_items
  for each row when (old.status is distinct from new.status) execute function private.on_order_item_change();

create or replace function private.on_table_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.broadcast('outlet:' || new.outlet_id || ':tables', 'table.updated',
                            jsonb_build_object('id', new.id, 'status', new.status, 'updated_at', new.updated_at));
  return new;
end;
$$;
create trigger tables_broadcast after update on public.tables
  for each row when (old.status is distinct from new.status) execute function private.on_table_change();

create or replace function private.on_service_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.broadcast('outlet:' || new.outlet_id || ':tables',
                            case when tg_op = 'INSERT' then 'service_request.created' else 'service_request.updated' end,
                            jsonb_build_object('id', new.id, 'type', new.type, 'status', new.status, 'table_id', new.table_id, 'updated_at', new.updated_at));
  return new;
end;
$$;
create trigger service_requests_broadcast after insert or update on public.service_requests
  for each row execute function private.on_service_request();

create or replace function private.on_payment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  body jsonb := jsonb_build_object('id', new.id, 'status', new.status, 'amount', new.amount,
                                   'session_id', new.session_id, 'updated_at', new.updated_at);
begin
  perform private.broadcast('session:' || new.session_id, 'payment.updated', body);
  perform private.broadcast('outlet:' || new.outlet_id || ':orders', 'payment.updated', body);
  return new;
end;
$$;
create trigger payments_broadcast after insert or update on public.payments
  for each row execute function private.on_payment_change();

create or replace function private.on_session_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.broadcast('session:' || new.id, 'session.updated',
                            jsonb_build_object('id', new.id, 'status', new.status, 'updated_at', new.updated_at));
  perform private.broadcast('outlet:' || new.outlet_id || ':tables', 'session.updated',
                            jsonb_build_object('id', new.id, 'table_id', new.table_id, 'status', new.status, 'updated_at', new.updated_at));
  return new;
end;
$$;
create trigger table_sessions_broadcast after update on public.table_sessions
  for each row when (old.status is distinct from new.status) execute function private.on_session_change();

-- Who may listen to which private topic.
--   staff:  outlet:<id>:orders|tables  when they are a member of that outlet
--   guests: session:<id>               when their short-lived token carries that session id
-- Guest tokens are minted by /api/guest/realtime-token, signed with the project JWT secret,
-- role "authenticated" with a random sub that matches no member, so all table RLS denies.
create or replace function private.can_listen(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(p_topic, ':');
  outlet uuid;
  tenant uuid;
begin
  if parts[1] = 'session' and array_length(parts, 1) = 2 then
    return (select auth.jwt() ->> 'krudex_session') = parts[2];
  end if;
  if parts[1] = 'outlet' and array_length(parts, 1) = 3 and parts[3] in ('orders', 'tables') then
    begin
      outlet := parts[2]::uuid;
    exception when invalid_text_representation then
      return false;
    end;
    select tenant_id into tenant from public.outlets where id = outlet;
    return tenant is not null and private.is_member(tenant, outlet);
  end if;
  return false;
end;
$$;
grant execute on function private.can_listen(text) to authenticated;

create policy krudex_listen on realtime.messages for select to authenticated
  using (private.can_listen((select realtime.topic())));
