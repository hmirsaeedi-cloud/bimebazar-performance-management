create table if not exists public.performance_band_flags (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.end_cycle_evaluations(id) on delete cascade,
  process_id uuid references public.performance_processes(id) on delete set null,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  hrbp_id uuid references public.profiles(id) on delete set null,
  flag_type text not null check (flag_type in ('pip', 'promotion', 'none')),
  band_label text not null,
  weighted_score numeric not null,
  score_engine_version text not null default 'weighted-v1',
  section_contributions jsonb not null default '[]'::jsonb,
  thresholds jsonb not null default '{"pipMax":59.99,"promotionMin":90}'::jsonb,
  rationale text not null,
  status text not null default 'detected'
    check (status in ('detected', 'under_review', 'approved', 'returned', 'converted', 'dismissed')),
  owner_role text not null default 'HRBP'
    check (owner_role in ('HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  visibility jsonb not null default '{"employeeCanView":false,"managerCanView":true,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  returned_at timestamptz,
  converted_at timestamptz,
  dismissed_at timestamptz,
  visibility_changed_at timestamptz,
  last_return_reason text,
  dismissal_reason text,
  conversion_target_type text check (conversion_target_type in ('pip', 'promotion')),
  conversion_target_id uuid,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evaluation_id, flag_type)
);

create index if not exists idx_performance_band_flags_evaluation
  on public.performance_band_flags(evaluation_id);

create index if not exists idx_performance_band_flags_employee_status
  on public.performance_band_flags(employee_id, status);

create index if not exists idx_performance_band_flags_type_status
  on public.performance_band_flags(flag_type, status);

alter table public.performance_band_flags enable row level security;

grant select, insert, update on public.performance_band_flags to authenticated;
grant all on public.performance_band_flags to service_role;

drop policy if exists "performance band flags visible to evaluation actors" on public.performance_band_flags;
create policy "performance band flags visible to evaluation actors"
on public.performance_band_flags for select
to authenticated
using (
  (visibility->>'employeeCanView' = 'true' and employee_id = (select auth.uid()))
  or (visibility->>'managerCanView' = 'true' and manager_id = (select auth.uid()))
  or hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "performance band flags created by hr actors" on public.performance_band_flags;
create policy "performance band flags created by hr actors"
on public.performance_band_flags for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    hrbp_id = (select auth.uid())
    or (select app_private.current_user_has_role('HR_ADMIN'))
    or (select app_private.current_user_has_role('HRBP'))
  )
);

drop policy if exists "performance band flags updated by hr actors" on public.performance_band_flags;
create policy "performance band flags updated by hr actors"
on public.performance_band_flags for update
to authenticated
using (
  hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
)
with check (
  hrbp_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

insert into public.permissions (code, description) values
  ('evaluation.band_flags.read', 'Read performance band auto-flags'),
  ('evaluation.band_flags.create', 'Generate performance band auto-flags'),
  ('evaluation.band_flags.update', 'Update performance band auto-flags'),
  ('evaluation.band_flags.submit', 'Submit performance band auto-flags for review'),
  ('evaluation.band_flags.approve', 'Approve performance band auto-flags'),
  ('evaluation.band_flags.return', 'Return performance band auto-flags'),
  ('evaluation.band_flags.override', 'Override performance band flag visibility'),
  ('evaluation.band_flags.convert', 'Convert performance band flag into PIP or Promotion'),
  ('evaluation.band_flags.dismiss', 'Dismiss performance band auto-flags')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code) values
  ('MANAGER', 'evaluation.band_flags.read'),
  ('HRBP', 'evaluation.band_flags.read'),
  ('HRBP', 'evaluation.band_flags.create'),
  ('HRBP', 'evaluation.band_flags.update'),
  ('HRBP', 'evaluation.band_flags.submit'),
  ('HRBP', 'evaluation.band_flags.approve'),
  ('HRBP', 'evaluation.band_flags.return'),
  ('HRBP', 'evaluation.band_flags.override'),
  ('HRBP', 'evaluation.band_flags.dismiss'),
  ('HR_ADMIN', 'evaluation.band_flags.read'),
  ('HR_ADMIN', 'evaluation.band_flags.create'),
  ('HR_ADMIN', 'evaluation.band_flags.update'),
  ('HR_ADMIN', 'evaluation.band_flags.submit'),
  ('HR_ADMIN', 'evaluation.band_flags.approve'),
  ('HR_ADMIN', 'evaluation.band_flags.return'),
  ('HR_ADMIN', 'evaluation.band_flags.override'),
  ('HR_ADMIN', 'evaluation.band_flags.convert'),
  ('HR_ADMIN', 'evaluation.band_flags.dismiss')
on conflict do nothing;

with scored as (
  select
    e.id as evaluation_id,
    e.process_id,
    e.employee_id,
    e.manager_id,
    e.hrbp_id,
    coalesce(nullif(e.score->>'totalScore', '')::numeric, 0) as weighted_score,
    e.score_engine_version,
    coalesce(e.score->'sections', '[]'::jsonb) as sections,
    coalesce(e.updated_by, e.created_by) as actor_id
  from public.end_cycle_evaluations e
  where e.score->>'visible' = 'true'
    and e.score ? 'totalScore'
  order by e.updated_at desc
  limit 1
),
classified as (
  select
    *,
    case
      when weighted_score <= 59.99 then 'pip'
      when weighted_score >= 90 then 'promotion'
      else 'none'
    end as flag_type,
    case
      when weighted_score <= 59.99 then 'PIP watch'
      when weighted_score >= 90 then 'Promotion ready'
      else 'No action'
    end as band_label,
    case
      when weighted_score <= 59.99 then 'Seed flag: weighted score is at or below the PIP threshold.'
      when weighted_score >= 90 then 'Seed flag: weighted score is at or above the promotion threshold.'
      else 'Seed flag: weighted score is between thresholds.'
    end as rationale
  from scored
)
insert into public.performance_band_flags (
  evaluation_id,
  process_id,
  employee_id,
  manager_id,
  hrbp_id,
  flag_type,
  band_label,
  weighted_score,
  score_engine_version,
  section_contributions,
  thresholds,
  rationale,
  status,
  owner_role,
  next_action,
  created_by,
  updated_by
)
select
  evaluation_id,
  process_id,
  employee_id,
  manager_id,
  hrbp_id,
  flag_type,
  band_label,
  weighted_score,
  score_engine_version,
  sections,
  '{"pipMax":59.99,"promotionMin":90}'::jsonb,
  rationale,
  'detected',
  'HRBP',
  'submit',
  actor_id,
  actor_id
from classified
where flag_type <> 'none'
on conflict (evaluation_id, flag_type) do nothing;
