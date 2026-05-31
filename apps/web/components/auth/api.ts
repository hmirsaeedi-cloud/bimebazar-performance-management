export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  employeeId: string | null;
  role: string;
  permissions: string[];
  status: string;
  preferredCalendar: "jalali" | "gregorian";
  preferredLocale: string;
  dateDisplayTimezone: string;
  calendarPreferenceStatus: "defaulted" | "user_configured" | "hr_override_pending" | "hr_overridden";
  preferredLanguage: "fa" | "en";
  textDirection: "rtl" | "ltr";
  languagePreferenceStatus: "defaulted" | "user_configured" | "hr_override_pending" | "hr_overridden";
}

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  employee_id: string | null;
  role_code: string;
  account_status: string;
  failed_login_count: number;
  preferred_calendar: "jalali" | "gregorian";
  preferred_locale: string;
  date_display_timezone: string;
  calendar_preference_status: "defaulted" | "user_configured" | "hr_override_pending" | "hr_overridden";
  preferred_language: "fa" | "en";
  text_direction: "rtl" | "ltr";
  language_preference_status: "defaulted" | "user_configured" | "hr_override_pending" | "hr_overridden";
}

export function mapCurrentUser(profile: ProfileRow, permissions: string[]): CurrentUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    employeeId: profile.employee_id,
    role: profile.role_code,
    permissions,
    status: profile.account_status,
    preferredCalendar: profile.preferred_calendar,
    preferredLocale: profile.preferred_locale,
    dateDisplayTimezone: profile.date_display_timezone,
    calendarPreferenceStatus: profile.calendar_preference_status,
    preferredLanguage: profile.preferred_language,
    textDirection: profile.text_direction,
    languagePreferenceStatus: profile.language_preference_status,
  };
}
