create table if not exists public.employee_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'validating', 'validated', 'failed_validation', 'processing', 'completed', 'completed_with_errors', 'cancelled')),
  owner_role text not null default 'HR_ADMIN'
    check (owner_role in ('HR_ADMIN', 'SYSTEM')),
  next_action text,
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  created_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  created_by uuid references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.employee_import_runs(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null,
  normalized_data jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'valid', 'invalid', 'created', 'skipped', 'error')),
  errors jsonb not null default '[]'::jsonb,
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_run_id, row_number)
);

create index if not exists idx_employee_import_runs_status on public.employee_import_runs(status);
create index if not exists idx_employee_import_runs_created_by on public.employee_import_runs(created_by);
create index if not exists idx_employee_import_rows_run on public.employee_import_rows(import_run_id);
create index if not exists idx_employee_import_rows_status on public.employee_import_rows(status);

insert into public.permissions (code, description)
values
  ('profiles.bulk_import', 'Bulk import employee profiles from Excel'),
  ('profiles.import_read', 'Read employee import runs and row results')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HR_ADMIN', 'profiles.bulk_import'),
  ('HR_ADMIN', 'profiles.import_read'),
  ('HRBP', 'profiles.import_read')
on conflict do nothing;

alter table public.employee_import_runs enable row level security;
alter table public.employee_import_rows enable row level security;

grant select on public.employee_import_runs to authenticated;
grant insert, update on public.employee_import_runs to authenticated;
grant select on public.employee_import_rows to authenticated;
grant insert, update on public.employee_import_rows to authenticated;
grant all on public.employee_import_runs to service_role;
grant all on public.employee_import_rows to service_role;

drop policy if exists "hr can read employee import runs" on public.employee_import_runs;
create policy "hr can read employee import runs"
on public.employee_import_runs for select
to authenticated
using (
  (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "hr admin can write employee import runs" on public.employee_import_runs;
create policy "hr admin can write employee import runs"
on public.employee_import_runs for all
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')))
with check ((select app_private.current_user_has_role('HR_ADMIN')));

drop policy if exists "hr can read employee import rows" on public.employee_import_rows;
create policy "hr can read employee import rows"
on public.employee_import_rows for select
to authenticated
using (
  (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "hr admin can write employee import rows" on public.employee_import_rows;
create policy "hr admin can write employee import rows"
on public.employee_import_rows for all
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')))
with check ((select app_private.current_user_has_role('HR_ADMIN')));
