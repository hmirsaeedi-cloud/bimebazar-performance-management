create table if not exists public.pd_chat_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'active', 'paused', 'returned', 'visibility_changed', 'archived')),
  owner_role text not null default 'EMPLOYEE_MANAGER'
    check (owner_role in ('EMPLOYEE', 'EMPLOYEE_MANAGER', 'MANAGER', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  topic text not null,
  cadence text not null
    check (cadence in ('weekly', 'biweekly', 'monthly', 'quarterly')),
  start_at timestamptz not null,
  next_occurrence_at timestamptz not null,
  timezone text not null default 'Asia/Tehran',
  duration_minutes integer not null default 45
    check (duration_minutes between 15 and 180),
  generated_count integer not null default 0
    check (generated_count >= 0),
  last_generated_chat_id uuid references public.pd_chat_logs(id) on delete set null,
  visibility jsonb not null default '{"employeeCanView":true,"managerCanView":true,"hrbpCanView":false}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  archived_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pd_chat_schedules_employee_status
  on public.pd_chat_schedules(employee_id, status);

create index if not exists idx_pd_chat_schedules_manager_status
  on public.pd_chat_schedules(manager_id, status);

create index if not exists idx_pd_chat_schedules_next_occurrence
  on public.pd_chat_schedules(status, next_occurrence_at);

insert into public.permissions (code, description)
values
  ('pd_chat.scheduler_read', 'Read recurring PD Chat schedules'),
  ('pd_chat.scheduler_create', 'Create recurring PD Chat schedules'),
  ('pd_chat.scheduler_update', 'Update, pause, resume, and generate recurring PD Chat schedules'),
  ('pd_chat.scheduler_submit', 'Submit recurring PD Chat schedules for review'),
  ('pd_chat.scheduler_approve', 'Approve and activate recurring PD Chat schedules'),
  ('pd_chat.scheduler_return', 'Return recurring PD Chat schedules for revision'),
  ('pd_chat.scheduler_override', 'Override recurring PD Chat schedule visibility'),
  ('pd_chat.scheduler_archive', 'Archive recurring PD Chat schedules')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'pd_chat.scheduler_read'),
  ('EMPLOYEE', 'pd_chat.scheduler_create'),
  ('EMPLOYEE', 'pd_chat.scheduler_update'),
  ('EMPLOYEE', 'pd_chat.scheduler_submit'),
  ('MANAGER', 'pd_chat.scheduler_read'),
  ('MANAGER', 'pd_chat.scheduler_create'),
  ('MANAGER', 'pd_chat.scheduler_update'),
  ('MANAGER', 'pd_chat.scheduler_submit'),
  ('MANAGER', 'pd_chat.scheduler_approve'),
  ('MANAGER', 'pd_chat.scheduler_return'),
  ('MANAGER', 'pd_chat.scheduler_archive'),
  ('HRBP', 'pd_chat.scheduler_read'),
  ('HRBP', 'pd_chat.scheduler_approve'),
  ('HRBP', 'pd_chat.scheduler_return'),
  ('HRBP', 'pd_chat.scheduler_override'),
  ('HRBP', 'pd_chat.scheduler_archive'),
  ('HR_ADMIN', 'pd_chat.scheduler_read'),
  ('HR_ADMIN', 'pd_chat.scheduler_create'),
  ('HR_ADMIN', 'pd_chat.scheduler_update'),
  ('HR_ADMIN', 'pd_chat.scheduler_submit'),
  ('HR_ADMIN', 'pd_chat.scheduler_approve'),
  ('HR_ADMIN', 'pd_chat.scheduler_return'),
  ('HR_ADMIN', 'pd_chat.scheduler_override'),
  ('HR_ADMIN', 'pd_chat.scheduler_archive')
on conflict do nothing;

alter table public.pd_chat_schedules enable row level security;

grant select, insert, update on public.pd_chat_schedules to authenticated;
grant all on public.pd_chat_schedules to service_role;

drop policy if exists "authorized users can read pd chat schedules" on public.pd_chat_schedules;
create policy "authorized users can read pd chat schedules"
on public.pd_chat_schedules for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "authorized users can create pd chat schedules" on public.pd_chat_schedules;
create policy "authorized users can create pd chat schedules"
on public.pd_chat_schedules for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    employee_id = (select auth.uid())
    or manager_id = (select auth.uid())
    or (select app_private.current_user_has_role('MANAGER'))
    or (select app_private.current_user_has_role('HRBP'))
    or (select app_private.current_user_has_role('HR_ADMIN'))
  )
);

drop policy if exists "authorized users can update pd chat schedules" on public.pd_chat_schedules;
create policy "authorized users can update pd chat schedules"
on public.pd_chat_schedules for update
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

with seed_profile as (
  select
    p.id as employee_id,
    coalesce(p.manager_id, p.id) as manager_id
  from public.profiles p
  where p.account_status = 'active'
  order by p.created_at
  limit 1
)
insert into public.pd_chat_schedules (
  employee_id,
  manager_id,
  status,
  owner_role,
  next_action,
  topic,
  cadence,
  start_at,
  next_occurrence_at,
  timezone,
  duration_minutes,
  visibility,
  created_by,
  updated_by
)
select
  employee_id,
  manager_id,
  'draft',
  'EMPLOYEE_MANAGER',
  'update',
  'Recurring development check-in',
  'monthly',
  now() + interval '7 days',
  now() + interval '7 days',
  'Asia/Tehran',
  45,
  '{"employeeCanView":true,"managerCanView":true,"hrbpCanView":false}'::jsonb,
  manager_id,
  manager_id
from seed_profile
on conflict do nothing;
