create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  parent_goal_id uuid references public.goals(id) on delete set null,
  cascade_path uuid[] not null default '{}'::uuid[],
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'returned', 'active', 'visibility_changed', 'completed', 'archived')),
  owner_role text not null default 'OWNER'
    check (owner_role in ('OWNER', 'MANAGER', 'HRBP', 'SYSTEM')),
  next_action text,
  title text not null,
  description text,
  cycle text not null,
  goal_type text not null default 'individual'
    check (goal_type in ('company', 'department', 'team', 'individual')),
  key_results jsonb not null default '[]'::jsonb,
  progress_percent numeric(5,2) not null default 0,
  visibility jsonb not null default '{"employeeCanView":true,"managerCanView":true,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_goals_owner_status
  on public.goals(owner_user_id, status);

create index if not exists idx_goals_parent_goal
  on public.goals(parent_goal_id);

create index if not exists idx_goals_cycle_type
  on public.goals(cycle, goal_type);

insert into public.permissions (code, description)
values
  ('goals.read', 'Read OKR and goal cascade records'),
  ('goals.create', 'Create OKR and goal cascade records'),
  ('goals.update', 'Update OKR and key result progress'),
  ('goals.submit', 'Submit OKRs for approval'),
  ('goals.approve', 'Approve and activate OKRs'),
  ('goals.return', 'Return OKRs for revision'),
  ('goals.override', 'Override OKR visibility'),
  ('goals.complete', 'Complete OKRs'),
  ('goals.archive', 'Archive OKRs')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'goals.read'),
  ('EMPLOYEE', 'goals.create'),
  ('EMPLOYEE', 'goals.update'),
  ('EMPLOYEE', 'goals.submit'),
  ('MANAGER', 'goals.read'),
  ('MANAGER', 'goals.create'),
  ('MANAGER', 'goals.update'),
  ('MANAGER', 'goals.submit'),
  ('MANAGER', 'goals.approve'),
  ('MANAGER', 'goals.return'),
  ('MANAGER', 'goals.override'),
  ('MANAGER', 'goals.complete'),
  ('HRBP', 'goals.read'),
  ('HRBP', 'goals.create'),
  ('HRBP', 'goals.update'),
  ('HRBP', 'goals.submit'),
  ('HRBP', 'goals.approve'),
  ('HRBP', 'goals.return'),
  ('HRBP', 'goals.override'),
  ('HRBP', 'goals.complete'),
  ('HRBP', 'goals.archive'),
  ('HR_ADMIN', 'goals.read'),
  ('HR_ADMIN', 'goals.create'),
  ('HR_ADMIN', 'goals.update'),
  ('HR_ADMIN', 'goals.submit'),
  ('HR_ADMIN', 'goals.approve'),
  ('HR_ADMIN', 'goals.return'),
  ('HR_ADMIN', 'goals.override'),
  ('HR_ADMIN', 'goals.complete'),
  ('HR_ADMIN', 'goals.archive')
on conflict do nothing;

alter table public.goals enable row level security;

grant select, insert, update on public.goals to authenticated;
grant all on public.goals to service_role;

drop policy if exists "goals are visible to owners and people partners" on public.goals;
create policy "goals are visible to owners and people partners"
on public.goals for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or created_by_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "goals can be created by authenticated users" on public.goals;
create policy "goals can be created by authenticated users"
on public.goals for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and created_by_user_id = (select auth.uid())
);

drop policy if exists "goals can be updated by owners managers and hr" on public.goals;
create policy "goals can be updated by owners managers and hr"
on public.goals for update
to authenticated
using (
  owner_user_id = (select auth.uid())
  or created_by_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  owner_user_id = (select auth.uid())
  or created_by_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

insert into public.goals (
  owner_user_id,
  created_by_user_id,
  status,
  owner_role,
  next_action,
  title,
  description,
  cycle,
  goal_type,
  key_results,
  progress_percent,
  visibility,
  created_by,
  updated_by
)
select
  p.id,
  p.id,
  'draft',
  'OWNER',
  'update',
  'Improve performance management adoption',
  'Seed OKR for the cascading goals scaffold.',
  '1405-H1',
  'company',
  '[{"id":"kr1","title":"Launch OKR cascade pilot","currentValue":25,"targetValue":100,"unit":"%","weight":1}]'::jsonb,
  25,
  '{"employeeCanView":true,"managerCanView":true,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  p.id,
  p.id
from public.profiles p
where p.account_status = 'active'
order by p.created_at
limit 1
on conflict do nothing;

update public.goals
set cascade_path = array[id]
where cascade_path = '{}'::uuid[];
