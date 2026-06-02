create table if not exists public.hrbp_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_key text not null default 'hrbp_analytics',
  title text not null,
  period_start date,
  period_end date,
  business_unit_id uuid references public.business_units(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'generated', 'submitted', 'reviewed', 'returned', 'visibility_approved', 'exported', 'archived')),
  owner_role text not null default 'HRBP'
    check (owner_role in ('HRBP', 'HR_ADMIN', 'HRBP_HR_ADMIN', 'SYSTEM')),
  next_action text,
  filters jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  insights jsonb not null default '[]'::jsonb,
  export_format text,
  exported_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  archived_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hrbp_report_snapshots_status on public.hrbp_report_snapshots(status);
create index if not exists idx_hrbp_report_snapshots_period on public.hrbp_report_snapshots(period_start, period_end);
create index if not exists idx_hrbp_report_snapshots_business_unit on public.hrbp_report_snapshots(business_unit_id);
create index if not exists idx_hrbp_report_snapshots_created_by on public.hrbp_report_snapshots(created_by);

insert into public.permissions (code, description)
values
  ('reports.read', 'Read HRBP aggregated reports and analytics'),
  ('reports.create', 'Create report snapshot drafts'),
  ('reports.generate', 'Generate report metrics'),
  ('reports.submit', 'Submit report snapshots for review'),
  ('reports.approve', 'Approve reviewed report snapshots'),
  ('reports.return', 'Return report snapshots for updates'),
  ('reports.override', 'Override report visibility'),
  ('reports.export', 'Export report snapshots'),
  ('reports.archive', 'Archive report snapshots')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HRBP', 'reports.read'),
  ('HRBP', 'reports.create'),
  ('HRBP', 'reports.generate'),
  ('HRBP', 'reports.submit'),
  ('HRBP', 'reports.export'),
  ('HR_ADMIN', 'reports.read'),
  ('HR_ADMIN', 'reports.create'),
  ('HR_ADMIN', 'reports.generate'),
  ('HR_ADMIN', 'reports.submit'),
  ('HR_ADMIN', 'reports.approve'),
  ('HR_ADMIN', 'reports.return'),
  ('HR_ADMIN', 'reports.override'),
  ('HR_ADMIN', 'reports.export'),
  ('HR_ADMIN', 'reports.archive')
on conflict do nothing;

alter table public.hrbp_report_snapshots enable row level security;

grant select, insert, update on public.hrbp_report_snapshots to authenticated;
grant all on public.hrbp_report_snapshots to service_role;

drop policy if exists "authorized users can read hrbp report snapshots" on public.hrbp_report_snapshots;
create policy "authorized users can read hrbp report snapshots"
on public.hrbp_report_snapshots for select
to authenticated
using (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "authorized users can write hrbp report snapshots" on public.hrbp_report_snapshots;
create policy "authorized users can write hrbp report snapshots"
on public.hrbp_report_snapshots for all
to authenticated
using (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

insert into public.hrbp_report_snapshots (
  id,
  title,
  period_start,
  period_end,
  status,
  owner_role,
  next_action,
  filters,
  metrics,
  insights
)
select
  '00000000-0000-4000-8000-000000000045',
  'Seed HRBP analytics snapshot',
  date_trunc('year', current_date)::date,
  current_date,
  'generated',
  'HRBP',
  'submit',
  jsonb_build_object('scope', 'all_active_employees', 'source', 'seed'),
  jsonb_build_object(
    'activeEmployees', (select count(*) from public.profiles where account_status = 'active'),
    'totalEvaluations', (select count(*) from public.end_cycle_evaluations) + (select count(*) from public.mid_cycle_evaluations),
    'completedEvaluations', (select count(*) from public.end_cycle_evaluations where status = 'completed') + (select count(*) from public.mid_cycle_evaluations where status = 'completed'),
    'pipFlags', (select count(*) from public.performance_band_flags where flag_type = 'pip'),
    'promotionFlags', (select count(*) from public.performance_band_flags where flag_type = 'promotion')
  ),
  jsonb_build_array('Seed snapshot for HRBP aggregated analytics.')
on conflict (id) do nothing;
