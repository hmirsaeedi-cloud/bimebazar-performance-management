export const languagePreferenceStatuses: Readonly<{
  DEFAULTED: "defaulted";
  USER_CONFIGURED: "user_configured";
  HR_OVERRIDE_PENDING: "hr_override_pending";
  HR_OVERRIDDEN: "hr_overridden";
}>;

export const languagePreferenceActions: Readonly<{
  USER_UPDATE: "user_update";
  REQUEST_HR_OVERRIDE: "request_hr_override";
  APPROVE_HR_OVERRIDE: "approve_hr_override";
  RETURN_OVERRIDE: "return_override";
}>;

export type LanguagePreferenceStatus =
  (typeof languagePreferenceStatuses)[keyof typeof languagePreferenceStatuses];
export type LanguagePreferenceAction =
  (typeof languagePreferenceActions)[keyof typeof languagePreferenceActions];

export interface LanguagePreferenceState {
  status: LanguagePreferenceStatus;
  owner: "EMPLOYEE" | "HR_ADMIN";
  nextAction: LanguagePreferenceAction | null;
}

export function getLanguagePreferenceState(status: LanguagePreferenceStatus): LanguagePreferenceState;
export function transitionLanguagePreferenceState(
  status: LanguagePreferenceStatus,
  action: LanguagePreferenceAction,
): LanguagePreferenceState;
