export const managerRoleStatuses = Object.freeze({
  NOT_MANAGER: "not_manager",
  ACTIVE_MANAGER: "active_manager",
  REVOKED_MANAGER: "revoked_manager",
});

export const managerRoleActions = Object.freeze({
  DIRECT_REPORT_ADDED: "direct_report_added",
  DIRECT_REPORT_REMOVED: "direct_report_removed",
  RESYNC_MANAGER_ROLE: "resync_manager_role",
});

export const managerRoleWorkflow = Object.freeze({
  [managerRoleStatuses.NOT_MANAGER]: {
    owner: "SYSTEM",
    nextAction: managerRoleActions.DIRECT_REPORT_ADDED,
    transitions: {
      [managerRoleActions.DIRECT_REPORT_ADDED]: managerRoleStatuses.ACTIVE_MANAGER,
      [managerRoleActions.RESYNC_MANAGER_ROLE]: managerRoleStatuses.NOT_MANAGER,
    },
  },
  [managerRoleStatuses.ACTIVE_MANAGER]: {
    owner: "SYSTEM",
    nextAction: managerRoleActions.DIRECT_REPORT_REMOVED,
    transitions: {
      [managerRoleActions.DIRECT_REPORT_REMOVED]: managerRoleStatuses.REVOKED_MANAGER,
      [managerRoleActions.RESYNC_MANAGER_ROLE]: managerRoleStatuses.ACTIVE_MANAGER,
    },
  },
  [managerRoleStatuses.REVOKED_MANAGER]: {
    owner: "SYSTEM",
    nextAction: managerRoleActions.DIRECT_REPORT_ADDED,
    transitions: {
      [managerRoleActions.DIRECT_REPORT_ADDED]: managerRoleStatuses.ACTIVE_MANAGER,
      [managerRoleActions.RESYNC_MANAGER_ROLE]: managerRoleStatuses.REVOKED_MANAGER,
    },
  },
});

export function getManagerRoleState(status) {
  const state = managerRoleWorkflow[status];
  if (!state) {
    throw new Error(`Unknown manager role status: ${status}`);
  }

  return {
    status,
    owner: state.owner,
    nextAction: state.nextAction,
  };
}

export function transitionManagerRoleState(status, action) {
  const state = managerRoleWorkflow[status];
  if (!state) {
    throw new Error(`Unknown manager role status: ${status}`);
  }

  const nextStatus = state.transitions[action];
  if (!nextStatus) {
    throw new Error(`Action ${action} is not allowed from ${status}`);
  }

  return getManagerRoleState(nextStatus);
}
