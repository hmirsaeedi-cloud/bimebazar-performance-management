alter table public.end_cycle_evaluations
  drop constraint if exists end_cycle_evaluations_status_check,
  add constraint end_cycle_evaluations_status_check
    check (status in ('draft', 'in_progress', 'submitted', 'nl_approved', 'head_approved', 'hrbp_approved', 'returned', 'approved', 'visibility_approved', 'completed'));

alter table public.end_cycle_evaluations
  drop constraint if exists end_cycle_evaluations_owner_role_check,
  add constraint end_cycle_evaluations_owner_role_check
    check (owner_role in ('MANAGER', 'NEXT_LEVEL_MANAGER', 'HEAD', 'HRBP', 'HR_ADMIN', 'SYSTEM'));

alter table public.end_cycle_evaluations
add column if not exists next_level_manager_id uuid references public.profiles(id) on delete set null,
add column if not exists head_reviewer_id uuid references public.profiles(id) on delete set null,
add column if not exists nl_approved_at timestamptz,
add column if not exists head_approved_at timestamptz,
add column if not exists hrbp_approved_at timestamptz,
add column if not exists review_chain jsonb not null default
  '{"steps":["NEXT_LEVEL_MANAGER","HEAD","HRBP"],"currentStep":"NEXT_LEVEL_MANAGER"}'::jsonb;

create index if not exists idx_end_cycle_evaluations_next_level
  on public.end_cycle_evaluations(next_level_manager_id);

create index if not exists idx_end_cycle_evaluations_head
  on public.end_cycle_evaluations(head_reviewer_id);

insert into public.role_permissions (role_code, permission_code)
values
  ('NEXT_LEVEL_MANAGER', 'evaluation.read'),
  ('NEXT_LEVEL_MANAGER', 'evaluation.approve'),
  ('NEXT_LEVEL_MANAGER', 'evaluation.return')
on conflict do nothing;
