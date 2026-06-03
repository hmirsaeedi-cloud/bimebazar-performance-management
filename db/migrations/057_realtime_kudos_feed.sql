create table if not exists public.kudos_feed_items (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_ids uuid[] not null default '{}'::uuid[],
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'published', 'returned', 'visibility_changed', 'archived')),
  owner_role text not null default 'AUTHOR'
    check (owner_role in ('AUTHOR', 'HRBP', 'FEED', 'SYSTEM')),
  next_action text,
  title text not null,
  message text not null,
  tags text[] not null default '{}'::text[],
  visibility jsonb not null default '{"feedCanView":true,"recipientCanView":true,"managerCanView":true,"hrbpCanView":true}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  archived_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_length(recipient_user_ids, 1) > 0)
);

create index if not exists idx_kudos_feed_items_status_updated
  on public.kudos_feed_items(status, updated_at desc);

create index if not exists idx_kudos_feed_items_recipients
  on public.kudos_feed_items using gin(recipient_user_ids);

create index if not exists idx_kudos_feed_items_tags
  on public.kudos_feed_items using gin(tags);

alter table public.kudos_feed_items replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.kudos_feed_items;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

insert into public.permissions (code, description)
values
  ('feedback.kudos.read', 'Read realtime feedback and kudos feed items'),
  ('feedback.kudos.create', 'Create realtime feedback and kudos feed items'),
  ('feedback.kudos.update', 'Update draft or returned kudos feed items'),
  ('feedback.kudos.submit', 'Submit kudos feed items for review'),
  ('feedback.kudos.approve', 'Approve kudos feed items'),
  ('feedback.kudos.return', 'Return kudos feed items for revision'),
  ('feedback.kudos.override', 'Override kudos feed item visibility'),
  ('feedback.kudos.publish', 'Publish kudos feed items to the realtime feed'),
  ('feedback.kudos.archive', 'Archive kudos feed items')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'feedback.kudos.read'),
  ('EMPLOYEE', 'feedback.kudos.create'),
  ('EMPLOYEE', 'feedback.kudos.update'),
  ('EMPLOYEE', 'feedback.kudos.submit'),
  ('MANAGER', 'feedback.kudos.read'),
  ('MANAGER', 'feedback.kudos.create'),
  ('MANAGER', 'feedback.kudos.update'),
  ('MANAGER', 'feedback.kudos.submit'),
  ('MANAGER', 'feedback.kudos.approve'),
  ('MANAGER', 'feedback.kudos.return'),
  ('MANAGER', 'feedback.kudos.publish'),
  ('HRBP', 'feedback.kudos.read'),
  ('HRBP', 'feedback.kudos.create'),
  ('HRBP', 'feedback.kudos.update'),
  ('HRBP', 'feedback.kudos.submit'),
  ('HRBP', 'feedback.kudos.approve'),
  ('HRBP', 'feedback.kudos.return'),
  ('HRBP', 'feedback.kudos.override'),
  ('HRBP', 'feedback.kudos.publish'),
  ('HRBP', 'feedback.kudos.archive'),
  ('HR_ADMIN', 'feedback.kudos.read'),
  ('HR_ADMIN', 'feedback.kudos.create'),
  ('HR_ADMIN', 'feedback.kudos.update'),
  ('HR_ADMIN', 'feedback.kudos.submit'),
  ('HR_ADMIN', 'feedback.kudos.approve'),
  ('HR_ADMIN', 'feedback.kudos.return'),
  ('HR_ADMIN', 'feedback.kudos.override'),
  ('HR_ADMIN', 'feedback.kudos.publish'),
  ('HR_ADMIN', 'feedback.kudos.archive')
on conflict do nothing;

alter table public.kudos_feed_items enable row level security;

grant select, insert, update on public.kudos_feed_items to authenticated;
grant all on public.kudos_feed_items to service_role;

drop policy if exists "kudos feed visible to feed participants and hr" on public.kudos_feed_items;
create policy "kudos feed visible to feed participants and hr"
on public.kudos_feed_items for select
to authenticated
using (
  author_user_id = (select auth.uid())
  or (select auth.uid()) = any(recipient_user_ids)
  or (
    status = 'published'
    and visibility->>'feedCanView' = 'true'
  )
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "kudos feed can be created by author" on public.kudos_feed_items;
create policy "kudos feed can be created by author"
on public.kudos_feed_items for insert
to authenticated
with check (
  author_user_id = (select auth.uid())
  and created_by = (select auth.uid())
);

drop policy if exists "kudos feed can be updated by author or hr" on public.kudos_feed_items;
create policy "kudos feed can be updated by author or hr"
on public.kudos_feed_items for update
to authenticated
using (
  author_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
)
with check (
  author_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

with active_people as (
  select array_agg(id order by created_at asc) as ids
  from public.profiles
  where account_status = 'active'
)
insert into public.kudos_feed_items (
  author_user_id,
  recipient_user_ids,
  status,
  owner_role,
  next_action,
  title,
  message,
  tags,
  visibility,
  created_by,
  updated_by
)
select
  ids[1],
  array[ids[2]],
  'draft',
  'AUTHOR',
  'submit',
  'Customer-first kudos',
  'Thank you for turning a difficult customer moment into a calm, helpful experience.',
  array['customer', 'teamwork'],
  '{"feedCanView":true,"recipientCanView":true,"managerCanView":true,"hrbpCanView":true}'::jsonb,
  ids[1],
  ids[1]
from active_people
where array_length(ids, 1) >= 2
  and not exists (select 1 from public.kudos_feed_items where title = 'Customer-first kudos');
