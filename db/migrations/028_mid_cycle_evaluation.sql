create table if not exists public.mid_cycle_evaluations (
  id uuid primary key default gen_random_uuid(),
  process_id uuid references public.performance_processes(id) on delete cascade,
  participant_id uuid references public.process_participants(id) on delete set null,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  hrbp_id uuid references public.profiles(id) on delete set null,
  form_template_version_id uuid not null references public.form_template_versions(id) on delete restrict,
  locked_form_schema jsonb not null,
  status text not null default 'draft'
    check (status in ('draft', 'in_progress', 'submitted', 'manager_approved', 'hrbp_approved', 'returned', 'visibility_approved', 'completed')),
  owner_role text not null default 'MANAGER'
    check (owner_role in ('MANAGER', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  answers jsonb not null default '{}'::jsonb,
  score jsonb not null default '{"visible":false,"totalScore":null,"sections":[]}'::jsonb,
  score_engine_version text not null default 'weighted-v1',
  score_calculated_at timestamptz,
  visibility jsonb not null default '{"employeeCanViewScore":false,"employeeCanViewManagerNotes":false}'::jsonb,
  submitted_at timestamptz,
  manager_approved_at timestamptz,
  hrbp_approved_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  completed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, employee_id)
);

create index if not exists idx_mid_cycle_evaluations_process on public.mid_cycle_evaluations(process_id);
create index if not exists idx_mid_cycle_evaluations_participant on public.mid_cycle_evaluations(participant_id);
create index if not exists idx_mid_cycle_evaluations_employee on public.mid_cycle_evaluations(employee_id);
create index if not exists idx_mid_cycle_evaluations_manager on public.mid_cycle_evaluations(manager_id);
create index if not exists idx_mid_cycle_evaluations_hrbp on public.mid_cycle_evaluations(hrbp_id);
create index if not exists idx_mid_cycle_evaluations_status on public.mid_cycle_evaluations(status);

create table if not exists public.mid_cycle_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.mid_cycle_evaluations(id) on delete cascade,
  engine_version text not null default 'weighted-v1',
  mode text not null check (mode in ('hidden_preview', 'submitted')),
  visible boolean not null default false,
  total_score numeric,
  weight_total numeric not null default 0,
  sections jsonb not null default '[]'::jsonb,
  answers_hash text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_mid_cycle_score_snapshots_evaluation
  on public.mid_cycle_score_snapshots(evaluation_id);

insert into public.role_permissions (role_code, permission_code)
values
  ('MANAGER', 'evaluation.read'),
  ('MANAGER', 'evaluation.create'),
  ('MANAGER', 'evaluation.update'),
  ('MANAGER', 'evaluation.submit'),
  ('MANAGER', 'evaluation.approve'),
  ('MANAGER', 'evaluation.return'),
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
  ('HR_ADMIN', 'evaluation.override')
on conflict do nothing;

alter table public.mid_cycle_evaluations enable row level security;
alter table public.mid_cycle_score_snapshots enable row level security;

grant select on public.mid_cycle_evaluations to authenticated;
grant insert, update on public.mid_cycle_evaluations to authenticated;
grant all on public.mid_cycle_evaluations to service_role;
grant select on public.mid_cycle_score_snapshots to authenticated;
grant insert on public.mid_cycle_score_snapshots to authenticated;
grant all on public.mid_cycle_score_snapshots to service_role;

drop policy if exists "authorized users can read mid cycle evaluations" on public.mid_cycle_evaluations;
create policy "authorized users can read mid cycle evaluations"
on public.mid_cycle_evaluations for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "authorized users can write mid cycle evaluations" on public.mid_cycle_evaluations;
create policy "authorized users can write mid cycle evaluations"
on public.mid_cycle_evaluations for all
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

drop policy if exists "authorized users can read mid cycle score snapshots" on public.mid_cycle_score_snapshots;
create policy "authorized users can read mid cycle score snapshots"
on public.mid_cycle_score_snapshots for select
to authenticated
using (
  exists (
    select 1 from public.mid_cycle_evaluations e
    where e.id = mid_cycle_score_snapshots.evaluation_id
      and (
        e.employee_id = (select auth.uid())
        or e.manager_id = (select auth.uid())
        or e.hrbp_id = (select auth.uid())
        or (select app_private.current_user_has_role('HR_ADMIN'))
        or (select app_private.current_user_has_role('HRBP'))
      )
  )
);

drop policy if exists "authorized users can write mid cycle score snapshots" on public.mid_cycle_score_snapshots;
create policy "authorized users can write mid cycle score snapshots"
on public.mid_cycle_score_snapshots for insert
to authenticated
with check (
  exists (
    select 1 from public.mid_cycle_evaluations e
    where e.id = mid_cycle_score_snapshots.evaluation_id
      and (
        e.manager_id = (select auth.uid())
        or e.hrbp_id = (select auth.uid())
        or (select app_private.current_user_has_role('HR_ADMIN'))
      )
  )
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
    '00000000-0000-4000-8000-000000000028',
    'Mid-cycle evaluation default',
    'Weighted manager checkpoint template for mid-cycle reviews.',
    'evaluation',
    'published',
    'HR_ADMIN',
    'mid_cycle_evaluation_default',
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
    '00000000-0000-4000-8000-000000000029',
    id,
    1,
    'published',
    '{
      "title": "Mid-cycle evaluation",
      "description": "Weighted checkpoint sections with score shown only after manager submission.",
      "sections": [
        {
          "id": "progress",
          "title": "Progress toward goals",
          "questions": [
            { "id": "progress_rating", "type": "scale", "label": "Progress rating", "required": true, "min": 0, "max": 5, "weight": 70 },
            { "id": "progress_notes", "type": "long_text", "label": "Progress evidence", "required": true }
          ]
        },
        {
          "id": "support",
          "title": "Support and blockers",
          "questions": [
            { "id": "support_rating", "type": "scale", "label": "Support needs rating", "required": true, "min": 0, "max": 5, "weight": 30 },
            { "id": "support_notes", "type": "long_text", "label": "Support plan", "required": true }
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
   or ft.template_key = 'mid_cycle_evaluation_default';
