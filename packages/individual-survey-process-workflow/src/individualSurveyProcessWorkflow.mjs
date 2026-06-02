export const individualSurveyStatuses = Object.freeze({
  DRAFT: "draft",
  CONFIGURED: "configured",
  ACTIVE: "active",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  RETURNED: "returned",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export const individualSurveyActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  CONFIGURE: "configure",
  START: "start",
  SUBMIT: "submit",
  APPROVE: "approve",
  RETURN: "return",
  COMPLETE: "complete",
  CANCEL: "cancel",
  OVERRIDE_VISIBILITY: "override_visibility",
});

export const individualSurveyWorkflow = Object.freeze({
  [individualSurveyStatuses.DRAFT]: {
    status: individualSurveyStatuses.DRAFT,
    owner: "HR_ADMIN",
    nextAction: individualSurveyActions.CONFIGURE,
    transitions: {
      [individualSurveyActions.UPDATE]: individualSurveyStatuses.DRAFT,
      [individualSurveyActions.CONFIGURE]: individualSurveyStatuses.CONFIGURED,
      [individualSurveyActions.CANCEL]: individualSurveyStatuses.CANCELLED,
      [individualSurveyActions.OVERRIDE_VISIBILITY]: individualSurveyStatuses.DRAFT,
    },
  },
  [individualSurveyStatuses.CONFIGURED]: {
    status: individualSurveyStatuses.CONFIGURED,
    owner: "HR_ADMIN",
    nextAction: individualSurveyActions.START,
    transitions: {
      [individualSurveyActions.UPDATE]: individualSurveyStatuses.DRAFT,
      [individualSurveyActions.START]: individualSurveyStatuses.ACTIVE,
      [individualSurveyActions.CANCEL]: individualSurveyStatuses.CANCELLED,
      [individualSurveyActions.OVERRIDE_VISIBILITY]: individualSurveyStatuses.CONFIGURED,
    },
  },
  [individualSurveyStatuses.ACTIVE]: {
    status: individualSurveyStatuses.ACTIVE,
    owner: "EMPLOYEE",
    nextAction: individualSurveyActions.SUBMIT,
    transitions: {
      [individualSurveyActions.SUBMIT]: individualSurveyStatuses.SUBMITTED,
      [individualSurveyActions.CANCEL]: individualSurveyStatuses.CANCELLED,
      [individualSurveyActions.OVERRIDE_VISIBILITY]: individualSurveyStatuses.ACTIVE,
    },
  },
  [individualSurveyStatuses.SUBMITTED]: {
    status: individualSurveyStatuses.SUBMITTED,
    owner: "HRBP",
    nextAction: individualSurveyActions.APPROVE,
    transitions: {
      [individualSurveyActions.APPROVE]: individualSurveyStatuses.APPROVED,
      [individualSurveyActions.RETURN]: individualSurveyStatuses.RETURNED,
      [individualSurveyActions.OVERRIDE_VISIBILITY]: individualSurveyStatuses.SUBMITTED,
    },
  },
  [individualSurveyStatuses.RETURNED]: {
    status: individualSurveyStatuses.RETURNED,
    owner: "EMPLOYEE",
    nextAction: individualSurveyActions.SUBMIT,
    transitions: {
      [individualSurveyActions.SUBMIT]: individualSurveyStatuses.SUBMITTED,
      [individualSurveyActions.CANCEL]: individualSurveyStatuses.CANCELLED,
      [individualSurveyActions.OVERRIDE_VISIBILITY]: individualSurveyStatuses.RETURNED,
    },
  },
  [individualSurveyStatuses.APPROVED]: {
    status: individualSurveyStatuses.APPROVED,
    owner: "HRBP",
    nextAction: individualSurveyActions.COMPLETE,
    transitions: {
      [individualSurveyActions.COMPLETE]: individualSurveyStatuses.COMPLETED,
      [individualSurveyActions.OVERRIDE_VISIBILITY]: individualSurveyStatuses.APPROVED,
    },
  },
  [individualSurveyStatuses.COMPLETED]: {
    status: individualSurveyStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
  [individualSurveyStatuses.CANCELLED]: {
    status: individualSurveyStatuses.CANCELLED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getIndividualSurveyState(status) {
  const state = individualSurveyWorkflow[status];
  if (!state) throw new Error(`Unknown individual survey status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionIndividualSurveyState(status, action) {
  const state = individualSurveyWorkflow[status];
  if (!state) throw new Error(`Unknown individual survey status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getIndividualSurveyState(nextStatus);
}

export function assertSurveyHasEligibleRecipients(employeeIds) {
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new Error("Processes cannot start when org filters produce zero eligible employees");
  }
  return true;
}

export function lockSurveyFormVersion(input) {
  if (!input?.formTemplateVersionId) {
    throw new Error("Individual surveys require a selected form template version");
  }
  return {
    formTemplateVersionId: input.formTemplateVersionId,
    lockedFormTemplateVersionId: input.formTemplateVersionId,
  };
}
