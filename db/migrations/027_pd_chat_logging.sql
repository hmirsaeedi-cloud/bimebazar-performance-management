create table if not exists public.pd_chat_logs (
  id uuid primary key default gen_random_uuid(),
  process_id uuid references public.performance_processes(id) on delete set null,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  evaluation_id uuid references public.end_cycle_evaluations(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'submitted', 'manager_reviewed', 'returned', 'visibility_approved', 'archived')),
  owner_role text not null default 'EMPLOYEE'
    check (owner_role in ('EMPLOYEE', 'EMPLOYEE_MANAGER', 'MANAGER', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  topic text not null,
  messages jsonb not null default '[]'::jsonb,
  visibility jsonb not null default '{"employeeCanView":true,"managerCanView":true,"hrbpCanView":false}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  archived_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pd_chat_logs_process on public.pd_chat_logs(process_id);
create index if not exists idx_pd_chat_logs_employee on public.pd_chat_logs(employee_id);
create index if not exists idx_pd_chat_logs_manager on public.pd_chat_logs(manager_id);
create index if not exists idx_pd_chat_logs_evaluation on public.pd_chat_logs(evaluation_id);
create index if not exists idx_pd_chat_logs_status on public.pd_chat_logs(status);

insert into public.permissions (code, description)
values
  ('pd_chat.read', 'Read PD Chat logs'),
  ('pd_chat.create', 'Create PD Chat logs'),
  ('pd_chat.update', 'Update PD Chat messages'),
  ('pd_chat.submit', 'Submit PD Chat log for manager review'),
  ('pd_chat.approve', 'Approve reviewed PD Chat log'),
  ('pd_chat.return', 'Return PD Chat log for edits'),
  ('pd_chat.override', 'Override PD Chat visibility'),
  ('pd_chat.archive', 'Archive PD Chat log')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'pd_chat.read'),
  ('EMPLOYEE', 'pd_chat.create'),
  ('EMPLOYEE', 'pd_chat.update'),
  ('EMPLOYEE', 'pd_chat.submit'),
  ('MANAGER', 'pd_chat.read'),
  ('MANAGER', 'pd_chat.create'),
  ('MANAGER', 'pd_chat.update'),
  ('MANAGER', 'pd_chat.approve'),
  ('MANAGER', 'pd_chat.return'),
  ('HRBP', 'pd_chat.read'),
  ('HRBP', 'pd_chat.override'),
  ('HRBP', 'pd_chat.archive'),
  ('HR_ADMIN', 'pd_chat.read'),
  ('HR_ADMIN', 'pd_chat.create'),
  ('HR_ADMIN', 'pd_chat.update'),
  ('HR_ADMIN', 'pd_chat.submit'),
  ('HR_ADMIN', 'pd_chat.approve'),
  ('HR_ADMIN', 'pd_chat.return'),
  ('HR_ADMIN', 'pd_chat.override'),
  ('HR_ADMIN', 'pd_chat.archive')
on conflict do nothing;

alter table public.pd_chat_logs enable row level security;

grant select on public.pd_chat_logs to authenticated;
grant insert, update on public.pd_chat_logs to authenticated;
grant all on public.pd_chat_logs to service_role;

drop policy if exists "authorized users can read pd chat logs" on public.pd_chat_logs;
create policy "authorized users can read pd chat logs"
on public.pd_chat_logs for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "authorized users can write pd chat logs" on public.pd_chat_logs;
create policy "authorized users can write pd chat logs"
on public.pd_chat_logs for all
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
)
with check (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

insert into public.pd_chat_logs (
  id,
  employee_id,
  manager_id,
  status,
  owner_role,
  next_action,
  topic,
  messages,
  visibility
)
select
  '00000000-0000-4000-8000-000000000027',
  p.id,
  p.manager_id,
  'active',
  'EMPLOYEE_MANAGER',
  'submit',
  'Quarterly development check-in',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'seed-message-1',
      'authorId', p.id,
      'authorRole', 'EMPLOYEE',
      'body', 'I want to discuss growth goals and support needed for the next cycle.',
      'createdAt', now(),
      'editedAt', null,
      'visibility', 'employee_manager'
    )
  ),
  '{"employeeCanView":true,"managerCanView":true,"hrbpCanView":false}'::jsonb
from public.profiles p
where p.account_status = 'active'
order by p.created_at
limit 1
on conflict (id) do nothing;
