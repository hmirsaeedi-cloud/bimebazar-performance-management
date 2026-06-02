with seed_input as (
  select
    p.id as employee_id,
    coalesce(p.manager_id, hr.id, p.id) as manager_id,
    coalesce(p.hrbp_id, hr.id, p.id) as hrbp_id,
    coalesce(hr.id, p.id) as actor_id,
    fv.id as form_template_version_id,
    fv.schema as locked_form_schema
  from public.profiles p
  cross join lateral (
    select id
    from public.profiles
    where account_status = 'active'
      and role_code in ('HR_ADMIN', 'HRBP')
    order by created_at asc
    limit 1
  ) hr
  cross join lateral (
    select id, schema
    from public.form_template_versions
    order by created_at desc
    limit 1
  ) fv
  where p.account_status = 'active'
  order by p.created_at asc
  limit 1
),
evaluation as (
  insert into public.end_cycle_evaluations (
    employee_id,
    manager_id,
    hrbp_id,
    form_template_version_id,
    locked_form_schema,
    status,
    owner_role,
    next_action,
    answers,
    score,
    score_engine_version,
    score_calculated_at,
    submitted_at,
    review_chain,
    created_by,
    updated_by
  )
  select
    employee_id,
    manager_id,
    hrbp_id,
    form_template_version_id,
    locked_form_schema,
    'submitted',
    'NEXT_LEVEL_MANAGER',
    'next_level_approve',
    '{"results_rating":{"value":1,"selected":true},"behavior_rating":{"value":2,"selected":true},"results_evidence":"Seed low-score evaluation for performance band flag.","behavior_evidence":"Seed low-score evaluation for performance band flag."}'::jsonb,
    '{"engineVersion":"weighted-v1","mode":"submitted","visible":true,"totalScore":28,"weightTotal":100,"sections":[{"sectionId":"results","sectionTitle":"Results","weight":60,"contribution":12,"questions":[]},{"sectionId":"behaviors","sectionTitle":"Behaviors","weight":40,"contribution":16,"questions":[]}]}'::jsonb,
    'weighted-v1',
    now(),
    now(),
    '{"steps":["MANAGER","NEXT_LEVEL_MANAGER","HEAD","HRBP","SYSTEM"],"currentStep":"NEXT_LEVEL_MANAGER"}'::jsonb,
    actor_id,
    actor_id
  from seed_input
  where not exists (
    select 1
    from public.performance_band_flags
    where rationale = 'Seed flag: low score generated for Sprint 7 scaffold.'
  )
  returning id, process_id, employee_id, manager_id, hrbp_id, score, score_engine_version, created_by
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
  id,
  process_id,
  employee_id,
  manager_id,
  hrbp_id,
  'pip',
  'PIP watch',
  (score->>'totalScore')::numeric,
  score_engine_version,
  score->'sections',
  '{"pipMax":59.99,"promotionMin":90}'::jsonb,
  'Seed flag: low score generated for Sprint 7 scaffold.',
  'detected',
  'HRBP',
  'submit',
  created_by,
  created_by
from evaluation
on conflict (evaluation_id, flag_type) do nothing;
