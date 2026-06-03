export const pulseSurveyStatuses = Object.freeze({
  DRAFT: "draft",
  CONFIGURED: "configured",
  ACTIVE: "active",
  ANONYMITY_REVIEW: "anonymity_review",
  APPROVED: "approved",
  RETURNED: "returned",
  RELEASED: "released",
  COMPLETED: "completed",
  VISIBILITY_CHANGED: "visibility_changed",
  CANCELLED: "cancelled",
});

export const pulseSurveyActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  CONFIGURE: "configure",
  START: "start",
  SUBMIT: "submit",
  APPROVE: "approve",
  RETURN: "return",
  RELEASE_RESULTS: "release_results",
  COMPLETE: "complete",
  OVERRIDE_VISIBILITY: "override_visibility",
  CANCEL: "cancel",
});

export const pulseSurveyWorkflow = Object.freeze({
  [pulseSurveyStatuses.DRAFT]: {
    status: pulseSurveyStatuses.DRAFT,
    owner: "HR_ADMIN",
    nextAction: pulseSurveyActions.CONFIGURE,
    transitions: {
      [pulseSurveyActions.UPDATE]: pulseSurveyStatuses.DRAFT,
      [pulseSurveyActions.CONFIGURE]: pulseSurveyStatuses.CONFIGURED,
      [pulseSurveyActions.OVERRIDE_VISIBILITY]: pulseSurveyStatuses.VISIBILITY_CHANGED,
      [pulseSurveyActions.CANCEL]: pulseSurveyStatuses.CANCELLED,
    },
  },
  [pulseSurveyStatuses.CONFIGURED]: {
    status: pulseSurveyStatuses.CONFIGURED,
    owner: "HR_ADMIN",
    nextAction: pulseSurveyActions.START,
    transitions: {
      [pulseSurveyActions.UPDATE]: pulseSurveyStatuses.DRAFT,
      [pulseSurveyActions.START]: pulseSurveyStatuses.ACTIVE,
      [pulseSurveyActions.OVERRIDE_VISIBILITY]: pulseSurveyStatuses.VISIBILITY_CHANGED,
      [pulseSurveyActions.CANCEL]: pulseSurveyStatuses.CANCELLED,
    },
  },
  [pulseSurveyStatuses.ACTIVE]: {
    status: pulseSurveyStatuses.ACTIVE,
    owner: "EMPLOYEE",
    nextAction: pulseSurveyActions.SUBMIT,
    transitions: {
      [pulseSurveyActions.SUBMIT]: pulseSurveyStatuses.ANONYMITY_REVIEW,
      [pulseSurveyActions.OVERRIDE_VISIBILITY]: pulseSurveyStatuses.VISIBILITY_CHANGED,
      [pulseSurveyActions.CANCEL]: pulseSurveyStatuses.CANCELLED,
    },
  },
  [pulseSurveyStatuses.ANONYMITY_REVIEW]: {
    status: pulseSurveyStatuses.ANONYMITY_REVIEW,
    owner: "HRBP",
    nextAction: pulseSurveyActions.APPROVE,
    transitions: {
      [pulseSurveyActions.APPROVE]: pulseSurveyStatuses.APPROVED,
      [pulseSurveyActions.RETURN]: pulseSurveyStatuses.RETURNED,
      [pulseSurveyActions.OVERRIDE_VISIBILITY]: pulseSurveyStatuses.VISIBILITY_CHANGED,
      [pulseSurveyActions.CANCEL]: pulseSurveyStatuses.CANCELLED,
    },
  },
  [pulseSurveyStatuses.APPROVED]: {
    status: pulseSurveyStatuses.APPROVED,
    owner: "HRBP",
    nextAction: pulseSurveyActions.RELEASE_RESULTS,
    transitions: {
      [pulseSurveyActions.RELEASE_RESULTS]: pulseSurveyStatuses.RELEASED,
      [pulseSurveyActions.RETURN]: pulseSurveyStatuses.RETURNED,
      [pulseSurveyActions.OVERRIDE_VISIBILITY]: pulseSurveyStatuses.VISIBILITY_CHANGED,
    },
  },
  [pulseSurveyStatuses.RETURNED]: {
    status: pulseSurveyStatuses.RETURNED,
    owner: "HR_ADMIN",
    nextAction: pulseSurveyActions.UPDATE,
    transitions: {
      [pulseSurveyActions.UPDATE]: pulseSurveyStatuses.DRAFT,
      [pulseSurveyActions.START]: pulseSurveyStatuses.ACTIVE,
      [pulseSurveyActions.CANCEL]: pulseSurveyStatuses.CANCELLED,
    },
  },
  [pulseSurveyStatuses.RELEASED]: {
    status: pulseSurveyStatuses.RELEASED,
    owner: "HRBP",
    nextAction: pulseSurveyActions.COMPLETE,
    transitions: {
      [pulseSurveyActions.COMPLETE]: pulseSurveyStatuses.COMPLETED,
      [pulseSurveyActions.OVERRIDE_VISIBILITY]: pulseSurveyStatuses.VISIBILITY_CHANGED,
    },
  },
  [pulseSurveyStatuses.VISIBILITY_CHANGED]: {
    status: pulseSurveyStatuses.VISIBILITY_CHANGED,
    owner: "HRBP",
    nextAction: pulseSurveyActions.UPDATE,
    transitions: {
      [pulseSurveyActions.UPDATE]: pulseSurveyStatuses.DRAFT,
      [pulseSurveyActions.START]: pulseSurveyStatuses.ACTIVE,
      [pulseSurveyActions.CANCEL]: pulseSurveyStatuses.CANCELLED,
    },
  },
  [pulseSurveyStatuses.COMPLETED]: {
    status: pulseSurveyStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
  [pulseSurveyStatuses.CANCELLED]: {
    status: pulseSurveyStatuses.CANCELLED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getPulseSurveyState(status) {
  const state = pulseSurveyWorkflow[status];
  if (!state) throw new Error(`Unknown pulse survey status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionPulseSurveyState(status, action) {
  const state = pulseSurveyWorkflow[status];
  if (!state) throw new Error(`Unknown pulse survey status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getPulseSurveyState(nextStatus);
}

export function assertPulseSurveyHasEligibleRecipients(employeeIds) {
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new Error("Processes cannot start when org filters produce zero eligible employees");
  }
  return true;
}

export function lockPulseSurveyFormVersion(input) {
  if (!input?.formTemplateVersionId) {
    throw new Error("Pulse surveys require a selected form template version");
  }
  return {
    formTemplateVersionId: input.formTemplateVersionId,
    lockedFormTemplateVersionId: input.formTemplateVersionId,
  };
}

export function evaluateAnonymityGuard(input) {
  const responseCount = Number(input.responseCount ?? 0);
  const minResponses = Number(input.minResponses ?? 3);
  return {
    responseCount,
    minResponses,
    canRelease: responseCount >= minResponses,
    missingResponses: Math.max(0, minResponses - responseCount),
  };
}

export function aggregatePulseAnswers(responses) {
  const totals = {};
  const counts = {};
  for (const response of Array.isArray(responses) ? responses : []) {
    const answers = response?.answers ?? {};
    for (const [key, value] of Object.entries(answers)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        totals[key] = (totals[key] ?? 0) + value;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
  }
  return Object.fromEntries(
    Object.entries(totals).map(([key, total]) => [key, Math.round((total / counts[key]) * 10) / 10]),
  );
}
