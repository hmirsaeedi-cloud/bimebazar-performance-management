with active_profile as (
  select id, manager_id, hrbp_id
  from public.profiles
  where account_status = 'active'
  order by created_at
  limit 1
),
seed_cycle as (
  insert into public.mpa_cycles (name, starts_on, ends_on, status, created_by)
  select
    'Seed MPA History Cycle',
    current_date,
    (current_date + interval '180 days')::date,
    'active',
    id
  from active_profile
  where not exists (select 1 from public.mpa_cycles)
  returning id, created_by
),
usable_cycle as (
  select id, created_by from seed_cycle
  union all
  select id, created_by from public.mpa_cycles order by id limit 1
),
seed_mpa as (
  insert into public.mpas (
    employee_id,
    manager_id,
    hrbp_id,
    cycle_id,
    title,
    content,
    content_format,
    content_plain_text,
    approval_visibility,
    status,
    owner_role,
    next_action,
    created_by,
    updated_by
  )
  select
    p.id,
    coalesce(p.manager_id, p.id),
    p.hrbp_id,
    c.id,
    'Seed MPA for history versioning',
    '{"goals":[{"title":"Improve performance evidence","measure":"Document progress every month","weight":40}],"developmentActions":["Monthly check-in"],"notes":"Seed record for MPA history."}'::jsonb,
    'structured',
    'Improve performance evidence. Document progress every month.',
    '{"employeeCanViewManagerContent":false,"employeeCanViewHrbpNotes":false}'::jsonb,
    'draft',
    'MANAGER',
    'submit',
    p.id,
    p.id
  from active_profile p
  cross join usable_cycle c
  where not exists (select 1 from public.mpas)
  on conflict do nothing
  returning *
),
usable_mpa as (
  select * from seed_mpa
  union all
  select * from public.mpas order by created_at limit 1
)
insert into public.mpa_history_versions (
  mpa_id,
  employee_id,
  cycle_id,
  version_number,
  status,
  owner_role,
  next_action,
  source_mpa_status,
  title,
  content,
  content_format,
  content_plain_text,
  approval_visibility,
  snapshot,
  comparison_summary,
  created_by,
  updated_by
)
select
  m.id,
  m.employee_id,
  m.cycle_id,
  1,
  'captured',
  'HRBP',
  'approve',
  m.status,
  m.title,
  m.content,
  coalesce(m.content_format, 'structured'),
  m.content_plain_text,
  coalesce(m.approval_visibility, '{}'::jsonb),
  jsonb_build_object('title', m.title, 'status', m.status, 'capturedFromSeed', true),
  jsonb_build_object('summary', 'Seed history snapshot'),
  coalesce(m.updated_by, m.created_by),
  coalesce(m.updated_by, m.created_by)
from usable_mpa m
where not exists (
  select 1 from public.mpa_history_versions h where h.mpa_id = m.id and h.version_number = 1
)
on conflict do nothing;
