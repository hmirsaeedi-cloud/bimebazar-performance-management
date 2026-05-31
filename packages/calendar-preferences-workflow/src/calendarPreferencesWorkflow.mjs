export const calendarPreferenceStatuses = Object.freeze({
  DEFAULTED: "defaulted",
  USER_CONFIGURED: "user_configured",
  HR_OVERRIDE_PENDING: "hr_override_pending",
  HR_OVERRIDDEN: "hr_overridden",
});

export const calendarPreferenceActions = Object.freeze({
  USER_UPDATE: "user_update",
  REQUEST_HR_OVERRIDE: "request_hr_override",
  APPROVE_HR_OVERRIDE: "approve_hr_override",
  RETURN_OVERRIDE: "return_override",
});

export const calendarPreferencesWorkflow = Object.freeze({
  [calendarPreferenceStatuses.DEFAULTED]: {
    owner: "EMPLOYEE",
    nextAction: calendarPreferenceActions.USER_UPDATE,
    transitions: {
      [calendarPreferenceActions.USER_UPDATE]: calendarPreferenceStatuses.USER_CONFIGURED,
      [calendarPreferenceActions.REQUEST_HR_OVERRIDE]: calendarPreferenceStatuses.HR_OVERRIDE_PENDING,
    },
  },
  [calendarPreferenceStatuses.USER_CONFIGURED]: {
    owner: "EMPLOYEE",
    nextAction: calendarPreferenceActions.USER_UPDATE,
    transitions: {
      [calendarPreferenceActions.USER_UPDATE]: calendarPreferenceStatuses.USER_CONFIGURED,
      [calendarPreferenceActions.REQUEST_HR_OVERRIDE]: calendarPreferenceStatuses.HR_OVERRIDE_PENDING,
    },
  },
  [calendarPreferenceStatuses.HR_OVERRIDE_PENDING]: {
    owner: "HR_ADMIN",
    nextAction: calendarPreferenceActions.APPROVE_HR_OVERRIDE,
    transitions: {
      [calendarPreferenceActions.APPROVE_HR_OVERRIDE]: calendarPreferenceStatuses.HR_OVERRIDDEN,
      [calendarPreferenceActions.RETURN_OVERRIDE]: calendarPreferenceStatuses.USER_CONFIGURED,
    },
  },
  [calendarPreferenceStatuses.HR_OVERRIDDEN]: {
    owner: "HR_ADMIN",
    nextAction: calendarPreferenceActions.USER_UPDATE,
    transitions: {
      [calendarPreferenceActions.USER_UPDATE]: calendarPreferenceStatuses.USER_CONFIGURED,
      [calendarPreferenceActions.REQUEST_HR_OVERRIDE]: calendarPreferenceStatuses.HR_OVERRIDE_PENDING,
    },
  },
});

export function getCalendarPreferenceState(status) {
  const state = calendarPreferencesWorkflow[status];
  if (!state) throw new Error(`Unknown calendar preference status: ${status}`);
  return { status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionCalendarPreferenceState(status, action) {
  const state = calendarPreferencesWorkflow[status];
  if (!state) throw new Error(`Unknown calendar preference status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getCalendarPreferenceState(nextStatus);
}
