export const bandFlagStatuses = Object.freeze({
  DETECTED: "detected",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  RETURNED: "returned",
  CONVERTED: "converted",
  DISMISSED: "dismissed",
});

export const bandFlagActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  RETURN: "return",
  CONVERT: "convert",
  DISMISS: "dismiss",
  OVERRIDE_VISIBILITY: "override_visibility",
});

export const bandFlagTypes = Object.freeze({
  PIP: "pip",
  PROMOTION: "promotion",
  NONE: "none",
});

export const bandFlagWorkflow = Object.freeze({
  [bandFlagStatuses.DETECTED]: {
    status: bandFlagStatuses.DETECTED,
    owner: "HRBP",
    nextAction: bandFlagActions.SUBMIT,
    transitions: {
      [bandFlagActions.UPDATE]: bandFlagStatuses.DETECTED,
      [bandFlagActions.SUBMIT]: bandFlagStatuses.UNDER_REVIEW,
      [bandFlagActions.DISMISS]: bandFlagStatuses.DISMISSED,
      [bandFlagActions.OVERRIDE_VISIBILITY]: bandFlagStatuses.DETECTED,
    },
  },
  [bandFlagStatuses.UNDER_REVIEW]: {
    status: bandFlagStatuses.UNDER_REVIEW,
    owner: "HRBP",
    nextAction: bandFlagActions.APPROVE,
    transitions: {
      [bandFlagActions.APPROVE]: bandFlagStatuses.APPROVED,
      [bandFlagActions.RETURN]: bandFlagStatuses.RETURNED,
      [bandFlagActions.DISMISS]: bandFlagStatuses.DISMISSED,
      [bandFlagActions.OVERRIDE_VISIBILITY]: bandFlagStatuses.UNDER_REVIEW,
    },
  },
  [bandFlagStatuses.RETURNED]: {
    status: bandFlagStatuses.RETURNED,
    owner: "HRBP",
    nextAction: bandFlagActions.UPDATE,
    transitions: {
      [bandFlagActions.UPDATE]: bandFlagStatuses.DETECTED,
      [bandFlagActions.SUBMIT]: bandFlagStatuses.UNDER_REVIEW,
      [bandFlagActions.DISMISS]: bandFlagStatuses.DISMISSED,
      [bandFlagActions.OVERRIDE_VISIBILITY]: bandFlagStatuses.RETURNED,
    },
  },
  [bandFlagStatuses.APPROVED]: {
    status: bandFlagStatuses.APPROVED,
    owner: "HR_ADMIN",
    nextAction: bandFlagActions.CONVERT,
    transitions: {
      [bandFlagActions.CONVERT]: bandFlagStatuses.CONVERTED,
      [bandFlagActions.DISMISS]: bandFlagStatuses.DISMISSED,
      [bandFlagActions.OVERRIDE_VISIBILITY]: bandFlagStatuses.APPROVED,
    },
  },
  [bandFlagStatuses.CONVERTED]: {
    status: bandFlagStatuses.CONVERTED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
  [bandFlagStatuses.DISMISSED]: {
    status: bandFlagStatuses.DISMISSED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getBandFlagState(status) {
  const state = bandFlagWorkflow[status];
  if (!state) throw new Error(`Unknown performance band flag status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionBandFlagState(status, action) {
  const state = bandFlagWorkflow[status];
  if (!state) throw new Error(`Unknown performance band flag status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getBandFlagState(nextStatus);
}

export function classifyPerformanceBand(score, thresholds = {}) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) {
    throw new Error("Performance band auto-flag requires a visible submitted weighted score");
  }
  const pipMax = Number(thresholds.pipMax ?? 59.99);
  const promotionMin = Number(thresholds.promotionMin ?? 90);
  const numericScore = Number(score);
  if (numericScore <= pipMax) {
    return {
      flagType: bandFlagTypes.PIP,
      bandLabel: "PIP watch",
      rationale: `Weighted score ${numericScore} is at or below the PIP threshold ${pipMax}.`,
    };
  }
  if (numericScore >= promotionMin) {
    return {
      flagType: bandFlagTypes.PROMOTION,
      bandLabel: "Promotion ready",
      rationale: `Weighted score ${numericScore} is at or above the promotion threshold ${promotionMin}.`,
    };
  }
  return {
    flagType: bandFlagTypes.NONE,
    bandLabel: "No action",
    rationale: `Weighted score ${numericScore} is between PIP and promotion thresholds.`,
  };
}

export function assertScoreMayBeFlagged(score) {
  if (!score?.visible || score.totalScore === null || score.totalScore === undefined) {
    throw new Error("Weighted score shows section contribution after submission, so auto-flags run only on visible submitted scores");
  }
  return true;
}
