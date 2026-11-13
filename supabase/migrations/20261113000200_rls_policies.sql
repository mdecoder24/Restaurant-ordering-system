-- T04: row level security for staff (docs/02-architecture.md §4, §12).
-- Guests never reach these tables directly; guest traffic uses route handlers with the
-- service role after validating the QR token and session cookie (AGENTS.md rule 5).
-- Only the `authenticated` role gets policies; `anon` has none, so it is denied everywhere.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- True when the caller is an active member of the tenant with one of `roles`, and their
-- outlet scope (null = all outlets) covers `p_outlet` (null = tenant-level check).
-- SECURITY DEFINER so the lookup is not itself subject to members' RLS (no recursion).
create or replace function private.has_role(
  p_tenant uuid,
  p_outlet uuid,
  roles public.member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    join public.tenants t on t.id = m.tenant_id
    where m.user_id = (select auth.uid())
      and m.active
      and t.status = 'active'
      and m.tenant_id = p_tenant
      and m.role = any (roles)
      and (m.outlet_id is null or p_outlet is null or m.outlet_id = p_outlet)
  );
$$;

create or replace function private.is_member(p_tenant uuid, p_outlet uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(p_tenant, p_outlet, enum_range(null::public.member_role));
$$;

-- Outlet of a menu item, for child tables (variants, add-on groups) that only know the item.
create or replace function private.item_outlet(p_item uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select outlet_id from public.menu_items where id = p_item;
$$;

create or replace function private.addon_group_outlet(p_group uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select i.outlet_id
  from public.addon_groups g
  join public.menu_items i on i.id = g.item_id
  where g.id = p_group;
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- tenants: members read; owners update. Creation goes through onboard_tenant().
-- ---------------------------------------------------------------------------
create policy tenants_select on public.tenants for select to authenticated
  using (private.is_member(id, null));
create policy tenants_update on public.tenants for update to authenticated
  using (private.has_role(id, null, '{owner}'))
  with check (private.has_role(id, null, '{owner}'));

-- Tenants may not change their own plan or status; that is the platform admin's job.
revoke update on public.tenants from authenticated;
grant update (name, gstin) on public.tenants to authenticated;

-- ---------------------------------------------------------------------------
-- outlets: scoped members read; owners create/delete; owner or outlet manager update.
-- ---------------------------------------------------------------------------
create policy outlets_select on public.outlets for select to authenticated
  using (private.is_member(tenant_id, id));
create policy outlets_insert on public.outlets for insert to authenticated
  with check (private.has_role(tenant_id, null, '{owner}'));
create policy outlets_update on public.outlets for update to authenticated
  using (private.has_role(tenant_id, id, '{owner,manager}'))
  with check (private.has_role(tenant_id, id, '{owner,manager}'));
create policy outlets_delete on public.outlets for delete to authenticated
  using (private.has_role(tenant_id, null, '{owner}'));

-- ---------------------------------------------------------------------------
-- members: owners and managers read staff; each member reads their own row;
-- only owners write. pin_hash is never readable through the API.
-- ---------------------------------------------------------------------------
create policy members_select on public.members for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role(tenant_id, outlet_id, '{owner,manager}')
  );
create policy members_insert on public.members for insert to authenticated
  with check (private.has_role(tenant_id, null, '{owner}'));
create policy members_update on public.members for update to authenticated
  using (private.has_role(tenant_id, null, '{owner}'))
  with check (private.has_role(tenant_id, null, '{owner}'));
create policy members_delete on public.members for delete to authenticated
  using (private.has_role(tenant_id, null, '{owner}'));

revoke select on public.members from authenticated, anon;
grant select (id, tenant_id, user_id, display_name, role, outlet_id, active, created_at, updated_at)
  on public.members to authenticated;

-- ---------------------------------------------------------------------------
-- Outlet-owned tables: scoped members read; owners and managers write.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['tables', 'menu_categories', 'menu_items'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_member(tenant_id, outlet_id))',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.has_role(tenant_id, outlet_id, ''{owner,manager}''))',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.has_role(tenant_id, outlet_id, ''{owner,manager}'')) with check (private.has_role(tenant_id, outlet_id, ''{owner,manager}''))',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.has_role(tenant_id, outlet_id, ''{owner,manager}''))',
      t || '_delete', t);
  end loop;
end;
$$;

-- Item children resolve their outlet through the parent item.
do $$
declare
  t text;
  outlet_expr text;
begin
  foreach t in array array['item_variants', 'addon_groups', 'addons'] loop
    outlet_expr := case t
      when 'addons' then 'private.addon_group_outlet(group_id)'
      else 'private.item_outlet(item_id)'
    end;
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_member(tenant_id, %s))',
      t || '_select', t, outlet_expr);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.has_role(tenant_id, %s, ''{owner,manager}''))',
      t || '_insert', t, outlet_expr);
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.has_role(tenant_id, %s, ''{owner,manager}'')) with check (private.has_role(tenant_id, %s, ''{owner,manager}''))',
      t || '_update', t, outlet_expr, outlet_expr);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.has_role(tenant_id, %s, ''{owner,manager}''))',
      t || '_delete', t, outlet_expr);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Waiters may toggle availability only (Architecture §4 role table).
-- ---------------------------------------------------------------------------
create or replace function public.set_items_availability(item_ids uuid[], is_available boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.menu_items i
     set available = is_available
   where i.id = any (item_ids)
     and private.has_role(i.tenant_id, i.outlet_id, '{owner,manager,waiter}');
  get diagnostics changed = row_count;
  return changed;
end;
$$;
revoke all on function public.set_items_availability(uuid[], boolean) from public, anon;
grant execute on function public.set_items_availability(uuid[], boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Onboarding (D-09): an authenticated user creates a tenant, its first outlet and
-- their owner membership in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.onboard_tenant(
  p_tenant_name text,
  p_slug text,
  p_outlet_name text,
  p_mode public.outlet_mode,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_tenant uuid;
  new_outlet uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.tenants (name, slug) values (p_tenant_name, p_slug)
  returning id into new_tenant;

  insert into public.outlets (tenant_id, name, mode) values (new_tenant, p_outlet_name, p_mode)
  returning id into new_outlet;

  insert into public.members (tenant_id, user_id, display_name, role)
  values (new_tenant, uid, p_display_name, 'owner');

  return new_outlet;
end;
$$;
revoke all on function public.onboard_tenant(text, text, text, public.outlet_mode, text) from public, anon;
grant execute on function public.onboard_tenant(text, text, text, public.outlet_mode, text) to authenticated;
