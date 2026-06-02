export const promotionStatuses = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  MANAGER_APPROVED: "manager_approved",
  HRBP_APPROVED: "hrbp_approved",
  APPROVED: "approved",
  RETURNED: "returned",
  CANCELLED: "cancelled",
});

export const promotionActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  MANAGER_APPROVE: "manager_approve",
  HRBP_APPROVE: "hrbp_approve",
  APPROVE: "approve",
  RETURN: "return",
  CANCEL: "cancel",
  OVERRIDE_VISIBILITY: "override_visibility",
});

export const promotionWorkflow = Object.freeze({
  [promotionStatuses.DRAFT]: {
    status: promotionStatuses.DRAFT,
    owner: "MANAGER",
    nextAction: promotionActions.SUBMIT,
    transitions: {
      [promotionActions.UPDATE]: promotionStatuses.DRAFT,
      [promotionActions.SUBMIT]: promotionStatuses.SUBMITTED,
      [promotionActions.CANCEL]: promotionStatuses.CANCELLED,
      [promotionActions.OVERRIDE_VISIBILITY]: promotionStatuses.DRAFT,
    },
  },
  [promotionStatuses.SUBMITTED]: {
    status: promotionStatuses.SUBMITTED,
    owner: "MANAGER",
    nextAction: promotionActions.MANAGER_APPROVE,
    transitions: {
      [promotionActions.MANAGER_APPROVE]: promotionStatuses.MANAGER_APPROVED,
      [promotionActions.RETURN]: promotionStatuses.RETURNED,
      [promotionActions.CANCEL]: promotionStatuses.CANCELLED,
      [promotionActions.OVERRIDE_VISIBILITY]: promotionStatuses.SUBMITTED,
    },
  },
  [promotionStatuses.MANAGER_APPROVED]: {
    status: promotionStatuses.MANAGER_APPROVED,
    owner: "HRBP",
    nextAction: promotionActions.HRBP_APPROVE,
    transitions: {
      [promotionActions.HRBP_APPROVE]: promotionStatuses.HRBP_APPROVED,
      [promotionActions.RETURN]: promotionStatuses.RETURNED,
      [promotionActions.CANCEL]: promotionStatuses.CANCELLED,
      [promotionActions.OVERRIDE_VISIBILITY]: promotionStatuses.MANAGER_APPROVED,
    },
  },
  [promotionStatuses.HRBP_APPROVED]: {
    status: promotionStatuses.HRBP_APPROVED,
    owner: "HR_ADMIN",
    nextAction: promotionActions.APPROVE,
    transitions: {
      [promotionActions.APPROVE]: promotionStatuses.APPROVED,
      [promotionActions.RETURN]: promotionStatuses.RETURNED,
      [promotionActions.CANCEL]: promotionStatuses.CANCELLED,
      [promotionActions.OVERRIDE_VISIBILITY]: promotionStatuses.HRBP_APPROVED,
    },
  },
  [promotionStatuses.RETURNED]: {
    status: promotionStatuses.RETURNED,
    owner: "MANAGER",
    nextAction: promotionActions.UPDATE,
    transitions: {
      [promotionActions.UPDATE]: promotionStatuses.DRAFT,
      [promotionActions.SUBMIT]: promotionStatuses.SUBMITTED,
      [promotionActions.CANCEL]: promotionStatuses.CANCELLED,
      [promotionActions.OVERRIDE_VISIBILITY]: promotionStatuses.RETURNED,
    },
  },
  [promotionStatuses.APPROVED]: {
    status: promotionStatuses.APPROVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [promotionActions.OVERRIDE_VISIBILITY]: promotionStatuses.APPROVED,
    },
  },
  [promotionStatuses.CANCELLED]: {
    status: promotionStatuses.CANCELLED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getPromotionState(status) {
  const state = promotionWorkflow[status];
  if (!state) throw new Error(`Unknown promotion status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionPromotionState(status, action) {
  const state = promotionWorkflow[status];
  if (!state) throw new Error(`Unknown promotion status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getPromotionState(nextStatus);
}

export function normalizePromotionPayload(input) {
  return {
    currentLevel: String(input.currentLevel ?? "").trim(),
    proposedLevel: String(input.proposedLevel ?? "").trim(),
    rationale: String(input.rationale ?? "").trim(),
  };
}
