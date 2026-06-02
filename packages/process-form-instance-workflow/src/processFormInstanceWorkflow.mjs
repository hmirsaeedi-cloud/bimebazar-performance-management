export const formInstanceStatuses = Object.freeze({
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  RETURNED: "returned",
  CLOSED: "closed",
});

export const formInstanceActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  RETURN: "return",
  CLOSE: "close",
  OVERRIDE_VISIBILITY: "override_visibility",
  ADMIN_MOVE: "admin_move",
});

export const formInstanceWorkflow = Object.freeze({
  [formInstanceStatuses.ASSIGNED]: {
    status: formInstanceStatuses.ASSIGNED,
    owner: "EMPLOYEE",
    nextAction: formInstanceActions.UPDATE,
    transitions: {
      [formInstanceActions.UPDATE]: formInstanceStatuses.IN_PROGRESS,
      [formInstanceActions.SUBMIT]: formInstanceStatuses.SUBMITTED,
      [formInstanceActions.OVERRIDE_VISIBILITY]: formInstanceStatuses.ASSIGNED,
      [formInstanceActions.ADMIN_MOVE]: formInstanceStatuses.ASSIGNED,
    },
  },
  [formInstanceStatuses.IN_PROGRESS]: {
    status: formInstanceStatuses.IN_PROGRESS,
    owner: "EMPLOYEE",
    nextAction: formInstanceActions.SUBMIT,
    transitions: {
      [formInstanceActions.UPDATE]: formInstanceStatuses.IN_PROGRESS,
      [formInstanceActions.SUBMIT]: formInstanceStatuses.SUBMITTED,
      [formInstanceActions.OVERRIDE_VISIBILITY]: formInstanceStatuses.IN_PROGRESS,
      [formInstanceActions.ADMIN_MOVE]: formInstanceStatuses.IN_PROGRESS,
    },
  },
  [formInstanceStatuses.SUBMITTED]: {
    status: formInstanceStatuses.SUBMITTED,
    owner: "MANAGER",
    nextAction: formInstanceActions.APPROVE,
    transitions: {
      [formInstanceActions.APPROVE]: formInstanceStatuses.APPROVED,
      [formInstanceActions.RETURN]: formInstanceStatuses.RETURNED,
      [formInstanceActions.OVERRIDE_VISIBILITY]: formInstanceStatuses.SUBMITTED,
      [formInstanceActions.ADMIN_MOVE]: formInstanceStatuses.SUBMITTED,
    },
  },
  [formInstanceStatuses.RETURNED]: {
    status: formInstanceStatuses.RETURNED,
    owner: "EMPLOYEE",
    nextAction: formInstanceActions.UPDATE,
    transitions: {
      [formInstanceActions.UPDATE]: formInstanceStatuses.IN_PROGRESS,
      [formInstanceActions.SUBMIT]: formInstanceStatuses.SUBMITTED,
      [formInstanceActions.OVERRIDE_VISIBILITY]: formInstanceStatuses.RETURNED,
      [formInstanceActions.ADMIN_MOVE]: formInstanceStatuses.RETURNED,
    },
  },
  [formInstanceStatuses.APPROVED]: {
    status: formInstanceStatuses.APPROVED,
    owner: "HRBP",
    nextAction: formInstanceActions.CLOSE,
    transitions: {
      [formInstanceActions.CLOSE]: formInstanceStatuses.CLOSED,
      [formInstanceActions.OVERRIDE_VISIBILITY]: formInstanceStatuses.APPROVED,
      [formInstanceActions.ADMIN_MOVE]: formInstanceStatuses.APPROVED,
    },
  },
  [formInstanceStatuses.CLOSED]: {
    status: formInstanceStatuses.CLOSED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [formInstanceActions.ADMIN_MOVE]: formInstanceStatuses.CLOSED,
    },
  },
});

export function getFormInstanceState(status) {
  const state = formInstanceWorkflow[status];
  if (!state) throw new Error(`Unknown form instance status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionFormInstanceState(status, action) {
  const state = formInstanceWorkflow[status];
  if (!state) throw new Error(`Unknown form instance status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getFormInstanceState(nextStatus);
}

export function assertLockedFormVersion(process) {
  if (!process?.lockedFormTemplateVersionId || !process?.lockedFormSchema) {
    throw new Error("Process form instances require a locked form template version.");
  }
  return true;
}

export function adminMoveFormInstanceState(targetStatus) {
  return getFormInstanceState(targetStatus);
}
