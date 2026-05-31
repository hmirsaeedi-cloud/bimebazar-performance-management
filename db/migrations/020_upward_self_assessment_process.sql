create table if not exists public.process_self_assessments (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.performance_processes(id) on delete cascade,
  participant_id uuid not null references public.process_participants(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  form_template_version_id uuid not null references public.form_template_versions(id) on delete restrict,
  locked_form_schema jsonb not null,
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'submitted', 'returned', 'manager_approved', 'completed')),
  owner_role text not null default 'EMPLOYEE'
    check (owner_role in ('EMPLOYEE', 'MANAGER', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  responses jsonb not null default '{}'::jsonb,
  visibility jsonb not null default
    '{"employeeCanViewManagerReview":false,"managerCanViewEmployeeDraft":false}'::jsonb,
  submitted_at timestamptz,
  returned_at timestamptz,
  manager_approved_at timestamptz,
  completed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, employee_id)
);

create index if not exists idx_process_self_assessments_process on public.process_self_assessments(process_id);
create index if not exists idx_process_self_assessments_participant on public.process_self_assessments(participant_id);
create index if not exists idx_process_self_assessments_employee on public.process_self_assessments(employee_id);
create index if not exists idx_process_self_assessments_manager on public.process_self_assessments(manager_id);
create index if not exists idx_process_self_assessments_status on public.process_self_assessments(status);

insert into public.permissions (code, description)
values
  ('process.submit', 'Submit employee self-assessment responses'),
  ('process.approve', 'Approve process submissions'),
  ('process.return', 'Return process submissions for revision'),
  ('process.override', 'Override process submission visibility')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'process.submit'),
  ('MANAGER', 'process.approve'),
  ('MANAGER', 'process.return'),
  ('HRBP', 'process.approve'),
  ('HRBP', 'process.return'),
  ('HR_ADMIN', 'process.submit'),
  ('HR_ADMIN', 'process.approve'),
  ('HR_ADMIN', 'process.return'),
  ('HR_ADMIN', 'process.override')
on conflict do nothing;

alter table public.process_self_assessments enable row level security;

grant select on public.process_self_assessments to authenticated;
grant insert, update on public.process_self_assessments to authenticated;
grant all on public.process_self_assessments to service_role;

drop policy if exists "authorized users can read self assessments" on public.process_self_assessments;
create policy "authorized users can read self assessments"
on public.process_self_assessments for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "authorized users can write self assessments" on public.process_self_assessments;
create policy "authorized users can write self assessments"
on public.process_self_assessments for all
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
