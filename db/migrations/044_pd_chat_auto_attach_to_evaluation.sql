create table if not exists public.pd_chat_evaluation_attachments (
  id uuid primary key default gen_random_uuid(),
  pd_chat_log_id uuid references public.pd_chat_logs(id) on delete set null,
  process_id uuid references public.performance_processes(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  evaluation_type text not null
    check (evaluation_type in ('end_cycle_evaluation', 'mid_cycle_evaluation', 'downward_evaluation')),
  evaluation_id uuid not null,
  status text not null default 'attached'
    check (status in ('matched', 'attached', 'missing_chat', 'detached')),
  owner_role text not null default 'SYSTEM'
    check (owner_role in ('SYSTEM', 'MANAGER', 'HRBP', 'HR_ADMIN')),
  next_action text,
  match_strategy text not null default 'employee_process_latest_visible',
  attached_by uuid references auth.users(id),
  attached_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evaluation_type, evaluation_id)
);

alter table public.pd_chat_logs
add column if not exists attached_evaluation_type text
  check (attached_evaluation_type is null or attached_evaluation_type in ('end_cycle_evaluation', 'mid_cycle_evaluation', 'downward_evaluation')),
add column if not exists attached_evaluation_id uuid,
add column if not exists attached_at timestamptz;

alter table public.end_cycle_evaluations
add column if not exists attached_pd_chat_id uuid references public.pd_chat_logs(id) on delete set null;

alter table public.mid_cycle_evaluations
add column if not exists attached_pd_chat_id uuid references public.pd_chat_logs(id) on delete set null;

alter table public.process_downward_evaluations
add column if not exists attached_pd_chat_id uuid references public.pd_chat_logs(id) on delete set null;

create index if not exists idx_pd_chat_eval_attachments_chat on public.pd_chat_evaluation_attachments(pd_chat_log_id);
create index if not exists idx_pd_chat_eval_attachments_process on public.pd_chat_evaluation_attachments(process_id);
create index if not exists idx_pd_chat_eval_attachments_employee on public.pd_chat_evaluation_attachments(employee_id);
create index if not exists idx_pd_chat_eval_attachments_manager on public.pd_chat_evaluation_attachments(manager_id);
create index if not exists idx_pd_chat_eval_attachments_eval on public.pd_chat_evaluation_attachments(evaluation_type, evaluation_id);
create index if not exists idx_pd_chat_logs_attached_eval on public.pd_chat_logs(attached_evaluation_type, attached_evaluation_id);
create index if not exists idx_end_cycle_evaluations_attached_pd_chat on public.end_cycle_evaluations(attached_pd_chat_id);
create index if not exists idx_mid_cycle_evaluations_attached_pd_chat on public.mid_cycle_evaluations(attached_pd_chat_id);
create index if not exists idx_process_downward_evaluations_attached_pd_chat on public.process_downward_evaluations(attached_pd_chat_id);

insert into public.permissions (code, description)
values
  ('pd_chat.attach', 'Auto-attach or override PD Chat links to evaluations')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('MANAGER', 'pd_chat.attach'),
  ('HRBP', 'pd_chat.attach'),
  ('HR_ADMIN', 'pd_chat.attach')
on conflict do nothing;

alter table public.pd_chat_evaluation_attachments enable row level security;

grant select on public.pd_chat_evaluation_attachments to authenticated;
grant insert, update on public.pd_chat_evaluation_attachments to authenticated;
grant all on public.pd_chat_evaluation_attachments to service_role;

drop policy if exists "authorized users can read pd chat evaluation attachments" on public.pd_chat_evaluation_attachments;
create policy "authorized users can read pd chat evaluation attachments"
on public.pd_chat_evaluation_attachments for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "authorized users can write pd chat evaluation attachments" on public.pd_chat_evaluation_attachments;
create policy "authorized users can write pd chat evaluation attachments"
on public.pd_chat_evaluation_attachments for all
to authenticated
using (
  (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

insert into public.pd_chat_evaluation_attachments (
  pd_chat_log_id,
  process_id,
  employee_id,
  manager_id,
  evaluation_type,
  evaluation_id,
  status,
  owner_role,
  next_action,
  match_strategy,
  attached_at,
  metadata
)
select
  c.id,
  c.process_id,
  c.employee_id,
  c.manager_id,
  'end_cycle_evaluation',
  e.id,
  'attached',
  'SYSTEM',
  null,
  'seed_employee_process_latest_visible',
  now(),
  jsonb_build_object('source', 'seed', 'chatStatus', c.status)
from public.pd_chat_logs c
join public.end_cycle_evaluations e
  on e.employee_id = c.employee_id
 and (e.process_id = c.process_id or c.process_id is null)
where c.status <> 'archived'
order by c.updated_at desc
limit 1
on conflict (evaluation_type, evaluation_id) do nothing;
