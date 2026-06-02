create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'unread'
    check (status in ('unread', 'read', 'archived')),
  owner_role text not null default 'RECIPIENT'
    check (owner_role in ('RECIPIENT', 'SYSTEM')),
  next_action text,
  channel text not null default 'in_app'
    check (channel in ('in_app', 'email', 'sms')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),
  title text not null,
  body text not null,
  entity_type text,
  entity_id text,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient_status
  on public.notifications(recipient_user_id, status);

create index if not exists idx_notifications_entity
  on public.notifications(entity_type, entity_id);

create index if not exists idx_notifications_created_at
  on public.notifications(created_at desc);

insert into public.permissions (code, description)
values
  ('notifications.read', 'Read own in-app notifications'),
  ('notifications.create', 'Create in-app notifications'),
  ('notifications.update', 'Update notification delivery details'),
  ('notifications.mark_read', 'Mark notifications as read'),
  ('notifications.archive', 'Archive notifications')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'notifications.read'),
  ('EMPLOYEE', 'notifications.mark_read'),
  ('EMPLOYEE', 'notifications.archive'),
  ('MANAGER', 'notifications.read'),
  ('MANAGER', 'notifications.mark_read'),
  ('MANAGER', 'notifications.archive'),
  ('NEXT_LEVEL_MANAGER', 'notifications.read'),
  ('NEXT_LEVEL_MANAGER', 'notifications.mark_read'),
  ('NEXT_LEVEL_MANAGER', 'notifications.archive'),
  ('HRBP', 'notifications.read'),
  ('HRBP', 'notifications.create'),
  ('HRBP', 'notifications.mark_read'),
  ('HRBP', 'notifications.archive'),
  ('HR_ADMIN', 'notifications.read'),
  ('HR_ADMIN', 'notifications.create'),
  ('HR_ADMIN', 'notifications.update'),
  ('HR_ADMIN', 'notifications.mark_read'),
  ('HR_ADMIN', 'notifications.archive')
on conflict do nothing;

alter table public.notifications enable row level security;

grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

drop policy if exists "users can read own notifications" on public.notifications;
create policy "users can read own notifications"
on public.notifications for select
to authenticated
using (
  recipient_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "authorized users can create notifications" on public.notifications;
create policy "authorized users can create notifications"
on public.notifications for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    recipient_user_id = (select auth.uid())
    or (select app_private.current_user_has_role('HR_ADMIN'))
    or (select app_private.current_user_has_role('HRBP'))
  )
);

drop policy if exists "users can update own notification states" on public.notifications;
create policy "users can update own notification states"
on public.notifications for update
to authenticated
using (
  recipient_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  recipient_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

insert into public.notifications (
  recipient_user_id,
  status,
  owner_role,
  next_action,
  priority,
  title,
  body,
  entity_type,
  entity_id,
  metadata,
  created_by,
  updated_by
)
select
  p.id,
  'unread',
  'RECIPIENT',
  'mark_read',
  'normal',
  'Welcome to BimeBazar Performance',
  'Your in-app notification inbox is ready.',
  'notification_system',
  'notifications',
  '{"owner":"RECIPIENT","nextAction":"mark_read","seed":true}'::jsonb,
  p.id,
  p.id
from public.profiles p
where p.account_status = 'active'
order by p.created_at
limit 1
on conflict do nothing;
