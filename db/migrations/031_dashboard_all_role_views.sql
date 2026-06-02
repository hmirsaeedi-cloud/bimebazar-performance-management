create table if not exists public.dashboard_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_view text not null check (role_view in ('employee', 'manager', 'hrbp', 'hr_admin')),
  status text not null default 'defaulted'
    check (status in ('defaulted', 'customized', 'override_pending', 'overridden')),
  owner_role text not null default 'USER'
    check (owner_role in ('USER', 'HR_ADMIN')),
  next_action text,
  layout jsonb not null default '[]'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_view)
);

create index if not exists idx_dashboard_preferences_user_view
  on public.dashboard_preferences(user_id, role_view);

insert into public.permissions (code, description)
values
  ('dashboard.read', 'Read dashboard summaries and role views'),
  ('dashboard.update', 'Update own dashboard preferences'),
  ('dashboard.override', 'Approve or override dashboard preferences')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'dashboard.read'),
  ('EMPLOYEE', 'dashboard.update'),
  ('MANAGER', 'dashboard.read'),
  ('MANAGER', 'dashboard.update'),
  ('NEXT_LEVEL_MANAGER', 'dashboard.read'),
  ('NEXT_LEVEL_MANAGER', 'dashboard.update'),
  ('HRBP', 'dashboard.read'),
  ('HRBP', 'dashboard.update'),
  ('HR_ADMIN', 'dashboard.read'),
  ('HR_ADMIN', 'dashboard.update'),
  ('HR_ADMIN', 'dashboard.override')
on conflict do nothing;

alter table public.dashboard_preferences enable row level security;

grant select, insert, update on public.dashboard_preferences to authenticated;
grant all on public.dashboard_preferences to service_role;

drop policy if exists "users can read own dashboard preferences" on public.dashboard_preferences;
create policy "users can read own dashboard preferences"
on public.dashboard_preferences for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "users can create own dashboard preferences" on public.dashboard_preferences;
create policy "users can create own dashboard preferences"
on public.dashboard_preferences for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and created_by = (select auth.uid())
);

drop policy if exists "users can update own dashboard preferences" on public.dashboard_preferences;
create policy "users can update own dashboard preferences"
on public.dashboard_preferences for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

insert into public.dashboard_preferences (
  user_id,
  role_view,
  status,
  owner_role,
  next_action,
  layout,
  filters,
  created_by,
  updated_by
)
select
  p.id,
  case
    when p.role_code = 'HR_ADMIN' then 'hr_admin'
    when p.role_code = 'HRBP' then 'hrbp'
    when p.role_code in ('MANAGER', 'NEXT_LEVEL_MANAGER') then 'manager'
    else 'employee'
  end,
  'defaulted',
  'USER',
  'update',
  case
    when p.role_code = 'HR_ADMIN' then '["system_health","audit_integrity","role_coverage","tasks_due","notifications","recent_activity"]'::jsonb
    when p.role_code = 'HRBP' then '["process_health","pip_watchlist","approvals","tasks_due","notifications","recent_activity"]'::jsonb
    when p.role_code in ('MANAGER', 'NEXT_LEVEL_MANAGER') then '["team_tasks","mpas","evaluations","tasks_due","notifications","recent_activity"]'::jsonb
    else '["my_profile","self_assessments","pd_chats","tasks_due","notifications","recent_activity"]'::jsonb
  end,
  '{"source":"seed"}'::jsonb,
  p.id,
  p.id
from public.profiles p
where p.account_status = 'active'
on conflict (user_id, role_view) do nothing;
