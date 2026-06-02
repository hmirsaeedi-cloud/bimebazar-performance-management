create table if not exists public.pip_cases (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references auth.users(id) on delete cascade,
  manager_id uuid references auth.users(id) on delete set null,
  hrbp_id uuid references auth.users(id) on delete set null,
  source_evaluation_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'hrbp_approved', 'visibility_active', 'active', 'completed', 'returned', 'cancelled')),
  owner_role text not null default 'MANAGER'
    check (owner_role in ('MANAGER', 'HRBP', 'SYSTEM')),
  next_action text,
  employee_visible boolean not null default false,
  performance_concern text not null,
  success_criteria text not null,
  support_plan text not null,
  start_date date,
  due_date date,
  checkpoints jsonb not null default '[]'::jsonb,
  visibility jsonb not null default '{"employeeCanView":false,"managerCanView":true,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  submitted_at timestamptz,
  hrbp_approved_at timestamptz,
  visibility_activated_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  returned_at timestamptz,
  cancelled_at timestamptz,
  visibility_changed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pip_cases_employee_status
  on public.pip_cases(employee_id, status);

create index if not exists idx_pip_cases_manager_status
  on public.pip_cases(manager_id, status);

insert into public.permissions (code, description)
values
  ('pip.read', 'Read PIP cases'),
  ('pip.create', 'Create PIP cases'),
  ('pip.update', 'Update draft or active PIP cases'),
  ('pip.submit', 'Submit PIP cases for HRBP review'),
  ('pip.approve', 'Approve PIP cases'),
  ('pip.activate_visibility', 'Activate employee visibility for PIP cases'),
  ('pip.return', 'Return PIP cases for revision'),
  ('pip.override', 'Override PIP visibility'),
  ('pip.complete', 'Complete PIP cases'),
  ('pip.cancel', 'Cancel PIP cases')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('MANAGER', 'pip.read'),
  ('MANAGER', 'pip.create'),
  ('MANAGER', 'pip.update'),
  ('MANAGER', 'pip.submit'),
  ('MANAGER', 'pip.complete'),
  ('MANAGER', 'pip.cancel'),
  ('HRBP', 'pip.read'),
  ('HRBP', 'pip.create'),
  ('HRBP', 'pip.update'),
  ('HRBP', 'pip.submit'),
  ('HRBP', 'pip.approve'),
  ('HRBP', 'pip.activate_visibility'),
  ('HRBP', 'pip.return'),
  ('HRBP', 'pip.override'),
  ('HRBP', 'pip.complete'),
  ('HRBP', 'pip.cancel'),
  ('HR_ADMIN', 'pip.read'),
  ('HR_ADMIN', 'pip.create'),
  ('HR_ADMIN', 'pip.update'),
  ('HR_ADMIN', 'pip.submit'),
  ('HR_ADMIN', 'pip.approve'),
  ('HR_ADMIN', 'pip.activate_visibility'),
  ('HR_ADMIN', 'pip.return'),
  ('HR_ADMIN', 'pip.override'),
  ('HR_ADMIN', 'pip.complete'),
  ('HR_ADMIN', 'pip.cancel')
on conflict do nothing;

alter table public.pip_cases enable row level security;

grant select, insert, update on public.pip_cases to authenticated;
grant all on public.pip_cases to service_role;

drop policy if exists "pip cases visible only after HRBP activation" on public.pip_cases;
create policy "pip cases visible only after HRBP activation"
on public.pip_cases for select
to authenticated
using (
  manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (employee_visible is true and employee_id = (select auth.uid()))
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "pip cases can be created by reviewers" on public.pip_cases;
create policy "pip cases can be created by reviewers"
on public.pip_cases for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and employee_visible is false
  and (
    manager_id = (select auth.uid())
    or hrbp_id = (select auth.uid())
    or (select app_private.current_user_has_role('HR_ADMIN'))
    or (select app_private.current_user_has_role('HRBP'))
  )
);

drop policy if exists "pip cases can be updated by reviewers" on public.pip_cases;
create policy "pip cases can be updated by reviewers"
on public.pip_cases for update
to authenticated
using (
  manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
)
with check (
  manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

insert into public.pip_cases (
  employee_id,
  manager_id,
  hrbp_id,
  status,
  owner_role,
  next_action,
  employee_visible,
  performance_concern,
  success_criteria,
  support_plan,
  start_date,
  due_date,
  checkpoints,
  created_by,
  updated_by
)
select
  p.id,
  p.manager_id,
  p.hrbp_id,
  'draft',
  'MANAGER',
  'submit',
  false,
  'Seed PIP performance concern for workflow validation.',
  'Meet agreed quality and delivery expectations for two consecutive checkpoints.',
  'Weekly manager check-ins and HRBP support.',
  (current_date + interval '7 days')::date,
  (current_date + interval '67 days')::date,
  '[{"label":"Checkpoint 1","dueInDays":14},{"label":"Checkpoint 2","dueInDays":30}]'::jsonb,
  coalesce(p.manager_id, p.id),
  coalesce(p.manager_id, p.id)
from public.profiles p
where p.account_status = 'active'
order by p.created_at
limit 1
on conflict do nothing;
