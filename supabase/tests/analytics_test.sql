-- T19: rollup numbers match a hand-computed dataset (D-10).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into public.tenants (id, name, slug) values ('10000000-0000-0000-0000-0000000000aa', 'Stats', 'stats');
insert into public.outlets (id, tenant_id, name, timezone) values
  ('20000000-0000-0000-0000-0000000000aa', '10000000-0000-0000-0000-0000000000aa', 'S1', 'Asia/Kolkata');
insert into public.table_sessions (id, tenant_id, outlet_id, secret_hash) values
  ('60000000-0000-0000-0000-0000000000aa', '10000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', 'h');

-- 2026-11-10 IST: three valid orders (₹100, ₹200, ₹300) and one cancelled (₹999).
-- Times are IST 12:10, 12:40, 19:05 (UTC 06:40, 07:10, 13:35); prep 300 s, 600 s, none.
insert into public.orders (id, tenant_id, outlet_id, session_id, order_no, status, subtotal, tax, total, placed_at, accepted_at, ready_at, idempotency_key) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', '60000000-0000-0000-0000-0000000000aa', 1, 'served', 10000, 0, 10000, '2026-11-10 06:40:00+00', '2026-11-10 06:41:00+00', '2026-11-10 06:46:00+00', 'stats-key-1'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', '60000000-0000-0000-0000-0000000000aa', 2, 'served', 20000, 0, 20000, '2026-11-10 07:10:00+00', '2026-11-10 07:10:00+00', '2026-11-10 07:20:00+00', 'stats-key-2'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', '60000000-0000-0000-0000-0000000000aa', 3, 'placed', 30000, 0, 30000, '2026-11-10 13:35:00+00', null, null, 'stats-key-3'),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', '60000000-0000-0000-0000-0000000000aa', 4, 'cancelled', 99900, 0, 99900, '2026-11-10 08:00:00+00', null, null, 'stats-key-4'),
  -- 2026-11-09 23:59 IST belongs to the previous day.
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', '60000000-0000-0000-0000-0000000000aa', 1, 'served', 5000, 0, 5000, '2026-11-09 18:29:00+00', null, null, 'stats-key-5');

insert into public.order_items (tenant_id, order_id, name_snapshot, unit_price, qty, line_total) values
  ('10000000-0000-0000-0000-0000000000aa', '70000000-0000-0000-0000-000000000001', 'Dosa', 5000, 2, 10000),
  ('10000000-0000-0000-0000-0000000000aa', '70000000-0000-0000-0000-000000000002', 'Dosa', 5000, 1, 5000),
  ('10000000-0000-0000-0000-0000000000aa', '70000000-0000-0000-0000-000000000002', 'Biryani', 15000, 1, 15000),
  ('10000000-0000-0000-0000-0000000000aa', '70000000-0000-0000-0000-000000000003', 'Biryani', 15000, 2, 30000),
  ('10000000-0000-0000-0000-0000000000aa', '70000000-0000-0000-0000-000000000004', 'Lobster', 99900, 1, 99900);

select public.rollup_daily_metrics('20000000-0000-0000-0000-0000000000aa', '2026-11-10');
create temp table m as select * from public.daily_metrics where outlet_id = '20000000-0000-0000-0000-0000000000aa' and date = '2026-11-10';

select is((select orders from m), 3, 'orders exclude cancelled and other days');
select is((select revenue from m), 60000, 'revenue = 100 + 200 + 300 rupees');
select is((select aov from m), 20000, 'AOV = 600 / 3');
select is((select cancelled from m), 1, 'cancelled counted separately');
select is((select avg_prep_seconds from m), 450, 'average prep = (300 + 600) / 2');
select is((select top_items -> 0 ->> 'name' from m), 'Biryani', 'top item by quantity');
select is((select (top_items -> 0 ->> 'qty')::int from m), 3, 'Biryani qty = 1 + 2');
select is((select hourly from m), '{"12": 2, "19": 1}'::jsonb, 'peak hours in outlet local time');

select * from finish();
rollback;
