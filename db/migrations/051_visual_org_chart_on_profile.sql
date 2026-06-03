create table if not exists public.profile_org_charts (
  id uuid primary key default gen_random_uuid(),
  root_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'active', 'returned', 'visibility_changed', 'archived')),
  owner_role text not null default 'HR_ADMIN'
    check (owner_role in ('HR_ADMIN', 'HRBP', 'SYSTEM')),
  next_action text,
  name text not null,
  description text,
  snapshot jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  layout text not null default 'tree'
    check (layout in ('tree', 'radial', 'compact')),
  visibility jsonb not null default '{"employeeCanView":true,"managerCanView":true,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  max_depth integer not null default 3 check (max_depth between 1 and 6),
  submitted_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  refreshed_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  archived_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_org_charts_root_status
  on public.profile_org_charts(root_profile_id, status);

insert into public.permissions (code, description)
values
  ('profiles.org_chart_read', 'Read visual org charts on employee profiles'),
  ('profiles.org_chart_create', 'Create visual org charts on employee profiles'),
  ('profiles.org_chart_update', 'Update and refresh visual org charts'),
  ('profiles.org_chart_submit', 'Submit visual org charts for review'),
  ('profiles.org_chart_approve', 'Approve and activate visual org charts'),
  ('profiles.org_chart_return', 'Return visual org charts for revision'),
  ('profiles.org_chart_override', 'Override visual org chart visibility'),
  ('profiles.org_chart_archive', 'Archive visual org charts')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'profiles.org_chart_read'),
  ('MANAGER', 'profiles.org_chart_read'),
  ('NEXT_LEVEL_MANAGER', 'profiles.org_chart_read'),
  ('HRBP', 'profiles.org_chart_read'),
  ('HRBP', 'profiles.org_chart_create'),
  ('HRBP', 'profiles.org_chart_update'),
  ('HRBP', 'profiles.org_chart_submit'),
  ('HRBP', 'profiles.org_chart_approve'),
  ('HRBP', 'profiles.org_chart_return'),
  ('HRBP', 'profiles.org_chart_override'),
  ('HR_ADMIN', 'profiles.org_chart_read'),
  ('HR_ADMIN', 'profiles.org_chart_create'),
  ('HR_ADMIN', 'profiles.org_chart_update'),
  ('HR_ADMIN', 'profiles.org_chart_submit'),
  ('HR_ADMIN', 'profiles.org_chart_approve'),
  ('HR_ADMIN', 'profiles.org_chart_return'),
  ('HR_ADMIN', 'profiles.org_chart_override'),
  ('HR_ADMIN', 'profiles.org_chart_archive')
on conflict do nothing;

alter table public.profile_org_charts enable row level security;

grant select, insert, update on public.profile_org_charts to authenticated;
grant all on public.profile_org_charts to service_role;

drop policy if exists "profile org charts visible to involved users and hr" on public.profile_org_charts;
create policy "profile org charts visible to involved users and hr"
on public.profile_org_charts for select
to authenticated
using (
  root_profile_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = profile_org_charts.root_profile_id
      and (
        p.manager_id = (select auth.uid())
        or p.function_lead_id = (select auth.uid())
        or p.hrbp_id = (select auth.uid())
      )
  )
  or (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "profile org charts can be created by hr" on public.profile_org_charts;
create policy "profile org charts can be created by hr"
on public.profile_org_charts for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (select app_private.current_user_has_role('HRBP'))
    or (select app_private.current_user_has_role('HR_ADMIN'))
  )
);

drop policy if exists "profile org charts can be updated by hr" on public.profile_org_charts;
create policy "profile org charts can be updated by hr"
on public.profile_org_charts for update
to authenticated
using (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

with root_profile as (
  select p.*
  from public.profiles p
  where p.account_status = 'active'
  order by p.created_at
  limit 1
),
nodes as (
  select jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'employeeId', p.employee_id,
      'name', coalesce(p.full_name_english, p.display_name, p.email::text),
      'persianName', p.full_name_persian,
      'title', coalesce(p.position_title, 'Not assigned'),
      'level', p.level,
      'managerId', p.manager_id,
      'status', p.account_status,
      'depth', case when p.id = rp.id then 0 when p.manager_id = rp.id then 1 else -1 end
    )
  ) as node_json
  from public.profiles p
  join root_profile rp on p.id = rp.id or p.manager_id = rp.id or p.id = rp.manager_id
),
edges as (
  select coalesce(jsonb_agg(
    jsonb_build_object('from', p.manager_id, 'to', p.id, 'relationship', 'manager')
  ) filter (where p.manager_id is not null), '[]'::jsonb) as edge_json
  from public.profiles p
  join root_profile rp on p.id = rp.id or p.manager_id = rp.id
)
insert into public.profile_org_charts (
  root_profile_id,
  status,
  owner_role,
  next_action,
  name,
  description,
  snapshot,
  layout,
  visibility,
  max_depth,
  created_by,
  updated_by
)
select
  rp.id,
  'draft',
  'HR_ADMIN',
  'submit',
  coalesce(rp.full_name_english, rp.display_name, rp.email::text) || ' org chart',
  'Seed visual org chart scaffold for the employee profile page.',
  jsonb_build_object(
    'rootProfileId', rp.id,
    'generatedAt', now(),
    'maxDepth', 3,
    'nodes', coalesce(nodes.node_json, '[]'::jsonb),
    'edges', edges.edge_json,
    'directReportCount', (
      select count(*)
      from public.profiles direct_report
      where direct_report.manager_id = rp.id
    )
  ),
  'tree',
  '{"employeeCanView":true,"managerCanView":true,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  3,
  rp.id,
  rp.id
from root_profile rp
cross join nodes
cross join edges
where not exists (
  select 1 from public.profile_org_charts existing
  where existing.root_profile_id = rp.id
)
on conflict do nothing;
