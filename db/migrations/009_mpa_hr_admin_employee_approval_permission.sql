insert into public.role_permissions (role_code, permission_code)
values ('HR_ADMIN', 'mpa.approve_employee')
on conflict do nothing;
