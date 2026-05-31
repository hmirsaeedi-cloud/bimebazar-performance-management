create table if not exists public.process_downward_evaluations (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.performance_processes(id) on delete cascade,
  participant_id uuid not null references public.process_participants(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid not null references public.profiles(id) on delete restrict,
  next_level_manager_id uuid references public.profiles(id) on delete set null,
  hrbp_id uuid references public.profiles(id) on delete set null,
  form_template_version_id uuid not null references public.form_template_versions(id) on delete restrict,
  locked_form_schema jsonb not null,
  status text not null default 'assigned'
    check (status in ('assigned', 'manager_draft', 'manager_submitted', 'next_level_review', 'hrbp_review', 'returned_to_manager', 'approved', 'completed')),
  owner_role text not null default 'MANAGER'
    check (owner_role in ('MANAGER', 'NEXT_LEVEL_MANAGER', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  manager_responses jsonb not null default '{}'::jsonb,
  reviewer_responses jsonb not null default '{}'::jsonb,
  visibility jsonb not null default
    '{"employeeCanViewEvaluation":false,"managerCanViewReviewerNotes":false}'::jsonb,
  manager_submitted_at timestamptz,
  next_level_approved_at timestamptz,
  hrbp_approved_at timestamptz,
  returned_at timestamptz,
  completed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, employee_id)
);

create index if not exists idx_process_downward_evaluations_process on public.process_downward_evaluations(process_id);
create index if not exists idx_process_downward_evaluations_participant on public.process_downward_evaluations(participant_id);
create index if not exists idx_process_downward_evaluations_employee on public.process_downward_evaluations(employee_id);
create index if not exists idx_process_downward_evaluations_manager on public.process_downward_evaluations(manager_id);
create index if not exists idx_process_downward_evaluations_next_level on public.process_downward_evaluations(next_level_manager_id);
create index if not exists idx_process_downward_evaluations_hrbp on public.process_downward_evaluations(hrbp_id);
create index if not exists idx_process_downward_evaluations_status on public.process_downward_evaluations(status);

insert into public.role_permissions (role_code, permission_code)
values
  ('MANAGER', 'process.submit'),
  ('NEXT_LEVEL_MANAGER', 'process.approve'),
  ('NEXT_LEVEL_MANAGER', 'process.return')
on conflict do nothing;

alter table public.process_downward_evaluations enable row level security;

grant select on public.process_downward_evaluations to authenticated;
grant insert, update on public.process_downward_evaluations to authenticated;
grant all on public.process_downward_evaluations to service_role;

drop policy if exists "authorized users can read downward evaluations" on public.process_downward_evaluations;
create policy "authorized users can read downward evaluations"
on public.process_downward_evaluations for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or next_level_manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "authorized users can write downward evaluations" on public.process_downward_evaluations;
create policy "authorized users can write downward evaluations"
on public.process_downward_evaluations for all
to authenticated
using (
  manager_id = (select auth.uid())
  or next_level_manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
)
with check (
  manager_id = (select auth.uid())
  or next_level_manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);
