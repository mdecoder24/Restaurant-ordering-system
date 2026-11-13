-- T21 hardening: concurrent requests with the same Idempotency-Key (a true double tap)
-- could both pass the initial lookup; the loser now returns the winner's order instead of
-- failing. Same signature and grants as before.
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

  -- Same-session requests are serialised by the lock above; re-check so the second of two
  -- identical requests returns the first order without consuming an order number.
  select * into existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    return query select existing.id, existing.order_no, false;
    return;
  end if;

  new_no := private.next_order_no(s.outlet_id);

  begin
    insert into public.orders (tenant_id, outlet_id, session_id, order_no, note, subtotal, service_charge, tax, rounding, total, idempotency_key)
    values (
      s.tenant_id, s.outlet_id, s.id, new_no, nullif(trim(p_note), ''),
      (p_totals ->> 'subtotal')::int, (p_totals ->> 'serviceCharge')::int, (p_totals ->> 'tax')::int,
      (p_totals ->> 'rounding')::int, (p_totals ->> 'total')::int, p_idempotency_key
    )
    returning id into new_id;
  exception when unique_violation then
    -- Two identical requests raced past the lookup above: the first one won.
    select * into existing from public.orders where idempotency_key = p_idempotency_key;
    return query select existing.id, existing.order_no, false;
    return;
  end;

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

