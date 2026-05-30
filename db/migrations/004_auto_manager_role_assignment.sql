insert into public.permissions (code, description)
values
  ('rbac.sync_manager_roles', 'Recompute computed Manager role assignments')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('HR_ADMIN', 'rbac.sync_manager_roles')
on conflict do nothing;

create or replace function app_private.active_direct_report_count(manager_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.profiles report
  where report.manager_id = manager_user_id
    and report.account_status = 'active';
$$;

create or replace function app_private.sync_computed_manager_role(manager_user_id uuid)
returns table(user_id uuid, role_code text, status text, direct_report_count integer, changed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_count integer;
  previous_status text;
  next_status text;
begin
  select app_private.active_direct_report_count(manager_user_id) into report_count;
  select pr.status
  into previous_status
  from public.profile_roles pr
  where pr.user_id = manager_user_id
    and pr.role_code = 'MANAGER'
    and pr.assignment_type = 'computed';

  if report_count > 0 then
    next_status := 'active';
    insert into public.profile_roles (
      user_id,
      role_code,
      assignment_type,
      status,
      assigned_at,
      revoked_at,
      reason
    )
    values (
      manager_user_id,
      'MANAGER',
      'computed',
      'active',
      now(),
      null,
      'Auto-assigned because employee has active direct reports'
    )
    on conflict (user_id, role_code, assignment_type) do update
    set assignment_type = 'computed',
        status = 'active',
        assigned_at = coalesce(public.profile_roles.assigned_at, now()),
        revoked_at = null,
        reason = excluded.reason;
  else
    next_status := 'revoked';
    update public.profile_roles
    set status = 'revoked',
        revoked_at = now(),
        reason = 'Auto-revoked because employee has no active direct reports'
    where user_id = manager_user_id
      and role_code = 'MANAGER'
      and assignment_type = 'computed'
      and status = 'active';
  end if;

  return query
  select
    manager_user_id,
    'MANAGER'::text,
    coalesce(next_status, 'revoked'),
    report_count,
    coalesce(previous_status, '') is distinct from coalesce(next_status, '');
end;
$$;

grant execute on function app_private.active_direct_report_count(uuid) to authenticated;
grant execute on function app_private.sync_computed_manager_role(uuid) to authenticated;
