alter table public.profiles
  add column if not exists calendar_preference_status text not null default 'defaulted';

alter table public.profiles
  drop constraint if exists profiles_calendar_preference_status_check,
  add constraint profiles_calendar_preference_status_check
    check (calendar_preference_status in ('defaulted', 'user_configured', 'hr_override_pending', 'hr_overridden'));

insert into public.permissions (code, description)
values
  ('core.calendar.read', 'Read calendar and locale preferences'),
  ('core.calendar.update', 'Update own calendar and locale preferences'),
  ('core.calendar.override', 'Override calendar preferences for users')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'core.calendar.read'),
  ('EMPLOYEE', 'core.calendar.update'),
  ('MANAGER', 'core.calendar.read'),
  ('MANAGER', 'core.calendar.update'),
  ('NEXT_LEVEL_MANAGER', 'core.calendar.read'),
  ('NEXT_LEVEL_MANAGER', 'core.calendar.update'),
  ('HRBP', 'core.calendar.read'),
  ('HRBP', 'core.calendar.update'),
  ('HR_ADMIN', 'core.calendar.read'),
  ('HR_ADMIN', 'core.calendar.update'),
  ('HR_ADMIN', 'core.calendar.override')
on conflict do nothing;

update public.profiles
set calendar_preference_status = coalesce(calendar_preference_status, 'defaulted');

grant update (
  preferred_calendar,
  preferred_locale,
  date_display_timezone,
  calendar_preference_status
) on public.profiles to authenticated;
