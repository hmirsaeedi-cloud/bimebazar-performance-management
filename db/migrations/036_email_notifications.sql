create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  to_email text not null,
  cc_emails text[] not null default '{}'::text[],
  bcc_emails text[] not null default '{}'::text[],
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'queued', 'sent', 'failed', 'returned', 'cancelled')),
  owner_role text not null default 'HR_ADMIN'
    check (owner_role in ('HR_ADMIN', 'HRBP', 'SYSTEM', 'RECIPIENT')),
  next_action text,
  recipient_visible boolean not null default false,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),
  template_key text,
  subject text not null,
  body_text text not null,
  body_html text not null,
  provider text,
  provider_message_id text,
  entity_type text,
  entity_id text,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  queued_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  returned_at timestamptz,
  cancelled_at timestamptz,
  visibility_changed_at timestamptz,
  last_error text,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_notifications_recipient_status
  on public.email_notifications(recipient_user_id, status);

create index if not exists idx_email_notifications_entity
  on public.email_notifications(entity_type, entity_id);

create index if not exists idx_email_notifications_queue
  on public.email_notifications(status, priority, created_at)
  where status in ('approved', 'queued', 'failed');

insert into public.permissions (code, description)
values
  ('notifications.email.read', 'Read email notification queue items'),
  ('notifications.email.create', 'Create email notification drafts'),
  ('notifications.email.update', 'Update email notification drafts'),
  ('notifications.email.submit', 'Submit email notifications for review'),
  ('notifications.email.approve', 'Approve email notifications'),
  ('notifications.email.return', 'Return email notifications for revision'),
  ('notifications.email.override', 'Override email notification visibility'),
  ('notifications.email.send', 'Queue and mark email notifications as sent'),
  ('notifications.email.cancel', 'Cancel email notifications')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'notifications.email.read'),
  ('MANAGER', 'notifications.email.read'),
  ('NEXT_LEVEL_MANAGER', 'notifications.email.read'),
  ('HRBP', 'notifications.email.read'),
  ('HRBP', 'notifications.email.create'),
  ('HRBP', 'notifications.email.update'),
  ('HRBP', 'notifications.email.submit'),
  ('HRBP', 'notifications.email.approve'),
  ('HRBP', 'notifications.email.return'),
  ('HRBP', 'notifications.email.override'),
  ('HRBP', 'notifications.email.send'),
  ('HRBP', 'notifications.email.cancel'),
  ('HR_ADMIN', 'notifications.email.read'),
  ('HR_ADMIN', 'notifications.email.create'),
  ('HR_ADMIN', 'notifications.email.update'),
  ('HR_ADMIN', 'notifications.email.submit'),
  ('HR_ADMIN', 'notifications.email.approve'),
  ('HR_ADMIN', 'notifications.email.return'),
  ('HR_ADMIN', 'notifications.email.override'),
  ('HR_ADMIN', 'notifications.email.send'),
  ('HR_ADMIN', 'notifications.email.cancel')
on conflict do nothing;

alter table public.email_notifications enable row level security;

grant select, insert, update on public.email_notifications to authenticated;
grant all on public.email_notifications to service_role;

drop policy if exists "email notifications visible to recipient after sent" on public.email_notifications;
create policy "email notifications visible to recipient after sent"
on public.email_notifications for select
to authenticated
using (
  (recipient_visible is true and recipient_user_id = (select auth.uid()))
  or actor_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "email notifications can be created by notification owners" on public.email_notifications;
create policy "email notifications can be created by notification owners"
on public.email_notifications for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and recipient_visible is false
  and (
    (select app_private.current_user_has_role('HR_ADMIN'))
    or (select app_private.current_user_has_role('HRBP'))
  )
);

drop policy if exists "email notifications can be updated by notification owners" on public.email_notifications;
create policy "email notifications can be updated by notification owners"
on public.email_notifications for update
to authenticated
using (
  actor_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
)
with check (
  actor_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

insert into public.email_notifications (
  recipient_user_id,
  actor_user_id,
  to_email,
  status,
  owner_role,
  next_action,
  recipient_visible,
  priority,
  template_key,
  subject,
  body_text,
  body_html,
  entity_type,
  entity_id,
  action_url,
  metadata,
  created_by,
  updated_by
)
select
  p.id,
  p.id,
  p.email,
  'draft',
  'HR_ADMIN',
  'submit',
  false,
  'normal',
  'performance_task_assigned',
  'Performance task assigned',
  'Please review your assigned performance task in BimeBazar Performance Management.',
  '<p>Please review your assigned performance task in BimeBazar Performance Management.</p>',
  'notification_system',
  'email_notifications',
  '/temp-email-notifications.html',
  '{"owner":"HR_ADMIN","nextAction":"submit","seed":true}'::jsonb,
  p.id,
  p.id
from public.profiles p
where p.account_status = 'active'
order by p.created_at
limit 1
on conflict do nothing;
