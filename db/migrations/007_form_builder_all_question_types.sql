create table if not exists public.form_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  module text not null default 'evaluation',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  owner_role text not null default 'HR_ADMIN'
    check (owner_role in ('HR_ADMIN', 'HRBP', 'SYSTEM')),
  current_version_id uuid,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  schema jsonb not null,
  created_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (template_id, version_number)
);

alter table public.form_templates
  drop constraint if exists form_templates_current_version_id_fkey,
  add constraint form_templates_current_version_id_fkey
    foreign key (current_version_id) references public.form_template_versions(id)
    on delete set null;

create index if not exists idx_form_templates_status on public.form_templates(status);
create index if not exists idx_form_templates_created_by on public.form_templates(created_by);
create index if not exists idx_form_template_versions_template on public.form_template_versions(template_id);
create index if not exists idx_form_template_versions_status on public.form_template_versions(status);

insert into public.permissions (code, description)
values
  ('forms.read', 'Read form templates and published versions'),
  ('forms.create', 'Create form templates'),
  ('forms.update', 'Update draft form templates'),
  ('forms.publish', 'Publish form template versions'),
  ('forms.archive', 'Archive form templates')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HR_ADMIN', 'forms.read'),
  ('HR_ADMIN', 'forms.create'),
  ('HR_ADMIN', 'forms.update'),
  ('HR_ADMIN', 'forms.publish'),
  ('HR_ADMIN', 'forms.archive'),
  ('HRBP', 'forms.read')
on conflict do nothing;

alter table public.form_templates enable row level security;
alter table public.form_template_versions enable row level security;

grant select on public.form_templates to authenticated;
grant select on public.form_template_versions to authenticated;
grant insert, update on public.form_templates to authenticated;
grant insert, update on public.form_template_versions to authenticated;
grant all on public.form_templates to service_role;
grant all on public.form_template_versions to service_role;

drop policy if exists "hr can read form templates" on public.form_templates;
create policy "hr can read form templates"
on public.form_templates for select
to authenticated
using (
  (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "hr can read form versions" on public.form_template_versions;
create policy "hr can read form versions"
on public.form_template_versions for select
to authenticated
using (
  (select app_private.current_user_has_role('HR_ADMIN'))
  or (select app_private.current_user_has_role('HRBP'))
);

drop policy if exists "hr admin can create form templates" on public.form_templates;
create policy "hr admin can create form templates"
on public.form_templates for insert
to authenticated
with check ((select app_private.current_user_has_role('HR_ADMIN')));

drop policy if exists "hr admin can update form templates" on public.form_templates;
create policy "hr admin can update form templates"
on public.form_templates for update
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')))
with check ((select app_private.current_user_has_role('HR_ADMIN')));

drop policy if exists "hr admin can create form versions" on public.form_template_versions;
create policy "hr admin can create form versions"
on public.form_template_versions for insert
to authenticated
with check ((select app_private.current_user_has_role('HR_ADMIN')));

drop policy if exists "hr admin can update form versions" on public.form_template_versions;
create policy "hr admin can update form versions"
on public.form_template_versions for update
to authenticated
using ((select app_private.current_user_has_role('HR_ADMIN')))
with check ((select app_private.current_user_has_role('HR_ADMIN')));
