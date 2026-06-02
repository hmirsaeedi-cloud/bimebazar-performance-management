create table if not exists public.mpa_history_versions (
  id uuid primary key default gen_random_uuid(),
  mpa_id uuid not null references public.mpas(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  cycle_id uuid not null references public.mpa_cycles(id) on delete cascade,
  version_number integer not null,
  status text not null default 'captured'
    check (status in ('captured', 'reviewed', 'restored', 'returned', 'archived')),
  owner_role text not null default 'HRBP'
    check (owner_role in ('MANAGER', 'HRBP', 'SYSTEM')),
  next_action text,
  source_mpa_status text not null,
  title text not null,
  content jsonb not null,
  content_format text not null default 'structured'
    check (content_format in ('structured', 'rich_text')),
  content_plain_text text,
  approval_visibility jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  comparison_summary jsonb not null default '{}'::jsonb,
  restored_at timestamptz,
  reviewed_at timestamptz,
  returned_at timestamptz,
  archived_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mpa_id, version_number)
);

create index if not exists idx_mpa_history_versions_mpa
  on public.mpa_history_versions(mpa_id, version_number desc);

create index if not exists idx_mpa_history_versions_employee_cycle
  on public.mpa_history_versions(employee_id, cycle_id);

insert into public.permissions (code, description)
values
  ('mpa.history_read', 'Read MPA history and versions'),
  ('mpa.history_write', 'Capture and update MPA history versions'),
  ('mpa.history_restore', 'Restore reviewed MPA history versions')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'mpa.history_read'),
  ('MANAGER', 'mpa.history_read'),
  ('MANAGER', 'mpa.history_write'),
  ('MANAGER', 'mpa.history_restore'),
  ('HRBP', 'mpa.history_read'),
  ('HRBP', 'mpa.history_write'),
  ('HRBP', 'mpa.history_restore'),
  ('HR_ADMIN', 'mpa.history_read'),
  ('HR_ADMIN', 'mpa.history_write'),
  ('HR_ADMIN', 'mpa.history_restore')
on conflict do nothing;

alter table public.mpa_history_versions enable row level security;

grant select, insert, update on public.mpa_history_versions to authenticated;
grant all on public.mpa_history_versions to service_role;

drop policy if exists "authorized users can read mpa history versions" on public.mpa_history_versions;
create policy "authorized users can read mpa history versions"
on public.mpa_history_versions for select
to authenticated
using (
  exists (
    select 1
    from public.mpas m
    where m.id = mpa_history_versions.mpa_id
      and (
        m.employee_id = (select auth.uid())
        or m.manager_id = (select auth.uid())
        or m.hrbp_id = (select auth.uid())
        or (select app_private.current_user_has_role('HR_ADMIN'))
        or (select app_private.current_user_has_role('HRBP'))
      )
  )
);

drop policy if exists "authorized users can write mpa history versions" on public.mpa_history_versions;
create policy "authorized users can write mpa history versions"
on public.mpa_history_versions for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.mpas m
    where m.id = mpa_history_versions.mpa_id
      and (
        m.manager_id = (select auth.uid())
        or m.hrbp_id = (select auth.uid())
        or (select app_private.current_user_has_role('HR_ADMIN'))
        or (select app_private.current_user_has_role('HRBP'))
      )
  )
);

drop policy if exists "authorized users can update mpa history versions" on public.mpa_history_versions;
create policy "authorized users can update mpa history versions"
on public.mpa_history_versions for update
to authenticated
using (
  exists (
    select 1
    from public.mpas m
    where m.id = mpa_history_versions.mpa_id
      and (
        m.manager_id = (select auth.uid())
        or m.hrbp_id = (select auth.uid())
        or (select app_private.current_user_has_role('HR_ADMIN'))
        or (select app_private.current_user_has_role('HRBP'))
      )
  )
)
with check (
  exists (
    select 1
    from public.mpas m
    where m.id = mpa_history_versions.mpa_id
      and (
        m.manager_id = (select auth.uid())
        or m.hrbp_id = (select auth.uid())
        or (select app_private.current_user_has_role('HR_ADMIN'))
        or (select app_private.current_user_has_role('HRBP'))
      )
  )
);

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
from public.mpas m
order by m.created_at
limit 1
on conflict do nothing;
