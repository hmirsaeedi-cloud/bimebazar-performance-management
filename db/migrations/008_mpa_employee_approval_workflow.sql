create table if not exists public.mpa_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'closed', 'archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mpa_cycles_valid_dates check (ends_on >= starts_on)
);

create table if not exists public.mpas (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  hrbp_id uuid references public.profiles(id) on delete set null,
  cycle_id uuid not null references public.mpa_cycles(id) on delete cascade,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'returned', 'employee_approved', 'manager_approved', 'active', 'archived')),
  owner_role text not null default 'MANAGER'
    check (owner_role in ('EMPLOYEE', 'MANAGER', 'HRBP', 'SYSTEM')),
  next_action text,
  submitted_at timestamptz,
  employee_approved_at timestamptz,
  manager_approved_at timestamptz,
  activated_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_mpas_one_active_per_employee_cycle
on public.mpas(employee_id, cycle_id)
where status <> 'archived';

create index if not exists idx_mpas_employee_id on public.mpas(employee_id);
create index if not exists idx_mpas_manager_id on public.mpas(manager_id);
create index if not exists idx_mpas_hrbp_id on public.mpas(hrbp_id);
create index if not exists idx_mpas_cycle_id on public.mpas(cycle_id);
create index if not exists idx_mpas_status on public.mpas(status);
create index if not exists idx_mpa_cycles_status on public.mpa_cycles(status);

insert into public.permissions (code, description)
values
  ('mpa.read', 'Read authorized MPAs'),
  ('mpa.create', 'Create MPAs'),
  ('mpa.update', 'Update draft or returned MPAs'),
  ('mpa.submit', 'Submit MPAs for employee approval'),
  ('mpa.approve_employee', 'Employee approval for MPA'),
  ('mpa.approve_manager', 'Manager approval for MPA'),
  ('mpa.activate', 'HRBP activation for approved MPA'),
  ('mpa.return', 'Return MPA for revision'),
  ('mpa.archive', 'Archive MPAs')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'mpa.read'),
  ('EMPLOYEE', 'mpa.approve_employee'),
  ('MANAGER', 'mpa.read'),
  ('MANAGER', 'mpa.create'),
  ('MANAGER', 'mpa.update'),
  ('MANAGER', 'mpa.submit'),
  ('MANAGER', 'mpa.approve_manager'),
  ('MANAGER', 'mpa.return'),
  ('HRBP', 'mpa.read'),
  ('HRBP', 'mpa.activate'),
  ('HRBP', 'mpa.return'),
  ('HR_ADMIN', 'mpa.read'),
  ('HR_ADMIN', 'mpa.create'),
  ('HR_ADMIN', 'mpa.update'),
  ('HR_ADMIN', 'mpa.submit'),
  ('HR_ADMIN', 'mpa.approve_employee'),
  ('HR_ADMIN', 'mpa.approve_manager'),
  ('HR_ADMIN', 'mpa.activate'),
  ('HR_ADMIN', 'mpa.return'),
  ('HR_ADMIN', 'mpa.archive')
on conflict do nothing;

alter table public.mpa_cycles enable row level security;
alter table public.mpas enable row level security;

grant select on public.mpa_cycles to authenticated;
grant insert, update on public.mpa_cycles to authenticated;
grant select on public.mpas to authenticated;
grant insert, update on public.mpas to authenticated;
grant all on public.mpa_cycles to service_role;
grant all on public.mpas to service_role;

drop policy if exists "hr can read mpa cycles" on public.mpa_cycles;
create policy "hr can read mpa cycles"
on public.mpa_cycles for select
to authenticated
using (
  (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('MANAGER'))
);

drop policy if exists "hr admin can write mpa cycles" on public.mpa_cycles;
create policy "hr admin can write mpa cycles"
on public.mpa_cycles for all
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')))
with check ((select app_private.current_user_has_role('HR_ADMIN')));

drop policy if exists "authorized users can read mpas" on public.mpas;
create policy "authorized users can read mpas"
on public.mpas for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "managers can create mpas" on public.mpas;
create policy "managers can create mpas"
on public.mpas for insert
to authenticated
with check (
  manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "authorized users can update mpas" on public.mpas;
create policy "authorized users can update mpas"
on public.mpas for update
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
);
