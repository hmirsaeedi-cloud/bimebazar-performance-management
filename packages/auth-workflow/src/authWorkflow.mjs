export const accountStatuses = Object.freeze({
  INVITED: "invited",
  ACTIVE: "active",
  LOCKED: "locked",
  DEACTIVATED: "deactivated",
});

export const authActions = Object.freeze({
  CREATE_ACCOUNT: "create_account",
  ACCEPT_INVITE: "accept_invite",
  LOGIN: "login",
  FAILED_LOGIN: "failed_login",
  LOCK_ACCOUNT: "lock_account",
  LOGOUT: "logout",
  DEACTIVATE_ACCOUNT: "deactivate_account",
});

export const authWorkflow = Object.freeze({
  [accountStatuses.INVITED]: {
    owner: "HR_ADMIN",
    nextAction: authActions.ACCEPT_INVITE,
    transitions: {
      [authActions.ACCEPT_INVITE]: accountStatuses.ACTIVE,
      [authActions.DEACTIVATE_ACCOUNT]: accountStatuses.DEACTIVATED,
    },
  },
  [accountStatuses.ACTIVE]: {
    owner: "USER",
    nextAction: authActions.LOGIN,
    transitions: {
      [authActions.LOGIN]: accountStatuses.ACTIVE,
      [authActions.LOGOUT]: accountStatuses.ACTIVE,
      [authActions.FAILED_LOGIN]: accountStatuses.ACTIVE,
      [authActions.LOCK_ACCOUNT]: accountStatuses.LOCKED,
      [authActions.DEACTIVATE_ACCOUNT]: accountStatuses.DEACTIVATED,
    },
  },
  [accountStatuses.LOCKED]: {
    owner: "HR_ADMIN",
    nextAction: authActions.LOCK_ACCOUNT,
    transitions: {
      [authActions.DEACTIVATE_ACCOUNT]: accountStatuses.DEACTIVATED,
    },
  },
  [accountStatuses.DEACTIVATED]: {
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getAuthState(status) {
  const state = authWorkflow[status];
  if (!state) {
    throw new Error(`Unknown auth status: ${status}`);
  }

  return {
    status,
    owner: state.owner,
    nextAction: state.nextAction,
  };
}

export function transitionAuthState(status, action) {
  const state = authWorkflow[status];
  if (!state) {
    throw new Error(`Unknown auth status: ${status}`);
  }

  const nextStatus = state.transitions[action];
  if (!nextStatus) {
    throw new Error(`Action ${action} is not allowed from ${status}`);
  }

  return getAuthState(nextStatus);
}
