alter table public.form_templates
  add column if not exists template_key text,
  add column if not exists template_category text not null default 'custom'
    check (template_category in ('system_default', 'custom')),
  add column if not exists is_system_template boolean not null default false,
  add column if not exists source_template_id uuid references public.form_templates(id) on delete set null;

create unique index if not exists idx_form_templates_template_key
  on public.form_templates(template_key)
  where template_key is not null;

create index if not exists idx_form_templates_template_category
  on public.form_templates(template_category);

create index if not exists idx_form_templates_source_template
  on public.form_templates(source_template_id);
