export const mpaStatuses = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  RETURNED: "returned",
  EMPLOYEE_APPROVED: "employee_approved",
  MANAGER_APPROVED: "manager_approved",
  ACTIVE: "active",
  ARCHIVED: "archived",
});

export const mpaActions = Object.freeze({
  UPDATE_DRAFT: "update_draft",
  SUBMIT: "submit",
  RETURN: "return",
  EMPLOYEE_APPROVE: "employee_approve",
  MANAGER_APPROVE: "manager_approve",
  HRBP_ACTIVATE: "hrbp_activate",
  ARCHIVE: "archive",
});

export const mpaWorkflow = Object.freeze({
  [mpaStatuses.DRAFT]: {
    status: mpaStatuses.DRAFT,
    owner: "MANAGER",
    nextAction: mpaActions.SUBMIT,
    transitions: {
      [mpaActions.UPDATE_DRAFT]: mpaStatuses.DRAFT,
      [mpaActions.SUBMIT]: mpaStatuses.SUBMITTED,
      [mpaActions.ARCHIVE]: mpaStatuses.ARCHIVED,
    },
  },
  [mpaStatuses.SUBMITTED]: {
    status: mpaStatuses.SUBMITTED,
    owner: "EMPLOYEE",
    nextAction: mpaActions.EMPLOYEE_APPROVE,
    transitions: {
      [mpaActions.EMPLOYEE_APPROVE]: mpaStatuses.EMPLOYEE_APPROVED,
      [mpaActions.RETURN]: mpaStatuses.RETURNED,
      [mpaActions.ARCHIVE]: mpaStatuses.ARCHIVED,
    },
  },
  [mpaStatuses.RETURNED]: {
    status: mpaStatuses.RETURNED,
    owner: "MANAGER",
    nextAction: mpaActions.SUBMIT,
    transitions: {
      [mpaActions.UPDATE_DRAFT]: mpaStatuses.DRAFT,
      [mpaActions.SUBMIT]: mpaStatuses.SUBMITTED,
      [mpaActions.ARCHIVE]: mpaStatuses.ARCHIVED,
    },
  },
  [mpaStatuses.EMPLOYEE_APPROVED]: {
    status: mpaStatuses.EMPLOYEE_APPROVED,
    owner: "MANAGER",
    nextAction: mpaActions.MANAGER_APPROVE,
    transitions: {
      [mpaActions.MANAGER_APPROVE]: mpaStatuses.MANAGER_APPROVED,
      [mpaActions.RETURN]: mpaStatuses.RETURNED,
      [mpaActions.ARCHIVE]: mpaStatuses.ARCHIVED,
    },
  },
  [mpaStatuses.MANAGER_APPROVED]: {
    status: mpaStatuses.MANAGER_APPROVED,
    owner: "HRBP",
    nextAction: mpaActions.HRBP_ACTIVATE,
    transitions: {
      [mpaActions.HRBP_ACTIVATE]: mpaStatuses.ACTIVE,
      [mpaActions.RETURN]: mpaStatuses.RETURNED,
      [mpaActions.ARCHIVE]: mpaStatuses.ARCHIVED,
    },
  },
  [mpaStatuses.ACTIVE]: {
    status: mpaStatuses.ACTIVE,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [mpaActions.ARCHIVE]: mpaStatuses.ARCHIVED,
    },
  },
  [mpaStatuses.ARCHIVED]: {
    status: mpaStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getMpaState(status) {
  const state = mpaWorkflow[status];
  if (!state) throw new Error(`Unknown MPA status: ${status}`);
  return {
    status: state.status,
    owner: state.owner,
    nextAction: state.nextAction,
  };
}

export function transitionMpaState(status, action) {
  const state = mpaWorkflow[status];
  if (!state) throw new Error(`Unknown MPA status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) {
    throw new Error(`Action ${action} is not allowed from ${status}`);
  }
  return getMpaState(nextStatus);
}
