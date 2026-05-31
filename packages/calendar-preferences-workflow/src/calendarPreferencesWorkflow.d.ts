export const calendarPreferenceStatuses: Readonly<{
  DEFAULTED: "defaulted";
  USER_CONFIGURED: "user_configured";
  HR_OVERRIDE_PENDING: "hr_override_pending";
  HR_OVERRIDDEN: "hr_overridden";
}>;

export const calendarPreferenceActions: Readonly<{
  USER_UPDATE: "user_update";
  REQUEST_HR_OVERRIDE: "request_hr_override";
  APPROVE_HR_OVERRIDE: "approve_hr_override";
  RETURN_OVERRIDE: "return_override";
}>;

export type CalendarPreferenceStatus =
  (typeof calendarPreferenceStatuses)[keyof typeof calendarPreferenceStatuses];
export type CalendarPreferenceAction =
  (typeof calendarPreferenceActions)[keyof typeof calendarPreferenceActions];

export interface CalendarPreferenceState {
  status: CalendarPreferenceStatus;
  owner: "EMPLOYEE" | "HR_ADMIN";
  nextAction: CalendarPreferenceAction | null;
}

export function getCalendarPreferenceState(status: CalendarPreferenceStatus): CalendarPreferenceState;
export function transitionCalendarPreferenceState(
  status: CalendarPreferenceStatus,
  action: CalendarPreferenceAction,
): CalendarPreferenceState;
