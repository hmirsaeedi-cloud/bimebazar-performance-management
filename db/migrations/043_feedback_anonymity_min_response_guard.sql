alter table public.feedback_requests
add column if not exists min_response_count integer not null default 3 check (min_response_count >= 1),
add column if not exists anonymity_status text not null default 'not_anonymous'
  check (anonymity_status in ('not_anonymous', 'collecting', 'guarded', 'releasable', 'released', 'closed_zero')),
add column if not exists anonymity_checked_at timestamptz,
add column if not exists responses_released_at timestamptz,
add column if not exists min_response_guard_reason text;

alter table public.feedback_responses
add column if not exists released_at timestamptz,
add column if not exists anonymity_release_batch_id uuid;

grant update on public.feedback_responses to authenticated;

update public.feedback_requests
set min_response_count = case when is_anonymous then greatest(min_response_count, 3) else 1 end,
    anonymity_status = case
      when not is_anonymous then 'not_anonymous'
      when status = 'closed' and response_count = 0 then 'closed_zero'
      when responses_released_at is not null then 'released'
      when response_count = 0 then 'collecting'
      when response_count < greatest(min_response_count, 3) then 'guarded'
      else 'releasable'
    end,
    min_response_guard_reason = case
      when not is_anonymous then 'Named feedback does not require an anonymity threshold.'
      when status = 'closed' and response_count = 0 then 'Anonymous zero-response request closed without revealing responses.'
      when response_count = 0 then 'Anonymous request has zero responses and can be extended or closed.'
      when response_count < greatest(min_response_count, 3) then 'Anonymous responses are hidden until the minimum response count is met.'
      else 'Minimum anonymous response threshold has been met.'
    end,
    anonymity_checked_at = now()
where anonymity_checked_at is null;

insert into public.permissions (code, description) values
  ('feedback.anonymity_review', 'Review feedback anonymity guard state'),
  ('feedback.anonymity_release', 'Release anonymous feedback responses after minimum response count is met')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code) values
  ('MANAGER', 'feedback.anonymity_review'),
  ('HRBP', 'feedback.anonymity_review'),
  ('HRBP', 'feedback.anonymity_release'),
  ('HR_ADMIN', 'feedback.anonymity_review'),
  ('HR_ADMIN', 'feedback.anonymity_release')
on conflict do nothing;

drop policy if exists "feedback responses visible to participants" on public.feedback_responses;
create policy "feedback responses visible to participants"
on public.feedback_responses for select
to authenticated
using (
  recipient_user_id = (select auth.uid())
  or (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
  or exists (
    select 1
    from public.feedback_requests f
    where f.id = feedback_responses.feedback_request_id
      and (
        f.requester_user_id = (select auth.uid())
        or f.subject_user_id = (select auth.uid())
      )
      and (
        f.is_anonymous = false
        or f.anonymity_status = 'released'
        or f.responses_released_at is not null
        or f.response_count >= f.min_response_count
      )
  )
);

drop policy if exists "feedback responses can be released by hr or requester" on public.feedback_responses;
create policy "feedback responses can be released by hr or requester"
on public.feedback_responses for update
to authenticated
using (
  (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
  or exists (
    select 1
    from public.feedback_requests f
    where f.id = feedback_responses.feedback_request_id
      and f.requester_user_id = (select auth.uid())
      and (
        f.is_anonymous = false
        or f.response_count >= f.min_response_count
      )
  )
)
with check (
  (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
  or exists (
    select 1
    from public.feedback_requests f
    where f.id = feedback_responses.feedback_request_id
      and f.requester_user_id = (select auth.uid())
      and (
        f.is_anonymous = false
        or f.response_count >= f.min_response_count
      )
  )
);

with active_people as (
  select array_agg(id order by created_at asc) as ids
  from public.profiles
  where account_status = 'active'
),
seed_request as (
  insert into public.feedback_requests (
    requester_user_id,
    subject_user_id,
    status,
    owner_role,
    next_action,
    title,
    question,
    is_anonymous,
    min_response_count,
    anonymity_status,
    min_response_guard_reason,
    visibility,
    due_at,
    created_by,
    updated_by,
    submitted_at,
    anonymity_checked_at
  )
  select
    ids[1],
    ids[1],
    'open',
    'RECIPIENTS',
    'submit_response',
    'Seed anonymous guarded feedback',
    'What should this colleague continue, stop, and start?',
    true,
    3,
    'collecting',
    'Anonymous request has zero responses and can be extended or closed.',
    '{"requesterCanView":true,"subjectCanView":false,"hrbpCanView":true,"anonymityGuard":true}'::jsonb,
    now() + interval '7 days',
    ids[1],
    ids[1],
    now(),
    now()
  from active_people
  where array_length(ids, 1) >= 2
    and not exists (
      select 1 from public.feedback_requests where title = 'Seed anonymous guarded feedback'
    )
  returning id
)
insert into public.feedback_request_recipients (feedback_request_id, recipient_user_id)
select seed_request.id, recipient_id
from seed_request
cross join lateral (
  select id as recipient_id
  from public.profiles
  where account_status = 'active'
  order by created_at asc
  offset 1
  limit 3
) recipients
on conflict (feedback_request_id, recipient_user_id) do nothing;
