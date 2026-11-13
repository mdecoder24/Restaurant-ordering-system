-- T15: webhook replay protection and refunds (Architecture §9, §12).
create table public.webhook_events (
  id text primary key,
  provider text not null,
  event text not null,
  received_at timestamptz not null default now()
);
alter table public.webhook_events enable row level security;
-- No policies: only the service role (webhook handler) touches it.

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  payment_id uuid not null references public.payments (id) on delete cascade,
  amount integer not null check (amount > 0),
  provider_refund_id text unique,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  reason text,
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index refunds_payment_idx on public.refunds (payment_id);
create trigger refunds_updated_at before update on public.refunds for each row execute function public.set_updated_at();
alter table public.refunds enable row level security;
create policy refunds_select on public.refunds for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id and private.has_role(p.tenant_id, p.outlet_id, '{owner,manager}')));

-- Apply a processed refund idempotently: refunded_amount grows, status flips when full.
create or replace function public.apply_refund(p_refund uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.refunds;
begin
  update public.refunds set status = 'processed' where id = p_refund and status = 'pending' returning * into r;
  if not found then return; end if;
  update public.payments
     set refunded_amount = least(amount, refunded_amount + r.amount),
         status = case when refunded_amount + r.amount >= amount then 'refunded'::public.payment_status else status end
   where id = r.payment_id;
end;
$$;
revoke all on function public.apply_refund(uuid) from public, anon, authenticated;
grant execute on function public.apply_refund(uuid) to service_role;
