create table if not exists public.performance_processes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  process_type text not null
    check (process_type in ('self_assessment', 'downward_evaluation', 'upward_feedback', 'survey', 'end_cycle', 'mid_cycle')),
  status text not null default 'draft'
    check (status in ('draft', 'configured', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  owner_role text not null default 'HR_ADMIN'
    check (owner_role in ('HR_ADMIN', 'HRBP', 'SYSTEM')),
  next_action text,
  config jsonb not null default '{}'::jsonb,
  eligibility_filter jsonb not null default '{}'::jsonb,
  form_template_id uuid references public.form_templates(id) on delete set null,
  form_template_version_id uuid references public.form_template_versions(id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint performance_processes_valid_window check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.process_participants (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.performance_processes(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  status text not null default 'eligible'
    check (status in ('eligible', 'assigned', 'in_progress', 'completed', 'excluded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, employee_id)
);

create index if not exists idx_performance_processes_status on public.performance_processes(status);
create index if not exists idx_performance_processes_type on public.performance_processes(process_type);
create index if not exists idx_performance_processes_form_version on public.performance_processes(form_template_version_id);
create index if not exists idx_process_participants_process on public.process_participants(process_id);
create index if not exists idx_process_participants_employee on public.process_participants(employee_id);
create index if not exists idx_process_participants_manager on public.process_participants(manager_id);

insert into public.permissions (code, description)
values
  ('process.read', 'Read performance processes'),
  ('process.create', 'Create performance processes'),
  ('process.update', 'Update process configuration'),
  ('process.configure', 'Validate and lock process configuration'),
  ('process.start', 'Start scheduled or configured processes'),
  ('process.pause', 'Pause active processes'),
  ('process.complete', 'Complete active processes'),
  ('process.cancel', 'Cancel processes')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HR_ADMIN', 'process.read'),
  ('HR_ADMIN', 'process.create'),
  ('HR_ADMIN', 'process.update'),
  ('HR_ADMIN', 'process.configure'),
  ('HR_ADMIN', 'process.start'),
  ('HR_ADMIN', 'process.pause'),
  ('HR_ADMIN', 'process.complete'),
  ('HR_ADMIN', 'process.cancel'),
  ('HRBP', 'process.read'),
  ('HRBP', 'process.start'),
  ('HRBP', 'process.pause'),
  ('HRBP', 'process.complete'),
  ('MANAGER', 'process.read'),
  ('EMPLOYEE', 'process.read')
on conflict do nothing;

alter table public.performance_processes enable row level security;
alter table public.process_participants enable row level security;

grant select on public.performance_processes to authenticated;
grant insert, update on public.performance_processes to authenticated;
grant select on public.process_participants to authenticated;
grant insert, update on public.process_participants to authenticated;
grant all on public.performance_processes to service_role;
grant all on public.process_participants to service_role;

drop policy if exists "authorized users can read processes" on public.performance_processes;
create policy "authorized users can read processes"
on public.performance_processes for select
to authenticated
using (
  (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
  or exists (
    select 1
    from public.process_participants pp
    where pp.process_id = performance_processes.id
      and (pp.employee_id = (select auth.uid()) or pp.manager_id = (select auth.uid()))
  )
);

drop policy if exists "hr admin can write processes" on public.performance_processes;
create policy "hr admin can write processes"
on public.performance_processes for all
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')))
with check ((select app_private.current_user_has_role('HR_ADMIN')));

drop policy if exists "authorized users can read process participants" on public.process_participants;
create policy "authorized users can read process participants"
on public.process_participants for select
to authenticated
using (
  employee_id = (select auth.uid())
  or manager_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "hr admin can write process participants" on public.process_participants;
create policy "hr admin can write process participants"
on public.process_participants for all
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')))
with check ((select app_private.current_user_has_role('HR_ADMIN')));
