create table if not exists public.promotion_cases (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references auth.users(id) on delete cascade,
  manager_id uuid references auth.users(id) on delete set null,
  hrbp_id uuid references auth.users(id) on delete set null,
  source_evaluation_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'manager_approved', 'hrbp_approved', 'approved', 'returned', 'cancelled')),
  owner_role text not null default 'MANAGER'
    check (owner_role in ('MANAGER', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  current_level text,
  proposed_level text not null,
  current_title text,
  proposed_title text,
  effective_date date,
  rationale text not null,
  evidence jsonb not null default '{}'::jsonb,
  visibility jsonb not null default '{"employeeCanView":false,"managerCanView":true,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  submitted_at timestamptz,
  manager_approved_at timestamptz,
  hrbp_approved_at timestamptz,
  approved_at timestamptz,
  returned_at timestamptz,
  cancelled_at timestamptz,
  visibility_changed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_promotion_cases_employee_status
  on public.promotion_cases(employee_id, status);

create index if not exists idx_promotion_cases_manager_status
  on public.promotion_cases(manager_id, status);

insert into public.permissions (code, description)
values
  ('promotion.read', 'Read promotion cases'),
  ('promotion.create', 'Create promotion cases'),
  ('promotion.update', 'Update draft or returned promotion cases'),
  ('promotion.submit', 'Submit promotion cases for approval'),
  ('promotion.approve', 'Approve promotion cases'),
  ('promotion.return', 'Return promotion cases for revision'),
  ('promotion.override', 'Override promotion visibility'),
  ('promotion.cancel', 'Cancel promotion cases')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('MANAGER', 'promotion.read'),
  ('MANAGER', 'promotion.create'),
  ('MANAGER', 'promotion.update'),
  ('MANAGER', 'promotion.submit'),
  ('MANAGER', 'promotion.approve'),
  ('MANAGER', 'promotion.return'),
  ('MANAGER', 'promotion.cancel'),
  ('NEXT_LEVEL_MANAGER', 'promotion.read'),
  ('NEXT_LEVEL_MANAGER', 'promotion.approve'),
  ('NEXT_LEVEL_MANAGER', 'promotion.return'),
  ('HRBP', 'promotion.read'),
  ('HRBP', 'promotion.create'),
  ('HRBP', 'promotion.update'),
  ('HRBP', 'promotion.submit'),
  ('HRBP', 'promotion.approve'),
  ('HRBP', 'promotion.return'),
  ('HRBP', 'promotion.override'),
  ('HRBP', 'promotion.cancel'),
  ('HR_ADMIN', 'promotion.read'),
  ('HR_ADMIN', 'promotion.create'),
  ('HR_ADMIN', 'promotion.update'),
  ('HR_ADMIN', 'promotion.submit'),
  ('HR_ADMIN', 'promotion.approve'),
  ('HR_ADMIN', 'promotion.return'),
  ('HR_ADMIN', 'promotion.override'),
  ('HR_ADMIN', 'promotion.cancel')
on conflict do nothing;

alter table public.promotion_cases enable row level security;

grant select, insert, update on public.promotion_cases to authenticated;
grant all on public.promotion_cases to service_role;

drop policy if exists "promotion cases visible to career reviewers" on public.promotion_cases;
create policy "promotion cases visible to career reviewers"
on public.promotion_cases for select
to authenticated
using (
  manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (visibility->>'employeeCanView')::boolean is true and employee_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "promotion cases can be created by reviewers" on public.promotion_cases;
create policy "promotion cases can be created by reviewers"
on public.promotion_cases for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    manager_id = (select auth.uid())
    or hrbp_id = (select auth.uid())
    or (select app_private.current_user_has_role('HR_ADMIN'))
    or (select app_private.current_user_has_role('HRBP'))
  )
);

drop policy if exists "promotion cases can be updated by reviewers" on public.promotion_cases;
create policy "promotion cases can be updated by reviewers"
on public.promotion_cases for update
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

insert into public.promotion_cases (
  employee_id,
  manager_id,
  hrbp_id,
  status,
  owner_role,
  next_action,
  current_level,
  proposed_level,
  current_title,
  proposed_title,
  effective_date,
  rationale,
  evidence,
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
  p.level,
  coalesce(p.level, 'L1') || '+',
  p.position_title,
  coalesce(p.position_title, 'Role') || ' - promoted',
  current_date + interval '30 days',
  'Seed promotion case for workflow validation.',
  '{"source":"seed"}'::jsonb,
  coalesce(p.manager_id, p.id),
  coalesce(p.manager_id, p.id)
from public.profiles p
where p.account_status = 'active'
order by p.created_at
limit 1
on conflict do nothing;
