create table if not exists public.profile_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_code text not null references public.roles(code) on delete cascade,
  assignment_type text not null default 'manual'
    check (assignment_type in ('manual', 'computed')),
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  assigned_by uuid references auth.users(id),
  revoked_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  reason text,
  primary key (user_id, role_code, assignment_type)
);

insert into public.permissions (code, description)
values
  ('rbac.read', 'Read RBAC roles, permissions, and assignments'),
  ('rbac.assign_role', 'Assign a role to a user'),
  ('rbac.revoke_role', 'Revoke a role from a user'),
  ('rbac.configure_permissions', 'Configure role permission mappings')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HR_ADMIN', 'rbac.read'),
  ('HR_ADMIN', 'rbac.assign_role'),
  ('HR_ADMIN', 'rbac.revoke_role'),
  ('HR_ADMIN', 'rbac.configure_permissions')
on conflict do nothing;

insert into public.profile_roles (user_id, role_code, assignment_type, status, reason)
select id, role_code, 'manual', 'active', 'Backfilled from profiles.role_code'
from public.profiles
on conflict (user_id, role_code, assignment_type) do update
set status = 'active',
    revoked_at = null,
    reason = excluded.reason;

create index if not exists idx_profile_roles_role_code on public.profile_roles(role_code);
create index if not exists idx_profile_roles_status on public.profile_roles(status);
create index if not exists idx_profile_roles_assigned_by on public.profile_roles(assigned_by);
create index if not exists idx_profile_roles_revoked_by on public.profile_roles(revoked_by);

alter table public.profile_roles enable row level security;

grant select on public.profile_roles to authenticated;
grant insert, update on public.profile_roles to authenticated;
grant all on public.profile_roles to service_role;

create or replace function app_private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select pr.role_code
      from public.profile_roles pr
      where pr.user_id = (select auth.uid())
        and pr.status = 'active'
      order by case pr.role_code
        when 'HR_ADMIN' then 1
        when 'HRBP' then 2
        when 'NEXT_LEVEL_MANAGER' then 3
        when 'MANAGER' then 4
        else 5
      end
      limit 1
    ),
    (
      select p.role_code
      from public.profiles p
      where p.id = (select auth.uid())
        and p.account_status = 'active'
    )
  );
$$;

create or replace function app_private.current_user_has_role(target_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.profiles p on p.id = pr.user_id
    where pr.user_id = (select auth.uid())
      and pr.role_code = target_role
      and pr.status = 'active'
      and p.account_status = 'active'
  );
$$;

grant execute on function app_private.current_user_has_role(text) to authenticated;

drop policy if exists "hr admin can read profile roles" on public.profile_roles;
create policy "hr admin can read profile roles"
on public.profile_roles for select
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')));

drop policy if exists "users can read own profile roles" on public.profile_roles;
create policy "users can read own profile roles"
on public.profile_roles for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "hr admin can assign profile roles" on public.profile_roles;
create policy "hr admin can assign profile roles"
on public.profile_roles for insert
to authenticated
with check ((select app_private.current_user_has_role('HR_ADMIN')));

drop policy if exists "hr admin can update profile roles" on public.profile_roles;
create policy "hr admin can update profile roles"
on public.profile_roles for update
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')))
with check ((select app_private.current_user_has_role('HR_ADMIN')));
