create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'defaulted'
    check (status in ('defaulted', 'customized', 'submitted', 'approved', 'returned', 'overridden')),
  owner_role text not null default 'USER'
    check (owner_role in ('USER', 'HRBP', 'HR_ADMIN', 'SYSTEM')),
  next_action text,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  digest_frequency text not null default 'immediate'
    check (digest_frequency in ('immediate', 'daily', 'weekly', 'off')),
  quiet_hours jsonb not null default '{"enabled":true,"start":"18:00","end":"09:00","timezone":"Asia/Tehran"}'::jsonb,
  visibility jsonb not null default '{"managerCanView":false,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  returned_at timestamptz,
  overridden_at timestamptz,
  visibility_changed_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_user_unique unique (user_id)
);

create index if not exists idx_notification_preferences_user_status
  on public.notification_preferences(user_id, status);

create index if not exists idx_notification_preferences_updated_at
  on public.notification_preferences(updated_at desc);

insert into public.permissions (code, description)
values
  ('notifications.preferences.read', 'Read notification preference settings'),
  ('notifications.preferences.update', 'Update own notification preference settings'),
  ('notifications.preferences.submit', 'Submit notification preference settings for approval'),
  ('notifications.preferences.approve', 'Approve notification preference settings'),
  ('notifications.preferences.return', 'Return notification preference settings for revision'),
  ('notifications.preferences.override', 'Override notification preference settings and visibility')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'notifications.preferences.read'),
  ('EMPLOYEE', 'notifications.preferences.update'),
  ('EMPLOYEE', 'notifications.preferences.submit'),
  ('MANAGER', 'notifications.preferences.read'),
  ('MANAGER', 'notifications.preferences.update'),
  ('MANAGER', 'notifications.preferences.submit'),
  ('NEXT_LEVEL_MANAGER', 'notifications.preferences.read'),
  ('NEXT_LEVEL_MANAGER', 'notifications.preferences.update'),
  ('NEXT_LEVEL_MANAGER', 'notifications.preferences.submit'),
  ('HRBP', 'notifications.preferences.read'),
  ('HRBP', 'notifications.preferences.update'),
  ('HRBP', 'notifications.preferences.submit'),
  ('HRBP', 'notifications.preferences.approve'),
  ('HRBP', 'notifications.preferences.return'),
  ('HRBP', 'notifications.preferences.override'),
  ('HR_ADMIN', 'notifications.preferences.read'),
  ('HR_ADMIN', 'notifications.preferences.update'),
  ('HR_ADMIN', 'notifications.preferences.submit'),
  ('HR_ADMIN', 'notifications.preferences.approve'),
  ('HR_ADMIN', 'notifications.preferences.return'),
  ('HR_ADMIN', 'notifications.preferences.override')
on conflict do nothing;

alter table public.notification_preferences enable row level security;

grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;

drop policy if exists "users can read visible notification preferences" on public.notification_preferences;
create policy "users can read visible notification preferences"
on public.notification_preferences for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or ((visibility ->> 'hrbpCanView')::boolean is true and (select app_private.current_user_has_role('HRBP')))
);

drop policy if exists "users can create own notification preferences" on public.notification_preferences;
create policy "users can create own notification preferences"
on public.notification_preferences for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and created_by = (select auth.uid())
);

drop policy if exists "users and authorized reviewers can update notification preferences" on public.notification_preferences;
create policy "users and authorized reviewers can update notification preferences"
on public.notification_preferences for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
)
with check (
  user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

insert into public.notification_preferences (
  user_id,
  status,
  owner_role,
  next_action,
  metadata,
  created_by,
  updated_by
)
select
  p.id,
  'defaulted',
  'USER',
  'update',
  '{"owner":"USER","nextAction":"update","seed":true}'::jsonb,
  p.id,
  p.id
from public.profiles p
where p.account_status = 'active'
on conflict (user_id) do nothing;
