create table if not exists public.end_cycle_evaluations (
  id uuid primary key default gen_random_uuid(),
  process_id uuid references public.performance_processes(id) on delete cascade,
  participant_id uuid references public.process_participants(id) on delete set null,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  hrbp_id uuid references public.profiles(id) on delete set null,
  form_template_version_id uuid not null references public.form_template_versions(id) on delete restrict,
  locked_form_schema jsonb not null,
  status text not null default 'draft'
    check (status in ('draft', 'in_progress', 'submitted', 'returned', 'approved', 'visibility_approved', 'completed')),
  owner_role text not null default 'MANAGER'
    check (owner_role in ('MANAGER', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  answers jsonb not null default '{}'::jsonb,
  score jsonb not null default '{"visible":false,"totalScore":null,"sections":[]}'::jsonb,
  visibility jsonb not null default '{"employeeCanViewScore":false,"employeeCanViewManagerNotes":false}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  returned_at timestamptz,
  completed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, employee_id)
);

create index if not exists idx_end_cycle_evaluations_process on public.end_cycle_evaluations(process_id);
create index if not exists idx_end_cycle_evaluations_participant on public.end_cycle_evaluations(participant_id);
create index if not exists idx_end_cycle_evaluations_employee on public.end_cycle_evaluations(employee_id);
create index if not exists idx_end_cycle_evaluations_manager on public.end_cycle_evaluations(manager_id);
create index if not exists idx_end_cycle_evaluations_hrbp on public.end_cycle_evaluations(hrbp_id);
create index if not exists idx_end_cycle_evaluations_status on public.end_cycle_evaluations(status);

insert into public.permissions (code, description)
values
  ('evaluation.read', 'Read end-cycle evaluations'),
  ('evaluation.create', 'Create end-cycle evaluations'),
  ('evaluation.update', 'Update draft end-cycle evaluations'),
  ('evaluation.submit', 'Submit end-cycle evaluations'),
  ('evaluation.approve', 'Approve end-cycle evaluations'),
  ('evaluation.return', 'Return end-cycle evaluations for revision'),
  ('evaluation.override', 'Override end-cycle evaluation visibility')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('MANAGER', 'evaluation.read'),
  ('MANAGER', 'evaluation.create'),
  ('MANAGER', 'evaluation.update'),
  ('MANAGER', 'evaluation.submit'),
  ('HRBP', 'evaluation.read'),
  ('HRBP', 'evaluation.approve'),
  ('HRBP', 'evaluation.return'),
  ('HRBP', 'evaluation.override'),
  ('HR_ADMIN', 'evaluation.read'),
  ('HR_ADMIN', 'evaluation.create'),
  ('HR_ADMIN', 'evaluation.update'),
  ('HR_ADMIN', 'evaluation.submit'),
  ('HR_ADMIN', 'evaluation.approve'),
  ('HR_ADMIN', 'evaluation.return'),
  ('HR_ADMIN', 'evaluation.override'),
  ('EMPLOYEE', 'evaluation.read')
on conflict do nothing;

alter table public.end_cycle_evaluations enable row level security;

grant select on public.end_cycle_evaluations to authenticated;
grant insert, update on public.end_cycle_evaluations to authenticated;
grant all on public.end_cycle_evaluations to service_role;

drop policy if exists "authorized users can read end cycle evaluations" on public.end_cycle_evaluations;
create policy "authorized users can read end cycle evaluations"
on public.end_cycle_evaluations for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "authorized users can write end cycle evaluations" on public.end_cycle_evaluations;
create policy "authorized users can write end cycle evaluations"
on public.end_cycle_evaluations for all
to authenticated
using (
  manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
)
with check (
  manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

with template as (
  insert into public.form_templates (
    id,
    name,
    description,
    module,
    status,
    owner_role,
    template_key,
    template_category,
    is_system_template
  )
  values (
    '00000000-0000-4000-8000-000000000024',
    'End-cycle evaluation default',
    'Weighted manager evaluation template for end-cycle reviews.',
    'evaluation',
    'published',
    'HR_ADMIN',
    'end_cycle_evaluation_default',
    'system_default',
    true
  )
  on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      status = excluded.status,
      template_key = excluded.template_key,
      template_category = excluded.template_category,
      is_system_template = excluded.is_system_template
  returning id
),
version as (
  insert into public.form_template_versions (
    id,
    template_id,
    version_number,
    status,
    schema,
    published_at
  )
  select
    '00000000-0000-4000-8000-000000000025',
    id,
    1,
    'published',
    '{
      "title": "End-cycle evaluation",
      "description": "Weighted sections with score shown only after manager submission.",
      "sections": [
        {
          "id": "results",
          "title": "Results",
          "questions": [
            { "id": "results_rating", "type": "scale", "label": "Results rating", "required": true, "min": 0, "max": 5, "weight": 60 },
            { "id": "results_evidence", "type": "long_text", "label": "Results evidence", "required": true }
          ]
        },
        {
          "id": "behaviors",
          "title": "Behaviors",
          "questions": [
            { "id": "behavior_rating", "type": "scale", "label": "Behavior rating", "required": true, "min": 0, "max": 5, "weight": 40 },
            { "id": "behavior_evidence", "type": "long_text", "label": "Behavior evidence", "required": true }
          ]
        }
      ]
    }'::jsonb,
    now()
  from template
  on conflict (id) do update
  set schema = excluded.schema,
      status = excluded.status,
      published_at = excluded.published_at
  returning id, template_id
)
update public.form_templates ft
set current_version_id = version.id,
    updated_at = now()
from version
where ft.id = version.template_id
   or ft.template_key = 'end_cycle_evaluation_default';
