create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_unit_id, name)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, name)
);

alter table public.profiles
  add column if not exists full_name_persian text,
  add column if not exists full_name_english text,
  add column if not exists username text,
  add column if not exists join_date date,
  add column if not exists exit_date date,
  add column if not exists manager_id uuid references public.profiles(id) on delete set null,
  add column if not exists team_id uuid references public.teams(id) on delete restrict,
  add column if not exists business_unit_id uuid references public.business_units(id) on delete restrict,
  add column if not exists department_id uuid references public.departments(id) on delete restrict,
  add column if not exists level text,
  add column if not exists position_title text,
  add column if not exists phone text,
  add column if not exists function_lead_id uuid references public.profiles(id) on delete set null,
  add column if not exists hrbp_id uuid references public.profiles(id) on delete set null;

update public.profiles
set full_name_english = coalesce(full_name_english, display_name),
    full_name_persian = coalesce(full_name_persian, display_name),
    username = coalesce(username, split_part(email::text, '@', 1)),
    join_date = coalesce(join_date, current_date),
    level = coalesce(level, 'L1'),
    position_title = coalesce(position_title, 'Not assigned')
where full_name_english is null
   or full_name_persian is null
   or username is null
   or join_date is null
   or level is null
   or position_title is null;

create unique index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_manager_id on public.profiles(manager_id);
create index if not exists idx_profiles_function_lead_id on public.profiles(function_lead_id);
create index if not exists idx_profiles_hrbp_id on public.profiles(hrbp_id);
create index if not exists idx_profiles_business_unit_id on public.profiles(business_unit_id);
create index if not exists idx_profiles_department_id on public.profiles(department_id);
create index if not exists idx_profiles_team_id on public.profiles(team_id);
create index if not exists idx_departments_business_unit_id on public.departments(business_unit_id);
create index if not exists idx_teams_department_id on public.teams(department_id);

insert into public.permissions (code, description)
values
  ('profiles.read', 'Read employee profiles'),
  ('profiles.create', 'Create employee profiles manually'),
  ('profiles.update', 'Update employee profiles manually'),
  ('profiles.deactivate', 'Deactivate employee profiles'),
  ('org_units.read', 'Read business units, departments, and teams'),
  ('org_units.write', 'Create and update org units')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'profiles.read'),
  ('MANAGER', 'profiles.read'),
  ('NEXT_LEVEL_MANAGER', 'profiles.read'),
  ('HRBP', 'profiles.read'),
  ('HRBP', 'profiles.update'),
  ('HRBP', 'org_units.read'),
  ('HR_ADMIN', 'profiles.read'),
  ('HR_ADMIN', 'profiles.create'),
  ('HR_ADMIN', 'profiles.update'),
  ('HR_ADMIN', 'profiles.deactivate'),
  ('HR_ADMIN', 'org_units.read'),
  ('HR_ADMIN', 'org_units.write')
on conflict do nothing;

alter table public.business_units enable row level security;
alter table public.departments enable row level security;
alter table public.teams enable row level security;

grant select on public.business_units to authenticated;
grant select on public.departments to authenticated;
grant select on public.teams to authenticated;
grant insert, update on public.business_units to authenticated;
grant insert, update on public.departments to authenticated;
grant insert, update on public.teams to authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.business_units to service_role;
grant all on public.departments to service_role;
grant all on public.teams to service_role;

drop policy if exists "authenticated can read business units" on public.business_units;
create policy "authenticated can read business units"
on public.business_units for select
to authenticated
using (true);

drop policy if exists "authenticated can read departments" on public.departments;
create policy "authenticated can read departments"
on public.departments for select
to authenticated
using (true);

drop policy if exists "authenticated can read teams" on public.teams;
create policy "authenticated can read teams"
on public.teams for select
to authenticated
using (true);

drop policy if exists "hr admin can write business units" on public.business_units;
create policy "hr admin can write business units"
on public.business_units for all
to authenticated
using ((select app_private.current_user_role()) = 'HR_ADMIN')
with check ((select app_private.current_user_role()) = 'HR_ADMIN');

drop policy if exists "hr admin can write departments" on public.departments;
create policy "hr admin can write departments"
on public.departments for all
to authenticated
using ((select app_private.current_user_role()) = 'HR_ADMIN')
with check ((select app_private.current_user_role()) = 'HR_ADMIN');

drop policy if exists "hr admin can write teams" on public.teams;
create policy "hr admin can write teams"
on public.teams for all
to authenticated
using ((select app_private.current_user_role()) = 'HR_ADMIN')
with check ((select app_private.current_user_role()) = 'HR_ADMIN');

drop policy if exists "managers can read direct report profiles" on public.profiles;
create policy "managers can read direct report profiles"
on public.profiles for select
to authenticated
using (manager_id = (select auth.uid()));

drop policy if exists "function leads can read assigned profiles" on public.profiles;
create policy "function leads can read assigned profiles"
on public.profiles for select
to authenticated
using (function_lead_id = (select auth.uid()));

drop policy if exists "hrbps can read assigned profiles" on public.profiles;
create policy "hrbps can read assigned profiles"
on public.profiles for select
to authenticated
using (hrbp_id = (select auth.uid()));

drop policy if exists "hr can write profiles" on public.profiles;
create policy "hr can write profiles"
on public.profiles for all
to authenticated
using (
  (select app_private.current_user_role()) = 'HR_ADMIN'
  or (
    (select app_private.current_user_role()) = 'HRBP'
    and hrbp_id = (select auth.uid())
  )
)
with check (
  (select app_private.current_user_role()) = 'HR_ADMIN'
  or (
    (select app_private.current_user_role()) = 'HRBP'
    and hrbp_id = (select auth.uid())
  )
);

insert into public.business_units (name)
values ('Default Business Unit')
on conflict (name) do nothing;

insert into public.departments (business_unit_id, name)
select id, 'Default Department'
from public.business_units
where name = 'Default Business Unit'
on conflict (business_unit_id, name) do nothing;

insert into public.teams (department_id, name)
select d.id, 'Default Team'
from public.departments d
join public.business_units bu on bu.id = d.business_unit_id
where bu.name = 'Default Business Unit'
  and d.name = 'Default Department'
on conflict (department_id, name) do nothing;
