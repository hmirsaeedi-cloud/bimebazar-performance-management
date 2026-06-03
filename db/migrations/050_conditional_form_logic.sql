create table if not exists public.form_conditional_logic_rules (
  id uuid primary key default gen_random_uuid(),
  form_template_id uuid not null references public.form_templates(id) on delete cascade,
  form_template_version_id uuid not null references public.form_template_versions(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'active', 'returned', 'visibility_changed', 'archived')),
  owner_role text not null default 'HR_ADMIN'
    check (owner_role in ('HR_ADMIN', 'HRBP', 'SYSTEM')),
  next_action text,
  name text not null,
  description text,
  rules jsonb not null default '[]'::jsonb,
  preview_result jsonb not null default '{}'::jsonb,
  visibility jsonb not null default '{"employeeCanView":false,"managerCanView":false,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  returned_at timestamptz,
  visibility_changed_at timestamptz,
  archived_at timestamptz,
  last_return_reason text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_form_conditional_logic_template
  on public.form_conditional_logic_rules(form_template_id, status);

create index if not exists idx_form_conditional_logic_version
  on public.form_conditional_logic_rules(form_template_version_id);

insert into public.permissions (code, description)
values
  ('forms.conditional_read', 'Read conditional form logic rule sets'),
  ('forms.conditional_create', 'Create conditional form logic rule sets'),
  ('forms.conditional_update', 'Update conditional form logic rule sets'),
  ('forms.conditional_submit', 'Submit conditional form logic for review'),
  ('forms.conditional_approve', 'Approve and activate conditional form logic'),
  ('forms.conditional_return', 'Return conditional form logic for revision'),
  ('forms.conditional_override', 'Override conditional form logic visibility'),
  ('forms.conditional_archive', 'Archive conditional form logic')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('MANAGER', 'forms.conditional_read'),
  ('HRBP', 'forms.conditional_read'),
  ('HRBP', 'forms.conditional_create'),
  ('HRBP', 'forms.conditional_update'),
  ('HRBP', 'forms.conditional_submit'),
  ('HRBP', 'forms.conditional_approve'),
  ('HRBP', 'forms.conditional_return'),
  ('HRBP', 'forms.conditional_override'),
  ('HR_ADMIN', 'forms.conditional_read'),
  ('HR_ADMIN', 'forms.conditional_create'),
  ('HR_ADMIN', 'forms.conditional_update'),
  ('HR_ADMIN', 'forms.conditional_submit'),
  ('HR_ADMIN', 'forms.conditional_approve'),
  ('HR_ADMIN', 'forms.conditional_return'),
  ('HR_ADMIN', 'forms.conditional_override'),
  ('HR_ADMIN', 'forms.conditional_archive')
on conflict do nothing;

alter table public.form_conditional_logic_rules enable row level security;

grant select, insert, update on public.form_conditional_logic_rules to authenticated;
grant all on public.form_conditional_logic_rules to service_role;

drop policy if exists "conditional form logic visible to forms operators" on public.form_conditional_logic_rules;
create policy "conditional form logic visible to forms operators"
on public.form_conditional_logic_rules for select
to authenticated
using (
  (select app_private.current_user_has_role('MANAGER'))
  or (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

drop policy if exists "conditional form logic can be created by hr" on public.form_conditional_logic_rules;
create policy "conditional form logic can be created by hr"
on public.form_conditional_logic_rules for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (select app_private.current_user_has_role('HRBP'))
    or (select app_private.current_user_has_role('HR_ADMIN'))
  )
);

drop policy if exists "conditional form logic can be updated by hr" on public.form_conditional_logic_rules;
create policy "conditional form logic can be updated by hr"
on public.form_conditional_logic_rules for update
to authenticated
using (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
)
with check (
  (select app_private.current_user_has_role('HRBP'))
  or (select app_private.current_user_has_role('HR_ADMIN'))
);

with latest_version as (
  select
    ft.id as template_id,
    coalesce(ft.current_version_id, fv.id) as version_id,
    ft.created_by
  from public.form_templates ft
  join lateral (
    select id
    from public.form_template_versions
    where template_id = ft.id
    order by version_number desc
    limit 1
  ) fv on true
  order by ft.created_at
  limit 1
)
insert into public.form_conditional_logic_rules (
  form_template_id,
  form_template_version_id,
  status,
  owner_role,
  next_action,
  name,
  description,
  rules,
  preview_result,
  visibility,
  created_by,
  updated_by
)
select
  template_id,
  version_id,
  'draft',
  'HR_ADMIN',
  'submit',
  'Low score manager comment rule',
  'Seed conditional rule that asks managers for extra context when an overall score is low.',
  '[{"id":"show_manager_comment_for_low_score","label":"Require comment for low score","sourceQuestionId":"overall_rating","operator":"lte","value":2,"targets":[{"questionId":"manager_comment","effect":"show"},{"questionId":"manager_comment","effect":"require"}]}]'::jsonb,
  '{"visibleQuestionIds":[],"hiddenQuestionIds":[],"requiredQuestionIds":[],"matchedRuleIds":[]}'::jsonb,
  '{"employeeCanView":false,"managerCanView":false,"hrbpCanView":true,"hrAdminCanView":true}'::jsonb,
  created_by,
  created_by
from latest_version
where not exists (
  select 1 from public.form_conditional_logic_rules existing
  where existing.form_template_version_id = latest_version.version_id
    and existing.name = 'Low score manager comment rule'
)
on conflict do nothing;
