create table if not exists public.individual_survey_processes (
  id uuid primary key default gen_random_uuid(),
  process_id uuid references public.performance_processes(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'configured', 'active', 'submitted', 'approved', 'returned', 'completed', 'cancelled')),
  owner_role text not null default 'HR_ADMIN'
    check (owner_role in ('EMPLOYEE', 'MANAGER', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  form_template_id uuid references public.form_templates(id) on delete set null,
  form_template_version_id uuid not null references public.form_template_versions(id) on delete restrict,
  locked_form_template_version_id uuid not null references public.form_template_versions(id) on delete restrict,
  target_employee_ids uuid[] not null default '{}'::uuid[],
  eligible_employee_count integer not null default 0 check (eligible_employee_count >= 0),
  survey_settings jsonb not null default '{"anonymous":false,"allowManagerView":false}'::jsonb,
  visibility jsonb not null default '{"employeeCanView":true,"managerCanView":false,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  returned_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  visibility_changed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (locked_form_template_version_id = form_template_version_id)
);

create table if not exists public.individual_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_process_id uuid not null references public.individual_survey_processes(id) on delete cascade,
  employee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'submitted', 'approved', 'returned')),
  owner_role text not null default 'EMPLOYEE'
    check (owner_role in ('EMPLOYEE', 'HRBP', 'SYSTEM')),
  next_action text,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  returned_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (survey_process_id, employee_id)
);

create index if not exists idx_individual_survey_processes_status
  on public.individual_survey_processes(status, updated_at desc);

create index if not exists idx_individual_survey_processes_target_employees
  on public.individual_survey_processes using gin(target_employee_ids);

create index if not exists idx_individual_survey_responses_process_status
  on public.individual_survey_responses(survey_process_id, status);

create index if not exists idx_individual_survey_responses_employee
  on public.individual_survey_responses(employee_id, status);

alter table public.individual_survey_processes enable row level security;
alter table public.individual_survey_responses enable row level security;

grant select, insert, update on public.individual_survey_processes to authenticated;
grant select, insert, update on public.individual_survey_responses to authenticated;
grant all on public.individual_survey_processes to service_role;
grant all on public.individual_survey_responses to service_role;

drop policy if exists "individual survey processes visible to actors" on public.individual_survey_processes;
create policy "individual survey processes visible to actors"
on public.individual_survey_processes for select
to authenticated
using (
  (select auth.uid()) = any(target_employee_ids)
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
  or (
    visibility->>'managerCanView' = 'true'
    and exists (
      select 1
      from public.profiles p
      where p.id = any(target_employee_ids)
        and p.manager_id = (select auth.uid())
    )
  )
);

drop policy if exists "individual survey processes created by hr" on public.individual_survey_processes;
create policy "individual survey processes created by hr"
on public.individual_survey_processes for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')))
  and eligible_employee_count > 0
);

drop policy if exists "individual survey processes updated by hr" on public.individual_survey_processes;
create policy "individual survey processes updated by hr"
on public.individual_survey_processes for update
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')))
with check ((select app_private.current_user_has_role('HR_ADMIN')) or (select app_private.current_user_has_role('HRBP')));

drop policy if exists "individual survey responses visible to actors" on public.individual_survey_responses;
create policy "individual survey responses visible to actors"
on public.individual_survey_responses for select
to authenticated
using (
  employee_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "individual survey responses created by actors" on public.individual_survey_responses;
create policy "individual survey responses created by actors"
on public.individual_survey_responses for insert
to authenticated
with check (
  employee_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "individual survey responses updated by actors" on public.individual_survey_responses;
create policy "individual survey responses updated by actors"
on public.individual_survey_responses for update
to authenticated
using (
  employee_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
)
with check (
  employee_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

insert into public.permissions (code, description) values
  ('process.survey.read', 'Read individual survey processes'),
  ('process.survey.create', 'Create individual survey processes'),
  ('process.survey.update', 'Update individual survey processes'),
  ('process.survey.start', 'Start individual survey processes'),
  ('process.survey.submit', 'Submit individual survey responses'),
  ('process.survey.approve', 'Approve individual survey responses'),
  ('process.survey.return', 'Return individual survey responses'),
  ('process.survey.override', 'Override individual survey visibility'),
  ('process.survey.complete', 'Complete individual survey processes'),
  ('process.survey.cancel', 'Cancel individual survey processes')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code) values
  ('EMPLOYEE', 'process.survey.read'),
  ('EMPLOYEE', 'process.survey.submit'),
  ('MANAGER', 'process.survey.read'),
  ('HRBP', 'process.survey.read'),
  ('HRBP', 'process.survey.approve'),
  ('HRBP', 'process.survey.return'),
  ('HRBP', 'process.survey.override'),
  ('HRBP', 'process.survey.complete'),
  ('HR_ADMIN', 'process.survey.read'),
  ('HR_ADMIN', 'process.survey.create'),
  ('HR_ADMIN', 'process.survey.update'),
  ('HR_ADMIN', 'process.survey.start'),
  ('HR_ADMIN', 'process.survey.approve'),
  ('HR_ADMIN', 'process.survey.return'),
  ('HR_ADMIN', 'process.survey.override'),
  ('HR_ADMIN', 'process.survey.complete'),
  ('HR_ADMIN', 'process.survey.cancel')
on conflict do nothing;

with sample as (
  select
    ft.id as template_id,
    ftv.id as version_id,
    array_agg(p.id order by p.created_at asc) filter (where p.id is not null) as employee_ids,
    (array_agg(p.id order by p.created_at asc) filter (where p.id is not null))[1] as employee_id,
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
),
inserted as (
  insert into public.individual_survey_processes (
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
    survey_settings,
    created_by,
    updated_by
  )
  select
    'S6 individual pulse survey',
    'Seeded scaffold for one-off individual survey routing.',
    'configured',
    'HR_ADMIN',
    'start',
    template_id,
    version_id,
    version_id,
    employee_ids[1:least(array_length(employee_ids, 1), 3)],
    least(array_length(employee_ids, 1), 3),
    '{"anonymous":false,"allowManagerView":false,"channel":"individual"}'::jsonb,
    actor_id,
    actor_id
  from sample
  where version_id is not null
    and employee_id is not null
    and not exists (select 1 from public.individual_survey_processes where title = 'S6 individual pulse survey')
  returning id, target_employee_ids, created_by
)
insert into public.individual_survey_responses (
  survey_process_id,
  employee_id,
  status,
  owner_role,
  next_action,
  created_by,
  updated_by
)
select
  inserted.id,
  employee_id,
  'assigned',
  'EMPLOYEE',
  'submit',
  inserted.created_by,
  inserted.created_by
from inserted
cross join unnest(inserted.target_employee_ids) as employee_id
on conflict (survey_process_id, employee_id) do nothing;
