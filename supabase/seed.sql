-- Local/demo seed (AGENTS.md rule 11: seed data lives here only). Applied by `supabase db reset`.
-- Never run against production.
--
-- Demo logins
--   Owner (email):        owner@demo.krudex.test  /  krudex-demo-2026
--   Platform admin:       admin@demo.krudex.test  /  krudex-demo-2026   → /admin
--   Kitchen (PIN):        1234   at /pin/<dine-in outlet id>  or the KDS link in Staff
--   Floor staff (PIN):    5678
--   Canteen counter (PIN): 2468  at the canteen outlet

-- ---------------------------------------------------------------------------
-- Auth users (email + password; PIN staff get reserved .invalid addresses)
-- ---------------------------------------------------------------------------
create or replace function pg_temp.seed_user(p_id uuid, p_email text, p_password text)
returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, jsonb_build_object('sub', p_id::text, 'email', p_email), 'email', now(), now(), now());
end;
$$;

select pg_temp.seed_user('d0000000-0000-4000-8000-000000000001', 'owner@demo.krudex.test', 'krudex-demo-2026');
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000002', 'admin@demo.krudex.test', 'krudex-demo-2026');
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000003', 'pin-kitchen@staff.krudex.invalid', encode(extensions.gen_random_bytes(24), 'hex'));
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000004', 'pin-floor@staff.krudex.invalid', encode(extensions.gen_random_bytes(24), 'hex'));
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000005', 'pin-counter@staff.krudex.invalid', encode(extensions.gen_random_bytes(24), 'hex'));

insert into public.platform_admins (user_id) values ('d0000000-0000-4000-8000-000000000002');

-- ---------------------------------------------------------------------------
-- Tenant, outlets, staff
-- ---------------------------------------------------------------------------
insert into public.tenants (id, name, slug, gstin) values
  ('e0000000-0000-4000-8000-000000000001', 'Spice Route Kitchens', 'spice-route', '29ABCDE1234F1Z5');

insert into public.outlets (id, tenant_id, name, mode, address, service_charge_bps, auto_accept, payment_options) values
  ('e1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Indiranagar', 'dine_in',
   '100 Feet Road, Indiranagar, Bengaluru 560038', 0, false, '{"online": true, "cash": true, "prepaid_only": false}'),
  ('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'Campus Canteen', 'canteen',
   'Block C, Tech Park, Bengaluru', 0, true, '{"online": true, "cash": true, "prepaid_only": true}');

insert into public.members (tenant_id, user_id, display_name, role, outlet_id, pin_hash) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Asha Rao', 'owner', null, null),
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'Kitchen', 'kitchen', 'e1000000-0000-4000-8000-000000000001', extensions.crypt('1234', extensions.gen_salt('bf', 10))),
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 'Ravi (floor)', 'waiter', 'e1000000-0000-4000-8000-000000000001', extensions.crypt('5678', extensions.gen_salt('bf', 10))),
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', 'Counter', 'waiter', 'e1000000-0000-4000-8000-000000000002', extensions.crypt('2468', extensions.gen_salt('bf', 10)));

insert into public.tables (tenant_id, outlet_id, label, seats)
select 'e0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'T' || n, case when n <= 6 then 4 else 2 end
from generate_series(1, 10) as n;

-- ---------------------------------------------------------------------------
-- Menu: 30 items across 6 categories (Indiranagar), smaller copy for the canteen
-- ---------------------------------------------------------------------------
create temp table seed_menu (cat text, cat_order int, name text, descr text, price int, veg boolean, tags text[], station text);
insert into seed_menu values
  ('Starters', 0, 'Gobi 65', 'Crisp cauliflower, curry leaves, green chilli.', 18000, true, '{spicy}', 'Fry'),
  ('Starters', 0, 'Paneer Tikka', 'Charred cottage cheese, mint chutney.', 26000, true, '{gluten_free}', 'Tandoor'),
  ('Starters', 0, 'Chicken 65', 'Classic Chennai-style fried chicken.', 26000, false, '{spicy}', 'Fry'),
  ('Starters', 0, 'Hara Bhara Kebab', 'Spinach and pea patties.', 19000, true, '{vegan}', 'Tandoor'),
  ('Starters', 0, 'Fish Amritsari', 'Gram-flour battered fish, chaat masala.', 32000, false, '{}', 'Fry'),
  ('South Indian', 1, 'Masala Dosa', 'Rice crêpe, spiced potato, sambar and chutneys.', 12000, true, '{gluten_free}', 'Tawa'),
  ('South Indian', 1, 'Ghee Roast Dosa', 'Paper-thin, roasted in ghee.', 14000, true, '{gluten_free}', 'Tawa'),
  ('South Indian', 1, 'Idli (2)', 'Steamed rice cakes, sambar, chutney.', 7000, true, '{vegan,gluten_free,jain}', 'Tawa'),
  ('South Indian', 1, 'Medu Vada (2)', 'Lentil fritters.', 8000, true, '{vegan}', 'Fry'),
  ('South Indian', 1, 'Rava Upma', 'Semolina, vegetables, cashew.', 9000, true, '{}', 'Tawa'),
  ('Mains', 2, 'Chicken Biryani', 'Dum-cooked basmati, raita.', 28000, false, '{spicy}', 'Biryani'),
  ('Mains', 2, 'Veg Biryani', 'Seasonal vegetables, saffron rice.', 22000, true, '{}', 'Biryani'),
  ('Mains', 2, 'Butter Chicken', 'Tomato-butter gravy, kasuri methi.', 30000, false, '{gluten_free}', 'Curry'),
  ('Mains', 2, 'Paneer Butter Masala', 'Cottage cheese in rich gravy.', 26000, true, '{gluten_free}', 'Curry'),
  ('Mains', 2, 'Dal Makhani', 'Slow-cooked black lentils.', 21000, true, '{gluten_free}', 'Curry'),
  ('Mains', 2, 'Veg Thali', 'Two curries, dal, rice, roti, dessert.', 24000, true, '{}', 'Curry'),
  ('Breads', 3, 'Butter Naan', null, 6000, true, '{}', 'Tandoor'),
  ('Breads', 3, 'Garlic Naan', null, 7000, true, '{}', 'Tandoor'),
  ('Breads', 3, 'Tandoori Roti', null, 4000, true, '{vegan}', 'Tandoor'),
  ('Breads', 3, 'Laccha Paratha', null, 6500, true, '{}', 'Tandoor'),
  ('Drinks', 4, 'Filter Coffee', 'South Indian decoction, frothed.', 6000, true, '{gluten_free}', 'Drinks'),
  ('Drinks', 4, 'Masala Chai', null, 5000, true, '{gluten_free}', 'Drinks'),
  ('Drinks', 4, 'Sweet Lassi', null, 9000, true, '{gluten_free}', 'Drinks'),
  ('Drinks', 4, 'Fresh Lime Soda', 'Sweet, salted or mixed.', 7000, true, '{vegan,gluten_free}', 'Drinks'),
  ('Drinks', 4, 'Mango Lassi', null, 11000, true, '{gluten_free}', 'Drinks'),
  ('Desserts', 5, 'Gulab Jamun (2)', null, 9000, true, '{}', 'Dessert'),
  ('Desserts', 5, 'Rasmalai', null, 12000, true, '{gluten_free}', 'Dessert'),
  ('Desserts', 5, 'Kulfi', 'Pistachio, saffron.', 10000, true, '{gluten_free}', 'Dessert'),
  ('Desserts', 5, 'Payasam', 'Vermicelli kheer.', 9000, true, '{}', 'Dessert'),
  ('Desserts', 5, 'Brownie with Ice Cream', null, 16000, true, '{}', 'Dessert');

insert into public.menu_categories (tenant_id, outlet_id, name, sort_order)
select distinct 'e0000000-0000-4000-8000-000000000001'::uuid, o.id, m.cat, m.cat_order
from seed_menu m cross join (values ('e1000000-0000-4000-8000-000000000001'::uuid), ('e1000000-0000-4000-8000-000000000002'::uuid)) as o(id)
where o.id = 'e1000000-0000-4000-8000-000000000001' or m.cat in ('South Indian', 'Drinks');

insert into public.menu_items (tenant_id, outlet_id, category_id, name, description, price, is_veg, dietary_tags, prep_station, sort_order)
select c.tenant_id, c.outlet_id, c.id, m.name, m.descr, m.price, m.veg,
       m.tags || case when m.veg then '{veg}'::text[] else '{}'::text[] end,
       m.station, row_number() over (partition by c.id order by m.name)
from seed_menu m
join public.menu_categories c on c.name = m.cat;

-- Variants and add-ons on a few items.
insert into public.item_variants (tenant_id, item_id, name, price_delta, is_default, sort_order)
select i.tenant_id, i.id, v.name, v.delta, v.def, v.ord
from public.menu_items i
cross join (values ('Regular', 0, true, 0), ('Family pack', 18000, false, 1)) as v(name, delta, def, ord)
where i.name in ('Chicken Biryani', 'Veg Biryani') and i.outlet_id = 'e1000000-0000-4000-8000-000000000001';

with g as (
  insert into public.addon_groups (tenant_id, item_id, name, min_select, max_select)
  select i.tenant_id, i.id, 'Extras', 0, 2 from public.menu_items i where i.name in ('Masala Dosa', 'Ghee Roast Dosa')
  returning id, tenant_id
)
insert into public.addons (tenant_id, group_id, name, price, sort_order)
select g.tenant_id, g.id, a.name, a.price, a.ord
from g cross join (values ('Extra chutney', 1000, 0), ('Cheese', 3000, 1), ('Podi', 1500, 2)) as a(name, price, ord);

-- One item sold out, to show the state.
update public.menu_items set available = false where name = 'Fish Amritsari';
