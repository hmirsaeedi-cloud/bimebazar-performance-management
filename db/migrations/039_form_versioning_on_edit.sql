alter table public.form_template_versions
add column if not exists parent_version_id uuid references public.form_template_versions(id) on delete set null,
add column if not exists version_status text not null default 'draft_edit'
  check (version_status in ('draft_edit', 'submitted', 'approved', 'published', 'returned', 'archived')),
add column if not exists version_owner_role text not null default 'HR_ADMIN'
  check (version_owner_role in ('HR_ADMIN', 'HRBP', 'SYSTEM')),
add column if not exists version_next_action text,
add column if not exists change_summary jsonb not null default '{}'::jsonb,
add column if not exists visibility_policy jsonb not null default '{"visibleToEmployees":false,"visibleToManagers":false,"visibleToHrbp":true,"visibleToHrAdmin":true}'::jsonb,
add column if not exists submitted_at timestamptz,
add column if not exists approved_at timestamptz,
add column if not exists returned_at timestamptz,
add column if not exists archived_at timestamptz,
add column if not exists visibility_changed_at timestamptz,
add column if not exists last_return_reason text;

create index if not exists idx_form_template_versions_parent
  on public.form_template_versions(parent_version_id);

create index if not exists idx_form_template_versions_version_status
  on public.form_template_versions(version_status);

insert into public.permissions (code, description)
values
  ('forms.version_read', 'Read form version edit history'),
  ('forms.version_write', 'Create and update form version edits'),
  ('forms.version_approve', 'Approve form version edits'),
  ('forms.version_publish', 'Publish approved form version edits')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HRBP', 'forms.version_read'),
  ('HRBP', 'forms.version_approve'),
  ('HR_ADMIN', 'forms.version_read'),
  ('HR_ADMIN', 'forms.version_write'),
  ('HR_ADMIN', 'forms.version_approve'),
  ('HR_ADMIN', 'forms.version_publish')
on conflict do nothing;

update public.form_template_versions
set version_status = case status when 'published' then 'published' when 'archived' then 'archived' else 'draft_edit' end,
    version_owner_role = case status when 'published' then 'SYSTEM' when 'archived' then 'SYSTEM' else 'HR_ADMIN' end,
    version_next_action = case status when 'draft' then 'submit' else null end
where version_next_action is null;

with first_template as (
  select ft.id as template_id, ft.current_version_id, ft.name, ft.module, ft.created_by
  from public.form_templates ft
  order by ft.created_at
  limit 1
),
current_version as (
  select fv.*
  from public.form_template_versions fv
  join first_template ft on ft.current_version_id = fv.id
),
next_number as (
  select ft.template_id, coalesce(max(fv.version_number), 0) + 1 as version_number
  from first_template ft
  left join public.form_template_versions fv on fv.template_id = ft.template_id
  group by ft.template_id
)
insert into public.form_template_versions (
  template_id,
  parent_version_id,
  version_number,
  status,
  version_status,
  version_owner_role,
  version_next_action,
  schema,
  change_summary,
  visibility_policy,
  created_by
)
select
  ft.template_id,
  cv.id,
  nn.version_number,
  'draft',
  'draft_edit',
  'HR_ADMIN',
  'submit',
  cv.schema,
  jsonb_build_object('summary', 'Seed edit version created from current form version'),
  '{"visibleToEmployees":false,"visibleToManagers":false,"visibleToHrbp":true,"visibleToHrAdmin":true}'::jsonb,
  ft.created_by
from first_template ft
join current_version cv on true
join next_number nn on nn.template_id = ft.template_id
where not exists (
  select 1 from public.form_template_versions existing
  where existing.template_id = ft.template_id
    and existing.parent_version_id = cv.id
)
on conflict do nothing;
