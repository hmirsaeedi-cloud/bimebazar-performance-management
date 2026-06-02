create table if not exists public.process_form_instances (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.performance_processes(id) on delete cascade,
  participant_id uuid references public.process_participants(id) on delete cascade,
  employee_id uuid not null references auth.users(id) on delete cascade,
  manager_id uuid references auth.users(id) on delete set null,
  form_template_id uuid references public.form_templates(id) on delete set null,
  form_template_version_id uuid not null references public.form_template_versions(id) on delete restrict,
  locked_form_version_number integer,
  locked_form_schema jsonb not null,
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'submitted', 'approved', 'returned', 'closed')),
  owner_role text not null default 'EMPLOYEE'
    check (owner_role in ('EMPLOYEE', 'MANAGER', 'HRBP', 'SYSTEM')),
  next_action text,
  response_payload jsonb not null default '{}'::jsonb,
  visibility jsonb not null default '{"employeeCanView":true,"managerCanView":true,"hrbpCanView":true}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  returned_at timestamptz,
  closed_at timestamptz,
  visibility_changed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, employee_id, form_template_version_id)
);

create index if not exists idx_process_form_instances_process_status
  on public.process_form_instances(process_id, status);

create index if not exists idx_process_form_instances_employee_status
  on public.process_form_instances(employee_id, status);

alter table public.process_form_instances enable row level security;

grant select, insert, update on public.process_form_instances to authenticated;
grant all on public.process_form_instances to service_role;

drop policy if exists "process form instances visible to process actors" on public.process_form_instances;
create policy "process form instances visible to process actors"
on public.process_form_instances for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "process form instances managed by process actors" on public.process_form_instances;
create policy "process form instances managed by process actors"
on public.process_form_instances for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    employee_id = (select auth.uid())
    or manager_id = (select auth.uid())
    or (select app_private.current_user_has_role('HR_ADMIN'))
    or (select app_private.current_user_has_role('HRBP'))
  )
);

drop policy if exists "process form instances updated by process actors" on public.process_form_instances;
create policy "process form instances updated by process actors"
on public.process_form_instances for update
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

insert into public.process_form_instances (
  process_id,
  participant_id,
  employee_id,
  manager_id,
  form_template_id,
  form_template_version_id,
  locked_form_version_number,
  locked_form_schema,
  status,
  owner_role,
  next_action,
  created_by,
  updated_by
)
select
  pp.id,
  part.id,
  part.employee_id,
  part.manager_id,
  pp.form_template_id,
  pp.locked_form_template_version_id,
  pp.locked_form_version_number,
  pp.locked_form_schema,
  'assigned',
  'EMPLOYEE',
  'update',
  pp.created_by,
  pp.updated_by
from public.performance_processes pp
join public.process_participants part on part.process_id = pp.id
where pp.locked_form_template_version_id is not null
  and pp.locked_form_schema is not null
  and part.status <> 'excluded'
on conflict (process_id, employee_id, form_template_version_id) do nothing;
