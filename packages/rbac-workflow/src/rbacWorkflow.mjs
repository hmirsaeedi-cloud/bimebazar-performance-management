export const rbacStatuses = Object.freeze({
  DRAFT: "draft",
  ACTIVE: "active",
  REVOKED: "revoked",
});

export const rbacActions = Object.freeze({
  CREATE_ASSIGNMENT: "create_assignment",
  ACTIVATE_ASSIGNMENT: "activate_assignment",
  UPDATE_ASSIGNMENT: "update_assignment",
  REVOKE_ASSIGNMENT: "revoke_assignment",
  REACTIVATE_ASSIGNMENT: "reactivate_assignment",
});

export const rbacWorkflow = Object.freeze({
  [rbacStatuses.DRAFT]: {
    owner: "HR_ADMIN",
    nextAction: rbacActions.ACTIVATE_ASSIGNMENT,
    transitions: {
      [rbacActions.ACTIVATE_ASSIGNMENT]: rbacStatuses.ACTIVE,
      [rbacActions.REVOKE_ASSIGNMENT]: rbacStatuses.REVOKED,
    },
  },
  [rbacStatuses.ACTIVE]: {
    owner: "HR_ADMIN",
    nextAction: rbacActions.UPDATE_ASSIGNMENT,
    transitions: {
      [rbacActions.UPDATE_ASSIGNMENT]: rbacStatuses.ACTIVE,
      [rbacActions.REVOKE_ASSIGNMENT]: rbacStatuses.REVOKED,
    },
  },
  [rbacStatuses.REVOKED]: {
    owner: "HR_ADMIN",
    nextAction: rbacActions.REACTIVATE_ASSIGNMENT,
    transitions: {
      [rbacActions.REACTIVATE_ASSIGNMENT]: rbacStatuses.ACTIVE,
    },
  },
});

export function getRbacState(status) {
  const state = rbacWorkflow[status];
  if (!state) {
    throw new Error(`Unknown RBAC status: ${status}`);
  }

  return {
    status,
    owner: state.owner,
    nextAction: state.nextAction,
  };
}

export function transitionRbacState(status, action) {
  const state = rbacWorkflow[status];
  if (!state) {
    throw new Error(`Unknown RBAC status: ${status}`);
  }

  const nextStatus = state.transitions[action];
  if (!nextStatus) {
    throw new Error(`Action ${action} is not allowed from ${status}`);
  }

  return getRbacState(nextStatus);
}
