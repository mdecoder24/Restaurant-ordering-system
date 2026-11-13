-- Order domain: idempotent placement, guarded transitions, append-only audit, isolation.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'owner-b@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'kitchen-a@test.local');
insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-00000000000a', 'Tenant A', 'tenant-a'),
  ('10000000-0000-0000-0000-00000000000b', 'Tenant B', 'tenant-b');
insert into public.outlets (id, tenant_id, name, mode) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'A1', 'dine_in'),
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'B1', 'canteen');
insert into public.members (tenant_id, user_id, display_name, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Owner A', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Owner B', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a4', 'Cook', 'kitchen');
insert into public.tables (id, tenant_id, outlet_id, label) values
  ('50000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'T1');
insert into public.table_sessions (id, tenant_id, outlet_id, table_id, secret_hash) values
  ('60000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1', 'h'),
  ('60000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1', null, 'h');

-- Placement ---------------------------------------------------------------------------
create temp table placed as
select * from public.place_order('60000000-0000-0000-0000-0000000000a1', 'key-aaaaaaaa', 'no onions',
  '{"subtotal": 18000, "serviceCharge": 0, "tax": 900, "rounding": 100, "total": 19000}',
  '[{"item_id": null, "name": "Dosa", "unit_price": 9000, "qty": 2, "tax_rate_bps": 500, "line_total": 18000}]');

select is((select created from placed), true, 'first placement creates an order');
select is((select order_no from placed), 1, 'order numbers start at 1 per outlet-day');
select is((select count(*) from public.order_items where order_id = (select order_id from placed))::int, 1, 'items are stored');
select is((select status from public.tables where id = '50000000-0000-0000-0000-0000000000a1')::text, 'occupied', 'table becomes occupied');

select is(
  (select created from public.place_order('60000000-0000-0000-0000-0000000000a1', 'key-aaaaaaaa', null,
    '{"subtotal": 1, "serviceCharge": 0, "tax": 0, "rounding": 0, "total": 1}', '[]')),
  false, 'replaying an idempotency key returns the original order'
);
select is((select count(*) from public.orders where session_id = '60000000-0000-0000-0000-0000000000a1')::int, 1, 'a double tap creates exactly one order');
select throws_ok(
  $$ select * from public.place_order('60000000-0000-0000-0000-0000000000b1', 'key-aaaaaaaa', null,
       '{"subtotal": 1, "serviceCharge": 0, "tax": 0, "rounding": 0, "total": 1}', '[]') $$,
  '22023', null, 'an idempotency key cannot be replayed into another session'
);

select is(
  (select order_no from public.place_order('60000000-0000-0000-0000-0000000000b1', 'key-bbbbbbbb', null,
    '{"subtotal": 5000, "serviceCharge": 0, "tax": 250, "rounding": -50, "total": 5200}',
    '[{"item_id": null, "name": "Idli", "unit_price": 5000, "qty": 1, "tax_rate_bps": 500, "line_total": 5000}]')),
  1, 'order numbers are per outlet'
);
select is((select token_no from public.table_sessions where id = '60000000-0000-0000-0000-0000000000b1'), 1, 'canteen session gets a token');

-- Transitions -------------------------------------------------------------------------
select is(public.transition_order((select order_id from placed), 'placed', 'accepted', 'staff', null, null), true, 'placed → accepted');
select is(public.transition_order((select order_id from placed), 'placed', 'rejected', 'staff', null, 'x'), false, 'a stale "from" loses the race');
select isnt((select accepted_at from public.orders where id = (select order_id from placed)), null, 'accepted_at is stamped');
select is((select count(*) from public.order_events where order_id = (select order_id from placed))::int, 2, 'every change writes an event');
select throws_ok(
  $$ update public.order_events set type = 'tampered' $$, '42501', null, 'order_events is append-only'
);

select is((select billed from public.session_balance('60000000-0000-0000-0000-0000000000a1')), 19000, 'balance bills live orders');
select is(public.next_invoice_no('10000000-0000-0000-0000-00000000000a', 'Asia/Kolkata') ~ '^\d{4}-\d{2}/000001$', true, 'invoice numbers are per fiscal year');

-- Isolation ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is((select count(*) from public.orders)::int, 1, 'owner B sees only B orders');
select throws_ok(
  $$ select * from public.place_order('60000000-0000-0000-0000-0000000000b1', 'key-cccccccc', null, '{}', '[]') $$,
  '42501', null, 'staff cannot call place_order directly'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a4", "role": "authenticated"}';
select is((select count(*) from public.payments)::int, 0, 'kitchen cannot read payments');

set local request.jwt.claims = '{"sub": "99999999-0000-0000-0000-000000000000", "role": "authenticated", "krudex_session": "60000000-0000-0000-0000-0000000000a1"}';
select is(
  array[private.can_listen('session:60000000-0000-0000-0000-0000000000a1'),
        private.can_listen('session:60000000-0000-0000-0000-0000000000b1'),
        private.can_listen('outlet:20000000-0000-0000-0000-0000000000a1:orders')],
  array[true, false, false],
  'a guest token can listen only to its own session'
);

select * from finish();
rollback;
