export const selfAssessmentStatuses = Object.freeze({
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  RETURNED: "returned",
  MANAGER_APPROVED: "manager_approved",
  COMPLETED: "completed",
});

export const selfAssessmentActions = Object.freeze({
  START: "start",
  UPDATE_DRAFT: "update_draft",
  SUBMIT: "submit",
  RETURN: "return",
  MANAGER_APPROVE: "manager_approve",
  COMPLETE: "complete",
  OVERRIDE_VISIBILITY: "override_visibility",
});

export const selfAssessmentWorkflow = Object.freeze({
  [selfAssessmentStatuses.ASSIGNED]: {
    status: selfAssessmentStatuses.ASSIGNED,
    owner: "EMPLOYEE",
    nextAction: selfAssessmentActions.START,
    transitions: {
      [selfAssessmentActions.START]: selfAssessmentStatuses.IN_PROGRESS,
      [selfAssessmentActions.OVERRIDE_VISIBILITY]: selfAssessmentStatuses.ASSIGNED,
    },
  },
  [selfAssessmentStatuses.IN_PROGRESS]: {
    status: selfAssessmentStatuses.IN_PROGRESS,
    owner: "EMPLOYEE",
    nextAction: selfAssessmentActions.SUBMIT,
    transitions: {
      [selfAssessmentActions.UPDATE_DRAFT]: selfAssessmentStatuses.IN_PROGRESS,
      [selfAssessmentActions.SUBMIT]: selfAssessmentStatuses.SUBMITTED,
      [selfAssessmentActions.OVERRIDE_VISIBILITY]: selfAssessmentStatuses.IN_PROGRESS,
    },
  },
  [selfAssessmentStatuses.SUBMITTED]: {
    status: selfAssessmentStatuses.SUBMITTED,
    owner: "MANAGER",
    nextAction: selfAssessmentActions.MANAGER_APPROVE,
    transitions: {
      [selfAssessmentActions.RETURN]: selfAssessmentStatuses.RETURNED,
      [selfAssessmentActions.MANAGER_APPROVE]: selfAssessmentStatuses.MANAGER_APPROVED,
      [selfAssessmentActions.OVERRIDE_VISIBILITY]: selfAssessmentStatuses.SUBMITTED,
    },
  },
  [selfAssessmentStatuses.RETURNED]: {
    status: selfAssessmentStatuses.RETURNED,
    owner: "EMPLOYEE",
    nextAction: selfAssessmentActions.SUBMIT,
    transitions: {
      [selfAssessmentActions.UPDATE_DRAFT]: selfAssessmentStatuses.IN_PROGRESS,
      [selfAssessmentActions.SUBMIT]: selfAssessmentStatuses.SUBMITTED,
      [selfAssessmentActions.OVERRIDE_VISIBILITY]: selfAssessmentStatuses.RETURNED,
    },
  },
  [selfAssessmentStatuses.MANAGER_APPROVED]: {
    status: selfAssessmentStatuses.MANAGER_APPROVED,
    owner: "HRBP",
    nextAction: selfAssessmentActions.COMPLETE,
    transitions: {
      [selfAssessmentActions.RETURN]: selfAssessmentStatuses.RETURNED,
      [selfAssessmentActions.COMPLETE]: selfAssessmentStatuses.COMPLETED,
      [selfAssessmentActions.OVERRIDE_VISIBILITY]: selfAssessmentStatuses.MANAGER_APPROVED,
    },
  },
  [selfAssessmentStatuses.COMPLETED]: {
    status: selfAssessmentStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getSelfAssessmentState(status) {
  const state = selfAssessmentWorkflow[status];
  if (!state) throw new Error(`Unknown self-assessment status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionSelfAssessmentState(status, action) {
  const state = selfAssessmentWorkflow[status];
  if (!state) throw new Error(`Unknown self-assessment status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getSelfAssessmentState(nextStatus);
}
