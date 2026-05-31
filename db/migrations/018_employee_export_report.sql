create table if not exists public.employee_export_reports (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'requested'
    check (status in ('requested', 'generating', 'ready', 'failed', 'cancelled')),
  owner_role text not null default 'HR_ADMIN'
    check (owner_role in ('HR_ADMIN', 'SYSTEM')),
  next_action text,
  filters jsonb not null default '{}'::jsonb,
  columns jsonb not null default '[]'::jsonb,
  row_count integer not null default 0,
  file_name text,
  storage_path text,
  requested_by uuid references auth.users(id),
  generated_at timestamptz,
  expires_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employee_export_reports_status on public.employee_export_reports(status);
create index if not exists idx_employee_export_reports_requested_by on public.employee_export_reports(requested_by);

insert into public.permissions (code, description)
values
  ('profiles.export', 'Export employee profile reports')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HR_ADMIN', 'profiles.export'),
  ('HRBP', 'profiles.export')
on conflict do nothing;

alter table public.employee_export_reports enable row level security;

grant select on public.employee_export_reports to authenticated;
grant insert, update on public.employee_export_reports to authenticated;
grant all on public.employee_export_reports to service_role;

drop policy if exists "hr can read employee export reports" on public.employee_export_reports;
create policy "hr can read employee export reports"
on public.employee_export_reports for select
to authenticated
using (
  (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "hr can write employee export reports" on public.employee_export_reports;
create policy "hr can write employee export reports"
on public.employee_export_reports for all
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')))
with check ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')));
