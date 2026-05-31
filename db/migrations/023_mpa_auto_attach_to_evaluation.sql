create table if not exists public.mpa_evaluation_attachments (
  id uuid primary key default gen_random_uuid(),
  mpa_id uuid references public.mpas(id) on delete set null,
  process_id uuid references public.performance_processes(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  cycle_id uuid references public.mpa_cycles(id) on delete set null,
  evaluation_type text not null
    check (evaluation_type in ('downward_evaluation', 'self_assessment')),
  evaluation_id uuid not null,
  status text not null default 'attached'
    check (status in ('matched', 'attached', 'missing_mpa', 'detached')),
  owner_role text not null default 'SYSTEM'
    check (owner_role in ('SYSTEM', 'MANAGER', 'HRBP', 'HR_ADMIN')),
  next_action text,
  match_strategy text not null default 'employee_cycle_non_archived',
  attached_by uuid references auth.users(id),
  attached_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evaluation_type, evaluation_id)
);

alter table public.process_downward_evaluations
add column if not exists attached_mpa_id uuid references public.mpas(id) on delete set null;

alter table public.process_self_assessments
add column if not exists attached_mpa_id uuid references public.mpas(id) on delete set null;

create index if not exists idx_mpa_evaluation_attachments_mpa on public.mpa_evaluation_attachments(mpa_id);
create index if not exists idx_mpa_evaluation_attachments_process on public.mpa_evaluation_attachments(process_id);
create index if not exists idx_mpa_evaluation_attachments_employee on public.mpa_evaluation_attachments(employee_id);
create index if not exists idx_mpa_evaluation_attachments_evaluation on public.mpa_evaluation_attachments(evaluation_type, evaluation_id);
create index if not exists idx_process_downward_evaluations_attached_mpa on public.process_downward_evaluations(attached_mpa_id);
create index if not exists idx_process_self_assessments_attached_mpa on public.process_self_assessments(attached_mpa_id);

insert into public.permissions (code, description)
values
  ('mpa.attach', 'Auto-attach or override MPA links to evaluations')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('MANAGER', 'mpa.attach'),
  ('HRBP', 'mpa.attach'),
  ('HR_ADMIN', 'mpa.attach')
on conflict do nothing;

alter table public.mpa_evaluation_attachments enable row level security;

grant select on public.mpa_evaluation_attachments to authenticated;
grant insert, update on public.mpa_evaluation_attachments to authenticated;
grant all on public.mpa_evaluation_attachments to service_role;

drop policy if exists "authorized users can read mpa evaluation attachments" on public.mpa_evaluation_attachments;
create policy "authorized users can read mpa evaluation attachments"
on public.mpa_evaluation_attachments for select
to authenticated
using (
  employee_id = (select auth.uid())
  or (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "authorized users can write mpa evaluation attachments" on public.mpa_evaluation_attachments;
create policy "authorized users can write mpa evaluation attachments"
on public.mpa_evaluation_attachments for all
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
