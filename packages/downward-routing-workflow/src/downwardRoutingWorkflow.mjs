export const downwardStatuses = Object.freeze({
  ASSIGNED: "assigned",
  MANAGER_DRAFT: "manager_draft",
  MANAGER_SUBMITTED: "manager_submitted",
  NEXT_LEVEL_REVIEW: "next_level_review",
  HRBP_REVIEW: "hrbp_review",
  RETURNED_TO_MANAGER: "returned_to_manager",
  APPROVED: "approved",
  COMPLETED: "completed",
});

export const downwardActions = Object.freeze({
  START: "start",
  UPDATE_DRAFT: "update_draft",
  SUBMIT: "submit",
  NEXT_LEVEL_APPROVE: "next_level_approve",
  HRBP_APPROVE: "hrbp_approve",
  RETURN: "return",
  COMPLETE: "complete",
  OVERRIDE_VISIBILITY: "override_visibility",
});

export const downwardWorkflow = Object.freeze({
  [downwardStatuses.ASSIGNED]: {
    status: downwardStatuses.ASSIGNED,
    owner: "MANAGER",
    nextAction: downwardActions.START,
    transitions: {
      [downwardActions.START]: downwardStatuses.MANAGER_DRAFT,
      [downwardActions.OVERRIDE_VISIBILITY]: downwardStatuses.ASSIGNED,
    },
  },
  [downwardStatuses.MANAGER_DRAFT]: {
    status: downwardStatuses.MANAGER_DRAFT,
    owner: "MANAGER",
    nextAction: downwardActions.SUBMIT,
    transitions: {
      [downwardActions.UPDATE_DRAFT]: downwardStatuses.MANAGER_DRAFT,
      [downwardActions.SUBMIT]: downwardStatuses.MANAGER_SUBMITTED,
      [downwardActions.OVERRIDE_VISIBILITY]: downwardStatuses.MANAGER_DRAFT,
    },
  },
  [downwardStatuses.MANAGER_SUBMITTED]: {
    status: downwardStatuses.MANAGER_SUBMITTED,
    owner: "NEXT_LEVEL_MANAGER",
    nextAction: downwardActions.NEXT_LEVEL_APPROVE,
    transitions: {
      [downwardActions.NEXT_LEVEL_APPROVE]: downwardStatuses.NEXT_LEVEL_REVIEW,
      [downwardActions.RETURN]: downwardStatuses.RETURNED_TO_MANAGER,
      [downwardActions.OVERRIDE_VISIBILITY]: downwardStatuses.MANAGER_SUBMITTED,
    },
  },
  [downwardStatuses.NEXT_LEVEL_REVIEW]: {
    status: downwardStatuses.NEXT_LEVEL_REVIEW,
    owner: "HRBP",
    nextAction: downwardActions.HRBP_APPROVE,
    transitions: {
      [downwardActions.HRBP_APPROVE]: downwardStatuses.HRBP_REVIEW,
      [downwardActions.RETURN]: downwardStatuses.RETURNED_TO_MANAGER,
      [downwardActions.OVERRIDE_VISIBILITY]: downwardStatuses.NEXT_LEVEL_REVIEW,
    },
  },
  [downwardStatuses.HRBP_REVIEW]: {
    status: downwardStatuses.HRBP_REVIEW,
    owner: "HRBP",
    nextAction: downwardActions.COMPLETE,
    transitions: {
      [downwardActions.COMPLETE]: downwardStatuses.COMPLETED,
      [downwardActions.RETURN]: downwardStatuses.RETURNED_TO_MANAGER,
      [downwardActions.OVERRIDE_VISIBILITY]: downwardStatuses.HRBP_REVIEW,
    },
  },
  [downwardStatuses.RETURNED_TO_MANAGER]: {
    status: downwardStatuses.RETURNED_TO_MANAGER,
    owner: "MANAGER",
    nextAction: downwardActions.SUBMIT,
    transitions: {
      [downwardActions.UPDATE_DRAFT]: downwardStatuses.MANAGER_DRAFT,
      [downwardActions.SUBMIT]: downwardStatuses.MANAGER_SUBMITTED,
      [downwardActions.OVERRIDE_VISIBILITY]: downwardStatuses.RETURNED_TO_MANAGER,
    },
  },
  [downwardStatuses.APPROVED]: {
    status: downwardStatuses.APPROVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
  [downwardStatuses.COMPLETED]: {
    status: downwardStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getDownwardState(status) {
  const state = downwardWorkflow[status];
  if (!state) throw new Error(`Unknown downward routing status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionDownwardState(status, action) {
  const state = downwardWorkflow[status];
  if (!state) throw new Error(`Unknown downward routing status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getDownwardState(nextStatus);
}
