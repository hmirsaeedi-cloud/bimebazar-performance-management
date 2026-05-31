export const languagePreferenceStatuses = Object.freeze({
  DEFAULTED: "defaulted",
  USER_CONFIGURED: "user_configured",
  HR_OVERRIDE_PENDING: "hr_override_pending",
  HR_OVERRIDDEN: "hr_overridden",
});

export const languagePreferenceActions = Object.freeze({
  USER_UPDATE: "user_update",
  REQUEST_HR_OVERRIDE: "request_hr_override",
  APPROVE_HR_OVERRIDE: "approve_hr_override",
  RETURN_OVERRIDE: "return_override",
});

export const languagePreferencesWorkflow = Object.freeze({
  [languagePreferenceStatuses.DEFAULTED]: {
    owner: "EMPLOYEE",
    nextAction: languagePreferenceActions.USER_UPDATE,
    transitions: {
      [languagePreferenceActions.USER_UPDATE]: languagePreferenceStatuses.USER_CONFIGURED,
      [languagePreferenceActions.REQUEST_HR_OVERRIDE]: languagePreferenceStatuses.HR_OVERRIDE_PENDING,
    },
  },
  [languagePreferenceStatuses.USER_CONFIGURED]: {
    owner: "EMPLOYEE",
    nextAction: languagePreferenceActions.USER_UPDATE,
    transitions: {
      [languagePreferenceActions.USER_UPDATE]: languagePreferenceStatuses.USER_CONFIGURED,
      [languagePreferenceActions.REQUEST_HR_OVERRIDE]: languagePreferenceStatuses.HR_OVERRIDE_PENDING,
    },
  },
  [languagePreferenceStatuses.HR_OVERRIDE_PENDING]: {
    owner: "HR_ADMIN",
    nextAction: languagePreferenceActions.APPROVE_HR_OVERRIDE,
    transitions: {
      [languagePreferenceActions.APPROVE_HR_OVERRIDE]: languagePreferenceStatuses.HR_OVERRIDDEN,
      [languagePreferenceActions.RETURN_OVERRIDE]: languagePreferenceStatuses.USER_CONFIGURED,
    },
  },
  [languagePreferenceStatuses.HR_OVERRIDDEN]: {
    owner: "HR_ADMIN",
    nextAction: languagePreferenceActions.USER_UPDATE,
    transitions: {
      [languagePreferenceActions.USER_UPDATE]: languagePreferenceStatuses.USER_CONFIGURED,
      [languagePreferenceActions.REQUEST_HR_OVERRIDE]: languagePreferenceStatuses.HR_OVERRIDE_PENDING,
    },
  },
});

export function getLanguagePreferenceState(status) {
  const state = languagePreferencesWorkflow[status];
  if (!state) throw new Error(`Unknown language preference status: ${status}`);
  return { status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionLanguagePreferenceState(status, action) {
  const state = languagePreferencesWorkflow[status];
  if (!state) throw new Error(`Unknown language preference status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Invalid language preference transition: ${status} -> ${action}`);
  return getLanguagePreferenceState(nextStatus);
}
