export const notificationPreferenceStatuses = Object.freeze({
  DEFAULTED: "defaulted",
  CUSTOMIZED: "customized",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  RETURNED: "returned",
  OVERRIDDEN: "overridden",
});

export const notificationPreferenceActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  RETURN: "return",
  OVERRIDE: "override",
  VISIBILITY_CHANGE: "visibility_change",
});

export const notificationPreferenceWorkflow = Object.freeze({
  [notificationPreferenceStatuses.DEFAULTED]: {
    status: notificationPreferenceStatuses.DEFAULTED,
    owner: "USER",
    nextAction: notificationPreferenceActions.UPDATE,
    transitions: {
      [notificationPreferenceActions.UPDATE]: notificationPreferenceStatuses.CUSTOMIZED,
      [notificationPreferenceActions.SUBMIT]: notificationPreferenceStatuses.SUBMITTED,
      [notificationPreferenceActions.OVERRIDE]: notificationPreferenceStatuses.OVERRIDDEN,
      [notificationPreferenceActions.VISIBILITY_CHANGE]: notificationPreferenceStatuses.DEFAULTED,
    },
  },
  [notificationPreferenceStatuses.CUSTOMIZED]: {
    status: notificationPreferenceStatuses.CUSTOMIZED,
    owner: "USER",
    nextAction: notificationPreferenceActions.SUBMIT,
    transitions: {
      [notificationPreferenceActions.UPDATE]: notificationPreferenceStatuses.CUSTOMIZED,
      [notificationPreferenceActions.SUBMIT]: notificationPreferenceStatuses.SUBMITTED,
      [notificationPreferenceActions.OVERRIDE]: notificationPreferenceStatuses.OVERRIDDEN,
      [notificationPreferenceActions.VISIBILITY_CHANGE]: notificationPreferenceStatuses.CUSTOMIZED,
    },
  },
  [notificationPreferenceStatuses.SUBMITTED]: {
    status: notificationPreferenceStatuses.SUBMITTED,
    owner: "HRBP",
    nextAction: notificationPreferenceActions.APPROVE,
    transitions: {
      [notificationPreferenceActions.APPROVE]: notificationPreferenceStatuses.APPROVED,
      [notificationPreferenceActions.RETURN]: notificationPreferenceStatuses.RETURNED,
      [notificationPreferenceActions.OVERRIDE]: notificationPreferenceStatuses.OVERRIDDEN,
      [notificationPreferenceActions.VISIBILITY_CHANGE]: notificationPreferenceStatuses.SUBMITTED,
    },
  },
  [notificationPreferenceStatuses.APPROVED]: {
    status: notificationPreferenceStatuses.APPROVED,
    owner: "USER",
    nextAction: notificationPreferenceActions.UPDATE,
    transitions: {
      [notificationPreferenceActions.UPDATE]: notificationPreferenceStatuses.CUSTOMIZED,
      [notificationPreferenceActions.OVERRIDE]: notificationPreferenceStatuses.OVERRIDDEN,
      [notificationPreferenceActions.VISIBILITY_CHANGE]: notificationPreferenceStatuses.APPROVED,
    },
  },
  [notificationPreferenceStatuses.RETURNED]: {
    status: notificationPreferenceStatuses.RETURNED,
    owner: "USER",
    nextAction: notificationPreferenceActions.UPDATE,
    transitions: {
      [notificationPreferenceActions.UPDATE]: notificationPreferenceStatuses.CUSTOMIZED,
      [notificationPreferenceActions.SUBMIT]: notificationPreferenceStatuses.SUBMITTED,
      [notificationPreferenceActions.OVERRIDE]: notificationPreferenceStatuses.OVERRIDDEN,
      [notificationPreferenceActions.VISIBILITY_CHANGE]: notificationPreferenceStatuses.RETURNED,
    },
  },
  [notificationPreferenceStatuses.OVERRIDDEN]: {
    status: notificationPreferenceStatuses.OVERRIDDEN,
    owner: "USER",
    nextAction: notificationPreferenceActions.UPDATE,
    transitions: {
      [notificationPreferenceActions.UPDATE]: notificationPreferenceStatuses.CUSTOMIZED,
      [notificationPreferenceActions.VISIBILITY_CHANGE]: notificationPreferenceStatuses.OVERRIDDEN,
    },
  },
});

export function getNotificationPreferenceState(status) {
  const state = notificationPreferenceWorkflow[status];
  if (!state) throw new Error(`Unknown notification preference status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionNotificationPreferenceState(status, action) {
  const state = notificationPreferenceWorkflow[status];
  if (!state) throw new Error(`Unknown notification preference status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getNotificationPreferenceState(nextStatus);
}

export function defaultNotificationPreferences() {
  return {
    inAppEnabled: true,
    emailEnabled: true,
    pushEnabled: false,
    smsEnabled: false,
    digestFrequency: "immediate",
    quietHours: {
      enabled: true,
      start: "18:00",
      end: "09:00",
      timezone: "Asia/Tehran",
    },
    visibility: {
      managerCanView: false,
      hrbpCanView: true,
      hrAdminCanView: true,
    },
  };
}

export function normalizeNotificationPreferences(input = {}) {
  const defaults = defaultNotificationPreferences();
  const digest = input.digestFrequency ?? defaults.digestFrequency;
  const allowedDigest = new Set(["immediate", "daily", "weekly", "off"]);
  return {
    inAppEnabled: Boolean(input.inAppEnabled ?? defaults.inAppEnabled),
    emailEnabled: Boolean(input.emailEnabled ?? defaults.emailEnabled),
    pushEnabled: Boolean(input.pushEnabled ?? defaults.pushEnabled),
    smsEnabled: Boolean(input.smsEnabled ?? defaults.smsEnabled),
    digestFrequency: allowedDigest.has(digest) ? digest : defaults.digestFrequency,
    quietHours: { ...defaults.quietHours, ...(input.quietHours ?? {}) },
    visibility: { ...defaults.visibility, ...(input.visibility ?? {}) },
  };
}
