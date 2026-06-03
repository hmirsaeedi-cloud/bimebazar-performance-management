create table if not exists public.team_health_scores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  cycle text not null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'active', 'returned', 'visibility_changed', 'archived')),
  owner_role text not null default 'MANAGER'
    check (owner_role in ('MANAGER', 'HRBP', 'SYSTEM')),
  next_action text,
  name text not null,
  metrics jsonb not null default '{}'::jsonb,
  score numeric(5,2) not null default 0,
  band text not null default 'risk'
    check (band in ('healthy', 'watch', 'risk')),
  contributions jsonb not null default '{}'::jsonb,
  visibility jsonb not null default '{"managerCanView":true,"hrbpCanView":true,"hrAdminCanView":true,"employeeCanView":false}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  calculated_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  archived_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, cycle)
);

create index if not exists idx_team_health_scores_team_status
  on public.team_health_scores(team_id, status);

create index if not exists idx_team_health_scores_manager
  on public.team_health_scores(manager_id, cycle);

insert into public.permissions (code, description)
values
  ('dashboard.team_health.read', 'Read team health score dashboard snapshots'),
  ('dashboard.team_health.create', 'Create team health score snapshots'),
  ('dashboard.team_health.update', 'Update and calculate team health score snapshots'),
  ('dashboard.team_health.submit', 'Submit team health scores for review'),
  ('dashboard.team_health.approve', 'Approve and activate team health scores'),
  ('dashboard.team_health.return', 'Return team health scores for revision'),
  ('dashboard.team_health.override', 'Override team health score visibility'),
  ('dashboard.team_health.archive', 'Archive team health scores')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('MANAGER', 'dashboard.team_health.read'),
  ('MANAGER', 'dashboard.team_health.create'),
  ('MANAGER', 'dashboard.team_health.update'),
  ('MANAGER', 'dashboard.team_health.submit'),
  ('NEXT_LEVEL_MANAGER', 'dashboard.team_health.read'),
  ('NEXT_LEVEL_MANAGER', 'dashboard.team_health.approve'),
  ('NEXT_LEVEL_MANAGER', 'dashboard.team_health.return'),
  ('HRBP', 'dashboard.team_health.read'),
  ('HRBP', 'dashboard.team_health.create'),
  ('HRBP', 'dashboard.team_health.update'),
  ('HRBP', 'dashboard.team_health.submit'),
  ('HRBP', 'dashboard.team_health.approve'),
  ('HRBP', 'dashboard.team_health.return'),
  ('HRBP', 'dashboard.team_health.override'),
  ('HRBP', 'dashboard.team_health.archive'),
  ('HR_ADMIN', 'dashboard.team_health.read'),
  ('HR_ADMIN', 'dashboard.team_health.create'),
  ('HR_ADMIN', 'dashboard.team_health.update'),
  ('HR_ADMIN', 'dashboard.team_health.submit'),
  ('HR_ADMIN', 'dashboard.team_health.approve'),
  ('HR_ADMIN', 'dashboard.team_health.return'),
  ('HR_ADMIN', 'dashboard.team_health.override'),
  ('HR_ADMIN', 'dashboard.team_health.archive')
on conflict do nothing;

alter table public.team_health_scores enable row level security;

grant select, insert, update on public.team_health_scores to authenticated;
grant all on public.team_health_scores to service_role;

drop policy if exists "team health visible to managers and hr" on public.team_health_scores;
create policy "team health visible to managers and hr"
on public.team_health_scores for select
to authenticated
using (
  manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('NEXT_LEVEL_MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "team health can be created by managers and hr" on public.team_health_scores;
create policy "team health can be created by managers and hr"
on public.team_health_scores for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (select app_private.current_user_has_role('MANAGER'))
    or (select app_private.current_user_has_role('HRBP'))
    or (select app_private.current_user_has_role('HR_ADMIN'))
  )
);

drop policy if exists "team health can be updated by managers and hr" on public.team_health_scores;
create policy "team health can be updated by managers and hr"
on public.team_health_scores for update
to authenticated
using (
  manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

with seed_team as (
  select t.id as team_id, p.id as manager_id
  from public.teams t
  left join public.profiles p on p.team_id = t.id and p.account_status = 'active'
  order by t.created_at, p.created_at
  limit 1
)
insert into public.team_health_scores (
  team_id,
  manager_id,
  cycle,
  status,
  owner_role,
  next_action,
  name,
  metrics,
  score,
  band,
  contributions,
  visibility,
  calculated_at,
  created_by,
  updated_by
)
select
  team_id,
  manager_id,
  '1405-H1',
  'draft',
  'MANAGER',
  'calculate',
  'Team health score - 1405 H1',
  '{"evaluationCompletionRate":0.86,"averagePerformanceScore":3.9,"feedbackParticipationRate":0.72,"pipRiskRate":0.08,"overdueTaskRate":0.18}'::jsonb,
  80.2,
  'healthy',
  '{"evaluationCompletionRate":21.5,"averagePerformanceScore":19.5,"feedbackParticipationRate":14.4,"pipRiskInverse":13.8,"overdueTaskInverse":12.3}'::jsonb,
  '{"managerCanView":true,"hrbpCanView":true,"hrAdminCanView":true,"employeeCanView":false}'::jsonb,
  now(),
  manager_id,
  manager_id
from seed_team
where manager_id is not null
on conflict (team_id, cycle) do nothing;
