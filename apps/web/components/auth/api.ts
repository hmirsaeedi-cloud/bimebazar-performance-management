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
  };
}
