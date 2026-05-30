export const profileStatuses = Object.freeze({
  INVITED: "invited",
  ACTIVE: "active",
  LOCKED: "locked",
  DEACTIVATED: "deactivated",
});

export const profileActions = Object.freeze({
  CREATE_PROFILE: "create_profile",
  ACTIVATE_PROFILE: "activate_profile",
  UPDATE_PROFILE: "update_profile",
  LOCK_PROFILE: "lock_profile",
  DEACTIVATE_PROFILE: "deactivate_profile",
  REACTIVATE_PROFILE: "reactivate_profile",
});

export const profileWorkflow = Object.freeze({
  [profileStatuses.INVITED]: {
    owner: "HR_ADMIN",
    nextAction: profileActions.ACTIVATE_PROFILE,
    transitions: {
      [profileActions.ACTIVATE_PROFILE]: profileStatuses.ACTIVE,
      [profileActions.UPDATE_PROFILE]: profileStatuses.INVITED,
      [profileActions.DEACTIVATE_PROFILE]: profileStatuses.DEACTIVATED,
    },
  },
  [profileStatuses.ACTIVE]: {
    owner: "HR_ADMIN_OR_HRBP",
    nextAction: profileActions.UPDATE_PROFILE,
    transitions: {
      [profileActions.UPDATE_PROFILE]: profileStatuses.ACTIVE,
      [profileActions.LOCK_PROFILE]: profileStatuses.LOCKED,
      [profileActions.DEACTIVATE_PROFILE]: profileStatuses.DEACTIVATED,
    },
  },
  [profileStatuses.LOCKED]: {
    owner: "HR_ADMIN",
    nextAction: profileActions.REACTIVATE_PROFILE,
    transitions: {
      [profileActions.REACTIVATE_PROFILE]: profileStatuses.ACTIVE,
      [profileActions.DEACTIVATE_PROFILE]: profileStatuses.DEACTIVATED,
    },
  },
  [profileStatuses.DEACTIVATED]: {
    owner: "HR_ADMIN",
    nextAction: profileActions.REACTIVATE_PROFILE,
    transitions: {
      [profileActions.REACTIVATE_PROFILE]: profileStatuses.ACTIVE,
    },
  },
});

export function getProfileState(status) {
  const state = profileWorkflow[status];
  if (!state) {
    throw new Error(`Unknown profile status: ${status}`);
  }

  return {
    status,
    owner: state.owner,
    nextAction: state.nextAction,
  };
}

export function transitionProfileState(status, action) {
  const state = profileWorkflow[status];
  if (!state) {
    throw new Error(`Unknown profile status: ${status}`);
  }

  const nextStatus = state.transitions[action];
  if (!nextStatus) {
    throw new Error(`Action ${action} is not allowed from ${status}`);
  }

  return getProfileState(nextStatus);
}
