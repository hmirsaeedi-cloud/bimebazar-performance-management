create table if not exists public.evaluation_comparisons (
  id uuid primary key default gen_random_uuid(),
  process_id uuid references public.performance_processes(id) on delete set null,
  employee_id uuid not null references auth.users(id) on delete cascade,
  manager_id uuid references auth.users(id) on delete set null,
  hrbp_id uuid references auth.users(id) on delete set null,
  self_assessment_id uuid references public.process_self_assessments(id) on delete set null,
  manager_evaluation_id uuid references public.end_cycle_evaluations(id) on delete set null,
  form_template_version_id uuid references public.form_template_versions(id),
  locked_form_schema jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'submitted', 'approved', 'returned', 'visibility_approved', 'completed')),
  owner_role text not null default 'MANAGER'
    check (owner_role in ('MANAGER', 'HRBP', 'SYSTEM')),
  next_action text,
  self_answers jsonb not null default '{}'::jsonb,
  manager_answers jsonb not null default '{}'::jsonb,
  comparison_rows jsonb not null default '[]'::jsonb,
  alignment_summary jsonb not null default '{}'::jsonb,
  self_score jsonb not null default '{}'::jsonb,
  manager_score jsonb not null default '{}'::jsonb,
  score_visible boolean not null default false,
  visibility jsonb not null default '{"employeeCanView":false,"managerCanView":true,"hrbpCanView":true}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  completed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_comparisons_pair_unique unique (self_assessment_id, manager_evaluation_id)
);

create index if not exists idx_evaluation_comparisons_employee_status
  on public.evaluation_comparisons(employee_id, status);

create index if not exists idx_evaluation_comparisons_process
  on public.evaluation_comparisons(process_id);

insert into public.permissions (code, description)
values
  ('evaluation.comparison.read', 'Read self-assessment and manager evaluation comparisons'),
  ('evaluation.comparison.create', 'Create side-by-side evaluation comparisons'),
  ('evaluation.comparison.update', 'Update side-by-side evaluation comparisons'),
  ('evaluation.comparison.submit', 'Submit side-by-side evaluation comparisons'),
  ('evaluation.comparison.approve', 'Approve side-by-side evaluation comparisons'),
  ('evaluation.comparison.return', 'Return side-by-side evaluation comparisons'),
  ('evaluation.comparison.override', 'Override comparison visibility'),
  ('evaluation.comparison.complete', 'Complete side-by-side evaluation comparisons')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'evaluation.comparison.read'),
  ('MANAGER', 'evaluation.comparison.read'),
  ('MANAGER', 'evaluation.comparison.create'),
  ('MANAGER', 'evaluation.comparison.update'),
  ('MANAGER', 'evaluation.comparison.submit'),
  ('HRBP', 'evaluation.comparison.read'),
  ('HRBP', 'evaluation.comparison.create'),
  ('HRBP', 'evaluation.comparison.update'),
  ('HRBP', 'evaluation.comparison.submit'),
  ('HRBP', 'evaluation.comparison.approve'),
  ('HRBP', 'evaluation.comparison.return'),
  ('HRBP', 'evaluation.comparison.override'),
  ('HRBP', 'evaluation.comparison.complete'),
  ('HR_ADMIN', 'evaluation.comparison.read'),
  ('HR_ADMIN', 'evaluation.comparison.create'),
  ('HR_ADMIN', 'evaluation.comparison.update'),
  ('HR_ADMIN', 'evaluation.comparison.submit'),
  ('HR_ADMIN', 'evaluation.comparison.approve'),
  ('HR_ADMIN', 'evaluation.comparison.return'),
  ('HR_ADMIN', 'evaluation.comparison.override'),
  ('HR_ADMIN', 'evaluation.comparison.complete')
on conflict do nothing;

alter table public.evaluation_comparisons enable row level security;

grant select, insert, update on public.evaluation_comparisons to authenticated;
grant all on public.evaluation_comparisons to service_role;

drop policy if exists "evaluation comparisons are visible to participants and reviewers" on public.evaluation_comparisons;
create policy "evaluation comparisons are visible to participants and reviewers"
on public.evaluation_comparisons for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "evaluation comparisons can be created by managers and reviewers" on public.evaluation_comparisons;
create policy "evaluation comparisons can be created by managers and reviewers"
on public.evaluation_comparisons for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    manager_id = (select auth.uid())
    or hrbp_id = (select auth.uid())
    or (select app_private.current_user_has_role('HR_ADMIN'))
  )
);

drop policy if exists "evaluation comparisons can be updated by managers and reviewers" on public.evaluation_comparisons;
create policy "evaluation comparisons can be updated by managers and reviewers"
on public.evaluation_comparisons for update
to authenticated
using (
  manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
);
