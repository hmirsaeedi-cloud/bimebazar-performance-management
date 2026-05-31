alter table public.mpas
add column if not exists content_format text not null default 'structured'
  check (content_format in ('structured', 'rich_text')),
add column if not exists content_plain_text text;

create table if not exists public.mpa_content_revisions (
  id uuid primary key default gen_random_uuid(),
  mpa_id uuid not null references public.mpas(id) on delete cascade,
  revision_number integer not null,
  content jsonb not null,
  content_format text not null default 'rich_text'
    check (content_format in ('structured', 'rich_text')),
  content_plain_text text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (mpa_id, revision_number)
);

create index if not exists idx_mpa_content_revisions_mpa
  on public.mpa_content_revisions(mpa_id);

alter table public.mpa_content_revisions enable row level security;

grant select on public.mpa_content_revisions to authenticated;
grant insert on public.mpa_content_revisions to authenticated;
grant all on public.mpa_content_revisions to service_role;

drop policy if exists "authorized users can read mpa content revisions" on public.mpa_content_revisions;
create policy "authorized users can read mpa content revisions"
on public.mpa_content_revisions for select
to authenticated
using (
  exists (
    select 1
    from public.mpas m
    where m.id = mpa_content_revisions.mpa_id
      and (
        m.employee_id = (select auth.uid())
        or m.manager_id = (select auth.uid())
        or m.hrbp_id = (select auth.uid())
        or (select app_private.current_user_has_role('HR_ADMIN'))
      )
  )
);

drop policy if exists "authorized users can write mpa content revisions" on public.mpa_content_revisions;
create policy "authorized users can write mpa content revisions"
on public.mpa_content_revisions for insert
to authenticated
with check (
  exists (
    select 1
    from public.mpas m
    where m.id = mpa_content_revisions.mpa_id
      and (
        m.manager_id = (select auth.uid())
        or (select app_private.current_user_has_role('HR_ADMIN'))
      )
  )
);
