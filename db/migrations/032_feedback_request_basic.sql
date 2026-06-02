create table if not exists public.feedback_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'extended', 'completed', 'closed')),
  owner_role text not null default 'REQUESTER'
    check (owner_role in ('REQUESTER', 'RECIPIENTS', 'SYSTEM')),
  next_action text,
  title text not null,
  question text not null,
  is_anonymous boolean not null default false,
  visibility jsonb not null default '{"requesterCanView":true,"subjectCanView":false,"hrbpCanView":true}'::jsonb,
  due_at timestamptz,
  extended_until timestamptz,
  response_count integer not null default 0 check (response_count >= 0),
  closed_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  submitted_at timestamptz,
  visibility_changed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback_request_recipients (
  id uuid primary key default gen_random_uuid(),
  feedback_request_id uuid not null references public.feedback_requests(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'responded', 'skipped')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (feedback_request_id, recipient_user_id)
);

create table if not exists public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  feedback_request_id uuid not null references public.feedback_requests(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete set null,
  response_text text not null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_requests_requester_status
  on public.feedback_requests(requester_user_id, status);

create index if not exists idx_feedback_recipients_user_status
  on public.feedback_request_recipients(recipient_user_id, status);

insert into public.permissions (code, description)
values
  ('feedback.read', 'Read feedback requests'),
  ('feedback.create', 'Create feedback requests'),
  ('feedback.update', 'Update draft/open feedback requests'),
  ('feedback.submit', 'Submit feedback requests and responses'),
  ('feedback.extend', 'Extend anonymous zero-response requests'),
  ('feedback.close', 'Close feedback requests'),
  ('feedback.override', 'Override feedback visibility')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'feedback.read'),
  ('EMPLOYEE', 'feedback.create'),
  ('EMPLOYEE', 'feedback.update'),
  ('EMPLOYEE', 'feedback.submit'),
  ('EMPLOYEE', 'feedback.close'),
  ('MANAGER', 'feedback.read'),
  ('MANAGER', 'feedback.create'),
  ('MANAGER', 'feedback.update'),
  ('MANAGER', 'feedback.submit'),
  ('MANAGER', 'feedback.extend'),
  ('MANAGER', 'feedback.close'),
  ('MANAGER', 'feedback.override'),
  ('NEXT_LEVEL_MANAGER', 'feedback.read'),
  ('NEXT_LEVEL_MANAGER', 'feedback.create'),
  ('NEXT_LEVEL_MANAGER', 'feedback.update'),
  ('NEXT_LEVEL_MANAGER', 'feedback.submit'),
  ('NEXT_LEVEL_MANAGER', 'feedback.extend'),
  ('NEXT_LEVEL_MANAGER', 'feedback.close'),
  ('HRBP', 'feedback.read'),
  ('HRBP', 'feedback.create'),
  ('HRBP', 'feedback.update'),
  ('HRBP', 'feedback.submit'),
  ('HRBP', 'feedback.extend'),
  ('HRBP', 'feedback.close'),
  ('HRBP', 'feedback.override'),
  ('HR_ADMIN', 'feedback.read'),
  ('HR_ADMIN', 'feedback.create'),
  ('HR_ADMIN', 'feedback.update'),
  ('HR_ADMIN', 'feedback.submit'),
  ('HR_ADMIN', 'feedback.extend'),
  ('HR_ADMIN', 'feedback.close'),
  ('HR_ADMIN', 'feedback.override')
on conflict do nothing;

alter table public.feedback_requests enable row level security;
alter table public.feedback_request_recipients enable row level security;
alter table public.feedback_responses enable row level security;

grant select, insert, update on public.feedback_requests to authenticated;
grant select, insert, update on public.feedback_request_recipients to authenticated;
grant select, insert on public.feedback_responses to authenticated;
grant all on public.feedback_requests to service_role;
grant all on public.feedback_request_recipients to service_role;
grant all on public.feedback_responses to service_role;

drop policy if exists "feedback requests are visible to participants" on public.feedback_requests;
create policy "feedback requests are visible to participants"
on public.feedback_requests for select
to authenticated
using (
  requester_user_id = (select auth.uid())
  or subject_user_id = (select auth.uid())
  or exists (
    select 1 from public.feedback_request_recipients r
    where r.feedback_request_id = feedback_requests.id
      and r.recipient_user_id = (select auth.uid())
  )
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "feedback requests can be created by requester" on public.feedback_requests;
create policy "feedback requests can be created by requester"
on public.feedback_requests for insert
to authenticated
with check (
  requester_user_id = (select auth.uid())
  and created_by = (select auth.uid())
);

drop policy if exists "feedback requests can be updated by owner or hr" on public.feedback_requests;
create policy "feedback requests can be updated by owner or hr"
on public.feedback_requests for update
to authenticated
using (
  requester_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
)
with check (
  requester_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "feedback recipients visible to participants" on public.feedback_request_recipients;
create policy "feedback recipients visible to participants"
on public.feedback_request_recipients for select
to authenticated
using (
  recipient_user_id = (select auth.uid())
  or exists (
    select 1 from public.feedback_requests f
    where f.id = feedback_request_recipients.feedback_request_id
      and f.requester_user_id = (select auth.uid())
  )
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "feedback recipients can be managed by requester" on public.feedback_request_recipients;
create policy "feedback recipients can be managed by requester"
on public.feedback_request_recipients for all
to authenticated
using (
  exists (
    select 1 from public.feedback_requests f
    where f.id = feedback_request_recipients.feedback_request_id
      and f.requester_user_id = (select auth.uid())
  )
  or recipient_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  exists (
    select 1 from public.feedback_requests f
    where f.id = feedback_request_recipients.feedback_request_id
      and f.requester_user_id = (select auth.uid())
  )
  or recipient_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "feedback responses visible to participants" on public.feedback_responses;
create policy "feedback responses visible to participants"
on public.feedback_responses for select
to authenticated
using (
  recipient_user_id = (select auth.uid())
  or exists (
    select 1 from public.feedback_requests f
    where f.id = feedback_responses.feedback_request_id
      and (
        f.requester_user_id = (select auth.uid())
        or f.subject_user_id = (select auth.uid())
      )
  )
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "feedback responses can be inserted by recipients" on public.feedback_responses;
create policy "feedback responses can be inserted by recipients"
on public.feedback_responses for insert
to authenticated
with check (
  recipient_user_id = (select auth.uid())
  and exists (
    select 1 from public.feedback_request_recipients r
    where r.feedback_request_id = feedback_responses.feedback_request_id
      and r.recipient_user_id = (select auth.uid())
  )
);

insert into public.feedback_requests (
  requester_user_id,
  subject_user_id,
  status,
  owner_role,
  next_action,
  title,
  question,
  is_anonymous,
  visibility,
  due_at,
  created_by,
  updated_by
)
select
  p.id,
  p.id,
  'draft',
  'REQUESTER',
  'submit_request',
  'Seed feedback request',
  'What should we continue, stop, and start?',
  true,
  '{"requesterCanView":true,"subjectCanView":false,"hrbpCanView":true,"seed":true}'::jsonb,
  now() + interval '14 days',
  p.id,
  p.id
from public.profiles p
where p.account_status = 'active'
order by p.created_at
limit 1
on conflict do nothing;
