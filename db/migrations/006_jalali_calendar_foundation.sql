alter table public.profiles
  add column if not exists preferred_calendar text not null default 'jalali',
  add column if not exists preferred_locale text not null default 'fa-IR',
  add column if not exists date_display_timezone text not null default 'Asia/Tehran';

alter table public.profiles
  drop constraint if exists profiles_preferred_calendar_check,
  add constraint profiles_preferred_calendar_check
    check (preferred_calendar in ('jalali', 'gregorian'));

alter table public.profiles
  drop constraint if exists profiles_preferred_locale_check,
  add constraint profiles_preferred_locale_check
    check (preferred_locale in ('fa-IR', 'en-US'));

update public.profiles
set
  preferred_calendar = coalesce(preferred_calendar, 'jalali'),
  preferred_locale = coalesce(preferred_locale, 'fa-IR'),
  date_display_timezone = coalesce(date_display_timezone, 'Asia/Tehran');
