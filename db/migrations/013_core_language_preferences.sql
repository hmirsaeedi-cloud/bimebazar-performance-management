alter table public.profiles
  add column if not exists preferred_language text not null default 'fa',
  add column if not exists text_direction text not null default 'rtl',
  add column if not exists language_preference_status text not null default 'defaulted';

alter table public.profiles
  drop constraint if exists profiles_preferred_language_check,
  add constraint profiles_preferred_language_check
    check (preferred_language in ('fa', 'en'));

alter table public.profiles
  drop constraint if exists profiles_text_direction_check,
  add constraint profiles_text_direction_check
    check (text_direction in ('rtl', 'ltr'));

alter table public.profiles
  drop constraint if exists profiles_language_preference_status_check,
  add constraint profiles_language_preference_status_check
    check (language_preference_status in ('defaulted', 'user_configured', 'hr_override_pending', 'hr_overridden'));

insert into public.permissions (code, description)
values
  ('core.language.read', 'Read language and text direction preferences'),
  ('core.language.update', 'Update own language and text direction preferences'),
  ('core.language.override', 'Override language preferences for users')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('EMPLOYEE', 'core.language.read'),
  ('EMPLOYEE', 'core.language.update'),
  ('MANAGER', 'core.language.read'),
  ('MANAGER', 'core.language.update'),
  ('NEXT_LEVEL_MANAGER', 'core.language.read'),
  ('NEXT_LEVEL_MANAGER', 'core.language.update'),
  ('HRBP', 'core.language.read'),
  ('HRBP', 'core.language.update'),
  ('HR_ADMIN', 'core.language.read'),
  ('HR_ADMIN', 'core.language.update'),
  ('HR_ADMIN', 'core.language.override')
on conflict do nothing;

update public.profiles
set
  preferred_language = coalesce(preferred_language, 'fa'),
  text_direction = coalesce(text_direction, 'rtl'),
  language_preference_status = coalesce(language_preference_status, 'defaulted');

grant update (
  preferred_language,
  text_direction,
  language_preference_status
) on public.profiles to authenticated;
