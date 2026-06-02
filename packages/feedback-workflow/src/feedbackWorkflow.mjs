export const feedbackStatuses = Object.freeze({
  DRAFT: "draft",
  OPEN: "open",
  EXTENDED: "extended",
  COMPLETED: "completed",
  CLOSED: "closed",
});

export const feedbackActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT_REQUEST: "submit_request",
  SUBMIT_RESPONSE: "submit_response",
  EXTEND: "extend",
  CLOSE: "close",
  OVERRIDE_VISIBILITY: "override_visibility",
});

export const feedbackWorkflow = Object.freeze({
  [feedbackStatuses.DRAFT]: {
    status: feedbackStatuses.DRAFT,
    owner: "REQUESTER",
    nextAction: feedbackActions.SUBMIT_REQUEST,
    transitions: {
      [feedbackActions.UPDATE]: feedbackStatuses.DRAFT,
      [feedbackActions.SUBMIT_REQUEST]: feedbackStatuses.OPEN,
      [feedbackActions.OVERRIDE_VISIBILITY]: feedbackStatuses.DRAFT,
    },
  },
  [feedbackStatuses.OPEN]: {
    status: feedbackStatuses.OPEN,
    owner: "RECIPIENTS",
    nextAction: feedbackActions.SUBMIT_RESPONSE,
    transitions: {
      [feedbackActions.UPDATE]: feedbackStatuses.OPEN,
      [feedbackActions.SUBMIT_RESPONSE]: feedbackStatuses.COMPLETED,
      [feedbackActions.EXTEND]: feedbackStatuses.EXTENDED,
      [feedbackActions.CLOSE]: feedbackStatuses.CLOSED,
      [feedbackActions.OVERRIDE_VISIBILITY]: feedbackStatuses.OPEN,
    },
  },
  [feedbackStatuses.EXTENDED]: {
    status: feedbackStatuses.EXTENDED,
    owner: "RECIPIENTS",
    nextAction: feedbackActions.SUBMIT_RESPONSE,
    transitions: {
      [feedbackActions.UPDATE]: feedbackStatuses.EXTENDED,
      [feedbackActions.SUBMIT_RESPONSE]: feedbackStatuses.COMPLETED,
      [feedbackActions.CLOSE]: feedbackStatuses.CLOSED,
      [feedbackActions.OVERRIDE_VISIBILITY]: feedbackStatuses.EXTENDED,
    },
  },
  [feedbackStatuses.COMPLETED]: {
    status: feedbackStatuses.COMPLETED,
    owner: "REQUESTER",
    nextAction: feedbackActions.CLOSE,
    transitions: {
      [feedbackActions.CLOSE]: feedbackStatuses.CLOSED,
      [feedbackActions.OVERRIDE_VISIBILITY]: feedbackStatuses.COMPLETED,
    },
  },
  [feedbackStatuses.CLOSED]: {
    status: feedbackStatuses.CLOSED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getFeedbackState(status) {
  const state = feedbackWorkflow[status];
  if (!state) throw new Error(`Unknown feedback status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionFeedbackState(status, action) {
  const state = feedbackWorkflow[status];
  if (!state) throw new Error(`Unknown feedback status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getFeedbackState(nextStatus);
}

export function canResolveAnonymousZeroResponseRequest(input) {
  return Boolean(input?.isAnonymous) && Number(input?.responseCount ?? 0) === 0;
}

export function canReleaseAnonymousResponses(input) {
  if (!input?.isAnonymous) return true;
  return Number(input.responseCount ?? 0) >= Number(input.minResponseCount ?? 3);
}

export function getAnonymityGuardState(input) {
  if (!input?.isAnonymous) {
    return {
      anonymityStatus: "not_anonymous",
      responseCount: Number(input?.responseCount ?? 0),
      minResponseCount: Number(input?.minResponseCount ?? 1),
      canRelease: true,
      guardReason: "Named feedback does not require an anonymity threshold.",
    };
  }
  const responseCount = Number(input.responseCount ?? 0);
  const minResponseCount = Number(input.minResponseCount ?? 3);
  if (responseCount === 0) {
    return {
      anonymityStatus: "collecting",
      responseCount,
      minResponseCount,
      canRelease: false,
      guardReason: "Anonymous request has zero responses and can be extended or closed.",
    };
  }
  if (responseCount < minResponseCount) {
    return {
      anonymityStatus: "guarded",
      responseCount,
      minResponseCount,
      canRelease: false,
      guardReason: `Anonymous responses are hidden until at least ${minResponseCount} responses are submitted.`,
    };
  }
  return {
    anonymityStatus: "releasable",
    responseCount,
    minResponseCount,
    canRelease: true,
    guardReason: "Minimum anonymous response threshold has been met.",
  };
}

export function normalizeFeedbackQuestion(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}
