alter table public.performance_processes
  add column if not exists configured_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists configured_participant_count integer not null default 0,
  add column if not exists locked_form_template_version_id uuid references public.form_template_versions(id) on delete restrict,
  add column if not exists locked_form_version_number integer,
  add column if not exists locked_form_schema jsonb;

create index if not exists idx_performance_processes_locked_form_version
  on public.performance_processes(locked_form_template_version_id);
