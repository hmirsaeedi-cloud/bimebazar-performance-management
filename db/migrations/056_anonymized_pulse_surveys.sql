create table if not exists public.pulse_survey_processes (
  id uuid primary key default gen_random_uuid(),
  process_id uuid references public.performance_processes(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'configured', 'active', 'anonymity_review', 'approved', 'returned', 'released', 'completed', 'visibility_changed', 'cancelled')),
  owner_role text not null default 'HR_ADMIN'
    check (owner_role in ('EMPLOYEE', 'MANAGER', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  form_template_id uuid references public.form_templates(id) on delete set null,
  form_template_version_id uuid not null references public.form_template_versions(id) on delete restrict,
  locked_form_template_version_id uuid not null references public.form_template_versions(id) on delete restrict,
  target_employee_ids uuid[] not null default '{}'::uuid[],
  eligible_employee_count integer not null default 0 check (eligible_employee_count >= 0),
  min_responses integer not null default 3 check (min_responses >= 3),
  response_count integer not null default 0 check (response_count >= 0),
  pulse_settings jsonb not null default '{"anonymous":true,"channel":"pulse"}'::jsonb,
  aggregate_results jsonb not null default '{}'::jsonb,
  anonymity_guard jsonb not null default '{"responseCount":0,"minResponses":3,"canRelease":false,"missingResponses":3}'::jsonb,
  visibility jsonb not null default '{"employeeCanView":true,"managerCanViewAggregates":false,"hrbpCanViewAggregates":true,"hrAdminCanViewAggregates":true}'::jsonb,
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  returned_at timestamptz,
  released_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  visibility_changed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (locked_form_template_version_id = form_template_version_id),
  check (eligible_employee_count > 0)
);

create table if not exists public.pulse_survey_responses (
  id uuid primary key default gen_random_uuid(),
  pulse_survey_id uuid not null references public.pulse_survey_processes(id) on delete cascade,
  respondent_code text not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected')),
  owner_role text not null default 'HRBP'
    check (owner_role in ('EMPLOYEE', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pulse_survey_id, respondent_code)
);

create index if not exists idx_pulse_survey_processes_status
  on public.pulse_survey_processes(status, updated_at desc);

create index if not exists idx_pulse_survey_processes_targets
  on public.pulse_survey_processes using gin(target_employee_ids);

create index if not exists idx_pulse_survey_responses_process
  on public.pulse_survey_responses(pulse_survey_id, status);

insert into public.permissions (code, description) values
  ('process.pulse.read', 'Read anonymized pulse surveys and released aggregates'),
  ('process.pulse.create', 'Create anonymized pulse surveys'),
  ('process.pulse.update', 'Update anonymized pulse surveys'),
  ('process.pulse.start', 'Start anonymized pulse surveys'),
  ('process.pulse.submit', 'Submit anonymized pulse survey responses'),
  ('process.pulse.approve', 'Approve pulse survey aggregate release'),
  ('process.pulse.return', 'Return pulse surveys for revision'),
  ('process.pulse.override', 'Override pulse survey visibility'),
  ('process.pulse.release', 'Release anonymized pulse survey aggregates'),
  ('process.pulse.complete', 'Complete anonymized pulse surveys'),
  ('process.pulse.cancel', 'Cancel anonymized pulse surveys')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code) values
  ('EMPLOYEE', 'process.pulse.read'),
  ('EMPLOYEE', 'process.pulse.submit'),
  ('MANAGER', 'process.pulse.read'),
  ('HRBP', 'process.pulse.read'),
  ('HRBP', 'process.pulse.approve'),
  ('HRBP', 'process.pulse.return'),
  ('HRBP', 'process.pulse.override'),
  ('HRBP', 'process.pulse.release'),
  ('HRBP', 'process.pulse.complete'),
  ('HR_ADMIN', 'process.pulse.read'),
  ('HR_ADMIN', 'process.pulse.create'),
  ('HR_ADMIN', 'process.pulse.update'),
  ('HR_ADMIN', 'process.pulse.start'),
  ('HR_ADMIN', 'process.pulse.approve'),
  ('HR_ADMIN', 'process.pulse.return'),
  ('HR_ADMIN', 'process.pulse.override'),
  ('HR_ADMIN', 'process.pulse.release'),
  ('HR_ADMIN', 'process.pulse.complete'),
  ('HR_ADMIN', 'process.pulse.cancel')
on conflict do nothing;

alter table public.pulse_survey_processes enable row level security;
alter table public.pulse_survey_responses enable row level security;

grant select, insert, update on public.pulse_survey_processes to authenticated;
grant select, insert, update on public.pulse_survey_responses to authenticated;
grant all on public.pulse_survey_processes to service_role;
grant all on public.pulse_survey_responses to service_role;

drop policy if exists "pulse surveys visible to target and hr" on public.pulse_survey_processes;
create policy "pulse surveys visible to target and hr"
on public.pulse_survey_processes for select
to authenticated
using (
  (select auth.uid()) = any(target_employee_ids)
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
  or (
    visibility->>'managerCanViewAggregates' = 'true'
    and exists (
      select 1
      from public.profiles p
      where p.id = any(target_employee_ids)
        and p.manager_id = (select auth.uid())
    )
  )
);

drop policy if exists "pulse surveys created by hr" on public.pulse_survey_processes;
create policy "pulse surveys created by hr"
on public.pulse_survey_processes for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')))
  and eligible_employee_count > 0
);

drop policy if exists "pulse surveys updated by hr" on public.pulse_survey_processes;
create policy "pulse surveys updated by hr"
on public.pulse_survey_processes for update
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')))
with check ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')));

drop policy if exists "pulse responses inserted by authenticated users" on public.pulse_survey_responses;
create policy "pulse responses inserted by authenticated users"
on public.pulse_survey_responses for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "pulse responses visible only to hr" on public.pulse_survey_responses;
create policy "pulse responses visible only to hr"
on public.pulse_survey_responses for select
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')));

drop policy if exists "pulse responses updated only by hr" on public.pulse_survey_responses;
create policy "pulse responses updated only by hr"
on public.pulse_survey_responses for update
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')))
with check ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')));

with sample as (
  select
    ft.id as template_id,
    ftv.id as version_id,
    array_agg(p.id order by p.created_at asc) filter (where p.id is not null) as employee_ids,
    coalesce(
      (array_agg(hr.id order by hr.created_at asc) filter (where hr.id is not null))[1],
      (array_agg(p.id order by p.created_at asc) filter (where p.id is not null))[1]
    ) as actor_id
  from public.form_templates ft
  join public.form_template_versions ftv on ftv.template_id = ft.id
  left join public.profiles p on p.account_status = 'active'
  left join public.profiles hr on hr.account_status = 'active' and hr.role_code in ('HR_ADMIN', 'HRBP')
  group by ft.id, ftv.id
  order by max(ftv.version_number) desc
  limit 1
)
insert into public.pulse_survey_processes (
  title,
  description,
  status,
  owner_role,
  next_action,
  form_template_id,
  form_template_version_id,
  locked_form_template_version_id,
  target_employee_ids,
  eligible_employee_count,
  min_responses,
  pulse_settings,
  anonymity_guard,
  created_by,
  updated_by
)
select
  'S10 anonymized pulse survey',
  'Seeded scaffold for anonymous team mood and clarity pulse checks.',
  'configured',
  'HR_ADMIN',
  'start',
  template_id,
  version_id,
  version_id,
  employee_ids[1:least(array_length(employee_ids, 1), 5)],
  least(array_length(employee_ids, 1), 5),
  3,
  '{"anonymous":true,"channel":"pulse","cadence":"ad_hoc"}'::jsonb,
  '{"responseCount":0,"minResponses":3,"canRelease":false,"missingResponses":3}'::jsonb,
  actor_id,
  actor_id
from sample
where version_id is not null
  and array_length(employee_ids, 1) > 0
  and not exists (select 1 from public.pulse_survey_processes where title = 'S10 anonymized pulse survey');
