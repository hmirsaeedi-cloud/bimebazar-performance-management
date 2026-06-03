create table if not exists public.hris_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('bamboohr', 'workday', 'sap_successfactors', 'custom')),
  name text not null,
  base_url text not null,
  auth_type text not null default 'api_key' check (auth_type in ('api_key', 'oauth2', 'basic')),
  sync_mode text not null default 'manual' check (sync_mode in ('manual', 'scheduled')),
  schedule text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'active', 'sync_running', 'sync_completed', 'sync_failed', 'returned', 'visibility_changed', 'archived')),
  owner_role text not null default 'HR_ADMIN'
    check (owner_role in ('HR_ADMIN', 'HRBP', 'SYSTEM')),
  next_action text,
  field_mapping jsonb not null default '{"externalEmployeeId":"employee_id","email":"email","fullNameEnglish":"full_name","managerExternalId":"manager_id","title":"title","status":"status"}'::jsonb,
  visibility jsonb not null default '{"hrAdminCanView":true,"hrbpCanView":true,"managerCanView":false,"employeeCanView":false}'::jsonb,
  last_preview jsonb not null default '{}'::jsonb,
  last_sync_summary jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  sync_started_at timestamptz,
  sync_completed_at timestamptz,
  sync_failed_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  archived_at timestamptz,
  last_return_reason text,
  last_error text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hris_sync_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.hris_integrations(id) on delete cascade,
  status text not null default 'sync_running'
    check (status in ('sync_running', 'sync_completed', 'sync_failed')),
  owner_role text not null default 'SYSTEM',
  next_action text,
  total_records integer not null default 0,
  changed_records integer not null default 0,
  failed_records integer not null default 0,
  sample jsonb not null default '[]'::jsonb,
  error_summary text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_hris_integrations_status
  on public.hris_integrations(status);

create index if not exists idx_hris_sync_runs_integration
  on public.hris_sync_runs(integration_id, created_at desc);

insert into public.permissions (code, description)
values
  ('core.hris.read', 'Read HRIS API integration settings'),
  ('core.hris.create', 'Create HRIS API integrations'),
  ('core.hris.update', 'Update HRIS API integration settings'),
  ('core.hris.submit', 'Submit HRIS integration for review'),
  ('core.hris.approve', 'Approve and activate HRIS integrations'),
  ('core.hris.return', 'Return HRIS integrations for revision'),
  ('core.hris.override', 'Override HRIS integration visibility'),
  ('core.hris.sync', 'Start and complete HRIS sync runs'),
  ('core.hris.archive', 'Archive HRIS integrations')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HRBP', 'core.hris.read'),
  ('HRBP', 'core.hris.submit'),
  ('HRBP', 'core.hris.approve'),
  ('HRBP', 'core.hris.return'),
  ('HR_ADMIN', 'core.hris.read'),
  ('HR_ADMIN', 'core.hris.create'),
  ('HR_ADMIN', 'core.hris.update'),
  ('HR_ADMIN', 'core.hris.submit'),
  ('HR_ADMIN', 'core.hris.approve'),
  ('HR_ADMIN', 'core.hris.return'),
  ('HR_ADMIN', 'core.hris.override'),
  ('HR_ADMIN', 'core.hris.sync'),
  ('HR_ADMIN', 'core.hris.archive')
on conflict do nothing;

alter table public.hris_integrations enable row level security;
alter table public.hris_sync_runs enable row level security;

grant select, insert, update on public.hris_integrations to authenticated;
grant select, insert, update on public.hris_sync_runs to authenticated;
grant all on public.hris_integrations to service_role;
grant all on public.hris_sync_runs to service_role;

drop policy if exists "hris integrations visible to hr" on public.hris_integrations;
create policy "hris integrations visible to hr"
on public.hris_integrations for select
to authenticated
using (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "hris integrations can be created by hr admin" on public.hris_integrations;
create policy "hris integrations can be created by hr admin"
on public.hris_integrations for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "hris integrations can be updated by hr admin" on public.hris_integrations;
create policy "hris integrations can be updated by hr admin"
on public.hris_integrations for update
to authenticated
using (
  (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "hris sync runs visible to hr" on public.hris_sync_runs;
create policy "hris sync runs visible to hr"
on public.hris_sync_runs for select
to authenticated
using (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "hris sync runs can be written by hr admin" on public.hris_sync_runs;
create policy "hris sync runs can be written by hr admin"
on public.hris_sync_runs for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select app_private.current_user_has_role('HR_ADMIN'))
);

with first_admin as (
  select p.id
  from public.profiles p
  where p.account_status = 'active'
  order by case when p.role_code = 'HR_ADMIN' then 0 else 1 end, p.created_at
  limit 1
)
insert into public.hris_integrations (
  provider,
  name,
  base_url,
  auth_type,
  sync_mode,
  schedule,
  status,
  owner_role,
  next_action,
  field_mapping,
  visibility,
  last_preview,
  created_by,
  updated_by
)
select
  'custom',
  'BimeBazar HRIS sandbox',
  'https://hris.example.bimebazar.com/api',
  'api_key',
  'manual',
  null,
  'draft',
  'HR_ADMIN',
  'submit',
  '{"externalEmployeeId":"employee_id","email":"email","fullNameEnglish":"full_name","managerExternalId":"manager_id","title":"title","status":"status"}'::jsonb,
  '{"hrAdminCanView":true,"hrbpCanView":true,"managerCanView":false,"employeeCanView":false}'::jsonb,
  '{"totalRecords":2,"validRecords":2,"missingEmail":0,"missingExternalId":0,"sample":[{"externalEmployeeId":"BB-001","email":"sample@bimebazar.com","fullNameEnglish":"Sample Employee","managerExternalId":null,"status":"active"}]}'::jsonb,
  id,
  id
from first_admin
where not exists (
  select 1 from public.hris_integrations existing
  where existing.name = 'BimeBazar HRIS sandbox'
)
on conflict do nothing;
