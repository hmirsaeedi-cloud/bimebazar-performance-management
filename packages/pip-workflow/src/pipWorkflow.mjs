export const pipStatuses = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  HRBP_APPROVED: "hrbp_approved",
  VISIBILITY_ACTIVE: "visibility_active",
  ACTIVE: "active",
  COMPLETED: "completed",
  RETURNED: "returned",
  CANCELLED: "cancelled",
});

export const pipActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  ACTIVATE_VISIBILITY: "activate_visibility",
  START: "start",
  COMPLETE: "complete",
  RETURN: "return",
  CANCEL: "cancel",
  OVERRIDE_VISIBILITY: "override_visibility",
});

export const pipWorkflow = Object.freeze({
  [pipStatuses.DRAFT]: {
    status: pipStatuses.DRAFT,
    owner: "MANAGER",
    nextAction: pipActions.SUBMIT,
    employeeVisible: false,
    transitions: {
      [pipActions.UPDATE]: pipStatuses.DRAFT,
      [pipActions.SUBMIT]: pipStatuses.SUBMITTED,
      [pipActions.CANCEL]: pipStatuses.CANCELLED,
      [pipActions.OVERRIDE_VISIBILITY]: pipStatuses.DRAFT,
    },
  },
  [pipStatuses.SUBMITTED]: {
    status: pipStatuses.SUBMITTED,
    owner: "HRBP",
    nextAction: pipActions.APPROVE,
    employeeVisible: false,
    transitions: {
      [pipActions.APPROVE]: pipStatuses.HRBP_APPROVED,
      [pipActions.RETURN]: pipStatuses.RETURNED,
      [pipActions.CANCEL]: pipStatuses.CANCELLED,
      [pipActions.OVERRIDE_VISIBILITY]: pipStatuses.SUBMITTED,
    },
  },
  [pipStatuses.HRBP_APPROVED]: {
    status: pipStatuses.HRBP_APPROVED,
    owner: "HRBP",
    nextAction: pipActions.ACTIVATE_VISIBILITY,
    employeeVisible: false,
    transitions: {
      [pipActions.ACTIVATE_VISIBILITY]: pipStatuses.VISIBILITY_ACTIVE,
      [pipActions.RETURN]: pipStatuses.RETURNED,
      [pipActions.CANCEL]: pipStatuses.CANCELLED,
      [pipActions.OVERRIDE_VISIBILITY]: pipStatuses.HRBP_APPROVED,
    },
  },
  [pipStatuses.VISIBILITY_ACTIVE]: {
    status: pipStatuses.VISIBILITY_ACTIVE,
    owner: "MANAGER",
    nextAction: pipActions.START,
    employeeVisible: true,
    transitions: {
      [pipActions.START]: pipStatuses.ACTIVE,
      [pipActions.RETURN]: pipStatuses.RETURNED,
      [pipActions.CANCEL]: pipStatuses.CANCELLED,
      [pipActions.OVERRIDE_VISIBILITY]: pipStatuses.VISIBILITY_ACTIVE,
    },
  },
  [pipStatuses.ACTIVE]: {
    status: pipStatuses.ACTIVE,
    owner: "MANAGER",
    nextAction: pipActions.COMPLETE,
    employeeVisible: true,
    transitions: {
      [pipActions.UPDATE]: pipStatuses.ACTIVE,
      [pipActions.COMPLETE]: pipStatuses.COMPLETED,
      [pipActions.CANCEL]: pipStatuses.CANCELLED,
      [pipActions.OVERRIDE_VISIBILITY]: pipStatuses.ACTIVE,
    },
  },
  [pipStatuses.RETURNED]: {
    status: pipStatuses.RETURNED,
    owner: "MANAGER",
    nextAction: pipActions.UPDATE,
    employeeVisible: false,
    transitions: {
      [pipActions.UPDATE]: pipStatuses.DRAFT,
      [pipActions.SUBMIT]: pipStatuses.SUBMITTED,
      [pipActions.CANCEL]: pipStatuses.CANCELLED,
      [pipActions.OVERRIDE_VISIBILITY]: pipStatuses.RETURNED,
    },
  },
  [pipStatuses.COMPLETED]: {
    status: pipStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    employeeVisible: true,
    transitions: {
      [pipActions.OVERRIDE_VISIBILITY]: pipStatuses.COMPLETED,
    },
  },
  [pipStatuses.CANCELLED]: {
    status: pipStatuses.CANCELLED,
    owner: "SYSTEM",
    nextAction: null,
    employeeVisible: false,
    transitions: {},
  },
});

export function getPipState(status) {
  const state = pipWorkflow[status];
  if (!state) throw new Error(`Unknown PIP status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction, employeeVisible: state.employeeVisible };
}

export function transitionPipState(status, action) {
  const state = pipWorkflow[status];
  if (!state) throw new Error(`Unknown PIP status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getPipState(nextStatus);
}

export function normalizePipPlan(input) {
  return {
    performanceConcern: String(input.performanceConcern ?? "").trim(),
    successCriteria: String(input.successCriteria ?? "").trim(),
    supportPlan: String(input.supportPlan ?? "").trim(),
  };
}
