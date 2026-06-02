alter table public.process_form_instances
add column if not exists admin_moved_at timestamptz,
add column if not exists admin_moved_by uuid references auth.users(id),
add column if not exists admin_move_reason text,
add column if not exists admin_move_from_status text,
add column if not exists admin_move_to_status text;

create index if not exists idx_process_form_instances_admin_moved_at
  on public.process_form_instances(admin_moved_at);

insert into public.permissions (code, description)
values
  ('process.admin_move', 'Move process form instances between workflow states with a required audit reason')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HR_ADMIN', 'process.admin_move')
on conflict do nothing;

update public.process_form_instances
set admin_move_reason = coalesce(admin_move_reason, 'Seed state: no admin movement has occurred')
where id = (
  select id
  from public.process_form_instances
  order by updated_at desc
  limit 1
);
