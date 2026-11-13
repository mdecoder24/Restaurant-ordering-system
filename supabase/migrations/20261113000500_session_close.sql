-- T16: settle and close a session atomically (D-06). Called with the service role after the
-- route has authorised the staff member and confirmed nothing is still due.
create or replace function public.close_session(
  p_session uuid,
  p_invoice_no text,
  p_totals jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.table_sessions;
  inv uuid;
begin
  select * into s from public.table_sessions where id = p_session for update;
  if not found or s.status <> 'open' then
    raise exception 'session is not open' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.orders where session_id = p_session and status in ('placed', 'accepted', 'preparing', 'ready')) then
    raise exception 'orders still in progress' using errcode = 'P0001';
  end if;

  if p_invoice_no is not null then
    insert into public.invoices (tenant_id, outlet_id, session_id, invoice_no, totals)
    values (s.tenant_id, s.outlet_id, s.id, p_invoice_no, p_totals)
    returning id into inv;
  end if;

  update public.table_sessions set status = 'closed', closed_at = now() where id = s.id;
  update public.service_requests set status = 'resolved' where session_id = s.id and status <> 'resolved';
  if s.table_id is not null then
    update public.tables set status = 'free' where id = s.table_id;
  end if;
  return inv;
end;
$$;
revoke all on function public.close_session(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.close_session(uuid, text, jsonb) to service_role;
