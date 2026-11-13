-- T04 policy tests: two tenants must never read or write each other's data.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- Fixtures (as postgres, bypassing RLS) ----------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'owner-b@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'manager-a2@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'waiter-a@test.local'),
  ('00000000-0000-0000-0000-0000000000ff', 'stranger@test.local');

insert into public.tenants (id, name, slug) values
  ('10000000-0000-0000-0000-00000000000a', 'Tenant A', 'tenant-a'),
  ('10000000-0000-0000-0000-00000000000b', 'Tenant B', 'tenant-b');

insert into public.outlets (id, tenant_id, name) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'A1'),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'A2'),
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'B1');

insert into public.members (tenant_id, user_id, display_name, role, outlet_id, pin_hash) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Owner A', 'owner', null, null),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Owner B', 'owner', null, null),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'Manager A2', 'manager', '20000000-0000-0000-0000-0000000000a2', null),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3', 'Waiter A1', 'waiter', '20000000-0000-0000-0000-0000000000a1', 'secret-hash');

insert into public.menu_categories (id, tenant_id, outlet_id, name) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'Starters A1'),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a2', 'Starters A2'),
  ('30000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1', 'Starters B1');

insert into public.menu_items (id, tenant_id, outlet_id, category_id, name, price) values
  ('40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', 'Dosa', 9000),
  ('40000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b1', 'Idli', 6000);

insert into public.item_variants (tenant_id, item_id, name, price_delta) values
  ('10000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-0000000000b1', 'Large', 2000);

insert into public.tables (tenant_id, outlet_id, label) values
  ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'T1'),
  ('10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1', 'T1');

-- Structural guarantees ---------------------------------------------------------------
select ok(
  (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'),
  'RLS is enabled on every public table'
);

select throws_ok(
  $$ insert into public.menu_items (tenant_id, outlet_id, category_id, name, price)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000b1',
             '30000000-0000-0000-0000-0000000000b1', 'Cross', 100) $$,
  '23503', null,
  'a row cannot reference an outlet in another tenant'
);

select throws_ok(
  $$ insert into public.menu_items (tenant_id, outlet_id, category_id, name, price)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1',
             '30000000-0000-0000-0000-0000000000a2', 'Wrong outlet', 100) $$,
  '23503', null,
  'an item cannot sit in a category from another outlet'
);

select ok(
  (select qr_token ~ '^[A-Za-z0-9_-]{22,24}$' from public.tables limit 1),
  'QR tokens are 128-bit URL-safe values'
);

-- Anonymous ---------------------------------------------------------------------------
set local role anon;
select is((select count(*) from public.tenants)::int, 0, 'anon reads no tenants');
select is((select count(*) from public.menu_items)::int, 0, 'anon reads no menu items');
select is((select count(*) from public.tables)::int, 0, 'anon reads no tables (no QR token leak)');
select throws_ok(
  $$ insert into public.tenants (name, slug) values ('x', 'x') $$,
  '42501', null, 'anon cannot create tenants'
);
reset role;

-- Owner A -----------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is((select count(*) from public.tenants)::int, 1, 'owner A sees only tenant A');
select is((select count(*) from public.outlets)::int, 2, 'owner A sees both A outlets');
select is((select count(*) from public.menu_items)::int, 1, 'owner A sees only A items');
select is((select count(*) from public.item_variants)::int, 0, 'owner A cannot see B variants');
select is((select count(*) from public.tables)::int, 1, 'owner A sees only A tables');
select is((select count(*) from public.members)::int, 3, 'owner A sees A staff only');

select is_empty(
  $$ update public.menu_items set price = 1 where id = '40000000-0000-0000-0000-0000000000b1' returning id $$,
  'owner A cannot update a B item'
);
select is_empty(
  $$ delete from public.tables where tenant_id = '10000000-0000-0000-0000-00000000000b' returning id $$,
  'owner A cannot delete B tables'
);
select throws_ok(
  $$ insert into public.menu_categories (tenant_id, outlet_id, name)
     values ('10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1', 'Injected') $$,
  '42501', null, 'owner A cannot insert into tenant B'
);
select throws_ok(
  $$ select pin_hash from public.members $$,
  '42501', null, 'pin_hash is not readable via the API'
);
select throws_ok(
  $$ update public.tenants set status = 'active' $$,
  '42501', null, 'owners cannot change their own tenant status'
);
select lives_ok(
  $$ insert into public.menu_categories (tenant_id, outlet_id, name)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'Mains') $$,
  'owner A can write to their own outlet'
);

-- Manager scoped to A2 ----------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}';
select is((select count(*) from public.outlets)::int, 1, 'outlet-scoped manager sees only their outlet');
select is((select count(*) from public.menu_categories)::int, 1, 'manager sees only A2 categories');
select throws_ok(
  $$ insert into public.menu_categories (tenant_id, outlet_id, name)
     values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'Sneaky') $$,
  '42501', null, 'manager cannot write to another outlet of the same tenant'
);
select throws_ok(
  $$ insert into public.members (tenant_id, display_name, role, pin_hash)
     values ('10000000-0000-0000-0000-00000000000a', 'New', 'waiter', 'h') $$,
  '42501', null, 'managers cannot add staff'
);

-- Waiter in A1 ------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a3", "role": "authenticated"}';
select is_empty(
  $$ update public.menu_items set price = 1 returning id $$,
  'waiter cannot edit menu prices'
);
select is(
  public.set_items_availability(array['40000000-0000-0000-0000-0000000000a1'::uuid], false),
  1, 'waiter can toggle availability in their outlet'
);
select is(
  public.set_items_availability(array['40000000-0000-0000-0000-0000000000b1'::uuid], false),
  0, 'waiter cannot toggle another tenant''s availability'
);

-- Stranger and onboarding -------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000ff", "role": "authenticated"}';
select is((select count(*) from public.tenants)::int, 0, 'a user with no membership sees nothing');
select lives_ok(
  $$ select public.onboard_tenant('Stranger Cafe', 'stranger-cafe', 'Main', 'dine_in', 'Sam') $$,
  'any signed-in user can onboard a new tenant'
);
select is((select count(*) from public.outlets)::int, 1, 'new owner sees only their new outlet');

-- Suspension --------------------------------------------------------------------------
reset role;
update public.tenants set status = 'suspended' where id = '10000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is((select count(*) from public.menu_items)::int, 0, 'staff of a suspended tenant lose access');

select * from finish();
rollback;
