alter table public.end_cycle_evaluations
add column if not exists score_engine_version text not null default 'weighted-v1',
add column if not exists score_calculated_at timestamptz;

create table if not exists public.evaluation_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.end_cycle_evaluations(id) on delete cascade,
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

create index if not exists idx_evaluation_score_snapshots_evaluation
  on public.evaluation_score_snapshots(evaluation_id);

alter table public.evaluation_score_snapshots enable row level security;

grant select on public.evaluation_score_snapshots to authenticated;
grant insert on public.evaluation_score_snapshots to authenticated;
grant all on public.evaluation_score_snapshots to service_role;

drop policy if exists "authorized users can read evaluation score snapshots" on public.evaluation_score_snapshots;
create policy "authorized users can read evaluation score snapshots"
on public.evaluation_score_snapshots for select
to authenticated
using (
  exists (
    select 1
    from public.end_cycle_evaluations e
    where e.id = evaluation_score_snapshots.evaluation_id
      and (
        e.employee_id = (select auth.uid())
        or e.manager_id = (select auth.uid())
        or e.hrbp_id = (select auth.uid())
        or (select app_private.current_user_has_role('HR_ADMIN'))
        or (select app_private.current_user_has_role('HRBP'))
      )
  )
);

drop policy if exists "authorized users can write evaluation score snapshots" on public.evaluation_score_snapshots;
create policy "authorized users can write evaluation score snapshots"
on public.evaluation_score_snapshots for insert
to authenticated
with check (
  exists (
    select 1
    from public.end_cycle_evaluations e
    where e.id = evaluation_score_snapshots.evaluation_id
      and (
        e.manager_id = (select auth.uid())
        or e.hrbp_id = (select auth.uid())
        or (select app_private.current_user_has_role('HR_ADMIN'))
      )
  )
);
