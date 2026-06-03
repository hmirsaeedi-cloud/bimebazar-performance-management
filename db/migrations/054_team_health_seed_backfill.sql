with seed_team as (
  select
    (select id from public.teams order by created_at limit 1) as team_id,
    (select id from public.profiles where account_status = 'active' order by created_at limit 1) as manager_id
)
insert into public.team_health_scores (
  team_id,
  manager_id,
  cycle,
  status,
  owner_role,
  next_action,
  name,
  metrics,
  score,
  band,
  contributions,
  visibility,
  calculated_at,
  created_by,
  updated_by
)
select
  team_id,
  manager_id,
  '1405-H1',
  'draft',
  'MANAGER',
  'calculate',
  'Team health score - 1405 H1',
  '{"evaluationCompletionRate":0.86,"averagePerformanceScore":3.9,"feedbackParticipationRate":0.72,"pipRiskRate":0.08,"overdueTaskRate":0.18}'::jsonb,
  80.2,
  'healthy',
  '{"evaluationCompletionRate":21.5,"averagePerformanceScore":19.5,"feedbackParticipationRate":14.4,"pipRiskInverse":13.8,"overdueTaskInverse":12.3}'::jsonb,
  '{"managerCanView":true,"hrbpCanView":true,"hrAdminCanView":true,"employeeCanView":false}'::jsonb,
  now(),
  manager_id,
  manager_id
from seed_team
where team_id is not null
  and manager_id is not null
on conflict (team_id, cycle) do nothing;
