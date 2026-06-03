create table if not exists public.advanced_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_key text not null default 'advanced_trends_cohorts',
  title text not null,
  period_start date,
  period_end date,
  cohort_key text not null default 'businessUnit'
    check (cohort_key in ('businessUnit', 'role', 'manager')),
  interval text not null default 'month'
    check (interval in ('month', 'quarter')),
  status text not null default 'draft'
    check (status in ('draft', 'generated', 'submitted', 'reviewed', 'returned', 'visibility_approved', 'exported', 'archived')),
  owner_role text not null default 'HRBP'
    check (owner_role in ('HRBP', 'HR_ADMIN', 'HRBP_HR_ADMIN', 'SYSTEM')),
  next_action text,
  filters jsonb not null default '{}'::jsonb,
  trends jsonb not null default '[]'::jsonb,
  cohorts jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
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

create index if not exists idx_advanced_analytics_status_updated
  on public.advanced_analytics_snapshots(status, updated_at desc);

create index if not exists idx_advanced_analytics_period
  on public.advanced_analytics_snapshots(period_start, period_end);

create index if not exists idx_advanced_analytics_cohort_interval
  on public.advanced_analytics_snapshots(cohort_key, interval);

insert into public.permissions (code, description)
values
  ('reports.advanced.read', 'Read advanced analytics trends and cohorts'),
  ('reports.advanced.create', 'Create advanced analytics drafts'),
  ('reports.advanced.generate', 'Generate advanced analytics trend and cohort metrics'),
  ('reports.advanced.submit', 'Submit advanced analytics for review'),
  ('reports.advanced.approve', 'Approve advanced analytics snapshots'),
  ('reports.advanced.return', 'Return advanced analytics snapshots for updates'),
  ('reports.advanced.override', 'Override advanced analytics visibility'),
  ('reports.advanced.export', 'Export advanced analytics snapshots'),
  ('reports.advanced.archive', 'Archive advanced analytics snapshots')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HRBP', 'reports.advanced.read'),
  ('HRBP', 'reports.advanced.create'),
  ('HRBP', 'reports.advanced.generate'),
  ('HRBP', 'reports.advanced.submit'),
  ('HRBP', 'reports.advanced.export'),
  ('HR_ADMIN', 'reports.advanced.read'),
  ('HR_ADMIN', 'reports.advanced.create'),
  ('HR_ADMIN', 'reports.advanced.generate'),
  ('HR_ADMIN', 'reports.advanced.submit'),
  ('HR_ADMIN', 'reports.advanced.approve'),
  ('HR_ADMIN', 'reports.advanced.return'),
  ('HR_ADMIN', 'reports.advanced.override'),
  ('HR_ADMIN', 'reports.advanced.export'),
  ('HR_ADMIN', 'reports.advanced.archive')
on conflict do nothing;

alter table public.advanced_analytics_snapshots enable row level security;

grant select, insert, update on public.advanced_analytics_snapshots to authenticated;
grant all on public.advanced_analytics_snapshots to service_role;

drop policy if exists "authorized users can read advanced analytics" on public.advanced_analytics_snapshots;
create policy "authorized users can read advanced analytics"
on public.advanced_analytics_snapshots for select
to authenticated
using (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "authorized users can write advanced analytics" on public.advanced_analytics_snapshots;
create policy "authorized users can write advanced analytics"
on public.advanced_analytics_snapshots for all
to authenticated
using (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

insert into public.advanced_analytics_snapshots (
  id,
  title,
  period_start,
  period_end,
  cohort_key,
  interval,
  status,
  owner_role,
  next_action,
  filters,
  trends,
  cohorts,
  summary,
  insights
)
values (
  '00000000-0000-4000-8000-000000000058',
  'Seed advanced analytics trends and cohorts',
  date_trunc('year', current_date)::date,
  current_date,
  'businessUnit',
  'month',
  'generated',
  'HRBP',
  'submit',
  '{"scope":"all_active_employees","source":"seed"}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'period', to_char(current_date, 'YYYY-MM'),
      'count', (select count(*) from public.end_cycle_evaluations) + (select count(*) from public.mid_cycle_evaluations),
      'averageScore', null,
      'pipFlags', (select count(*) from public.performance_band_flags where flag_type = 'pip'),
      'promotionFlags', (select count(*) from public.performance_band_flags where flag_type = 'promotion')
    )
  ),
  jsonb_build_array(
    jsonb_build_object(
      'cohort', 'All active employees',
      'employees', (select count(*) from public.profiles where account_status = 'active'),
      'evaluations', (select count(*) from public.end_cycle_evaluations) + (select count(*) from public.mid_cycle_evaluations),
      'completionRate', 0,
      'averageScore', null,
      'pipFlags', (select count(*) from public.performance_band_flags where flag_type = 'pip'),
      'promotionFlags', (select count(*) from public.performance_band_flags where flag_type = 'promotion')
    )
  ),
  jsonb_build_object('trendPeriods', 1, 'cohortCount', 1, 'latestAverageScore', null, 'scoreDelta', null),
  jsonb_build_array('Seed snapshot for advanced analytics trends and cohorts.')
)
on conflict (id) do nothing;
