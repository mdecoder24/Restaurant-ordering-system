-- T20: platform operators (A-01). Granted by SQL only, never from the app:
--   insert into public.platform_admins (user_id) select id from auth.users where email = '<you>';
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
-- A signed-in user may check only whether they themselves are an admin.
create policy platform_admins_self on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

create table public.admin_audit (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null,
  action text not null,
  tenant_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
create trigger admin_audit_append_only before update or delete on public.admin_audit
  for each row execute function private.reject_mutation();
