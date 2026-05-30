create extension if not exists citext;

create table if not exists public.roles (
  code text primary key,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  code text primary key,
  description text not null
);

create table if not exists public.role_permissions (
  role_code text not null references public.roles(code) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role_code, permission_code)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  display_name text not null,
  employee_id text unique,
  role_code text not null references public.roles(code),
  account_status text not null default 'invited'
    check (account_status in ('invited', 'active', 'locked', 'deactivated')),
  failed_login_count integer not null default 0,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  target_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  from_status text,
  to_status text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_role_code on public.profiles(role_code);
create index if not exists idx_role_permissions_permission_code on public.role_permissions(permission_code);
create index if not exists idx_audit_events_actor on public.audit_events(actor_user_id);
create index if not exists idx_audit_events_target on public.audit_events(target_user_id);
create index if not exists idx_audit_events_created_at on public.audit_events(created_at);

create schema if not exists app_private;

create or replace function app_private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role_code
  from public.profiles
  where id = (select auth.uid())
    and account_status = 'active';
$$;

grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_role() to authenticated;

insert into public.roles (code, label)
values
  ('EMPLOYEE', 'Employee'),
  ('MANAGER', 'Manager'),
  ('NEXT_LEVEL_MANAGER', 'Next Level Manager'),
  ('HRBP', 'HR Business Partner'),
  ('HR_ADMIN', 'HR Admin')
on conflict (code) do update set label = excluded.label;

insert into public.permissions (code, description)
values
  ('auth.login', 'Log in to the platform'),
  ('auth.logout', 'Log out from the platform'),
  ('auth.me', 'Read current user session'),
  ('auth.create_user', 'Create platform users'),
  ('auth.deactivate_user', 'Deactivate platform users'),
  ('storage.profile_documents.read', 'Read authorized profile documents'),
  ('storage.profile_documents.write', 'Upload authorized profile documents')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'auth.login'),
  ('EMPLOYEE', 'auth.logout'),
  ('EMPLOYEE', 'auth.me'),
  ('MANAGER', 'auth.login'),
  ('MANAGER', 'auth.logout'),
  ('MANAGER', 'auth.me'),
  ('NEXT_LEVEL_MANAGER', 'auth.login'),
  ('NEXT_LEVEL_MANAGER', 'auth.logout'),
  ('NEXT_LEVEL_MANAGER', 'auth.me'),
  ('HRBP', 'auth.login'),
  ('HRBP', 'auth.logout'),
  ('HRBP', 'auth.me'),
  ('HRBP', 'storage.profile_documents.read'),
  ('HR_ADMIN', 'auth.login'),
  ('HR_ADMIN', 'auth.logout'),
  ('HR_ADMIN', 'auth.me'),
  ('HR_ADMIN', 'auth.create_user'),
  ('HR_ADMIN', 'auth.deactivate_user'),
  ('HR_ADMIN', 'storage.profile_documents.read'),
  ('HR_ADMIN', 'storage.profile_documents.write')
on conflict do nothing;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_events enable row level security;

grant select on public.roles to authenticated;
grant select on public.permissions to authenticated;
grant select on public.role_permissions to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert, select on public.audit_events to authenticated;
grant all on public.roles to service_role;
grant all on public.permissions to service_role;
grant all on public.role_permissions to service_role;
grant all on public.profiles to service_role;
grant all on public.audit_events to service_role;

drop policy if exists "authenticated can read roles" on public.roles;
create policy "authenticated can read roles"
on public.roles for select
to authenticated
using (true);

drop policy if exists "authenticated can read permissions" on public.permissions;
create policy "authenticated can read permissions"
on public.permissions for select
to authenticated
using (true);

drop policy if exists "authenticated can read role permissions" on public.role_permissions;
create policy "authenticated can read role permissions"
on public.role_permissions for select
to authenticated
using (true);

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "hr can read all profiles" on public.profiles;
create policy "hr can read all profiles"
on public.profiles for select
to authenticated
using ((select app_private.current_user_role()) in ('HR_ADMIN', 'HRBP'));

drop policy if exists "users can update own profile basics" on public.profiles;
create policy "users can update own profile basics"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check (
  (select auth.uid()) = id
);

drop policy if exists "users can write own audit rows" on public.audit_events;
create policy "users can write own audit rows"
on public.audit_events for insert
to authenticated
with check (actor_user_id = (select auth.uid()));

drop policy if exists "users can read own audit rows" on public.audit_events;
create policy "users can read own audit rows"
on public.audit_events for select
to authenticated
using (
  actor_user_id = (select auth.uid())
  or target_user_id = (select auth.uid())
  or (select app_private.current_user_role()) in ('HR_ADMIN', 'HRBP')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-documents',
  'profile-documents',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile document owners can read" on storage.objects;
create policy "profile document owners can read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-documents'
  and (
    owner_id = (select auth.uid())::text
    or (select app_private.current_user_role()) in ('HR_ADMIN', 'HRBP')
  )
);

drop policy if exists "hr admins can upload profile documents" on storage.objects;
create policy "hr admins can upload profile documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-documents'
  and (select app_private.current_user_role()) = 'HR_ADMIN'
);

drop policy if exists "hr admins can update profile documents" on storage.objects;
create policy "hr admins can update profile documents"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-documents'
  and (select app_private.current_user_role()) = 'HR_ADMIN'
)
with check (
  bucket_id = 'profile-documents'
  and (select app_private.current_user_role()) = 'HR_ADMIN'
);
