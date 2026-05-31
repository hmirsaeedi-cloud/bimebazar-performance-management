alter table public.employee_import_runs
  add column if not exists dry_run boolean not null default false,
  add column if not exists submitted_at timestamptz,
  add column if not exists validation_summary jsonb not null default '{}'::jsonb;

create index if not exists idx_employee_import_runs_dry_run on public.employee_import_runs(dry_run);
