insert into public.permissions (code, description)
values
  ('forms.return', 'Return published form templates to draft for a new version')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HR_ADMIN', 'forms.return')
on conflict do nothing;
