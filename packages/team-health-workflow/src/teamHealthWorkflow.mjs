export const teamHealthStatuses = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  ACTIVE: "active",
  RETURNED: "returned",
  VISIBILITY_CHANGED: "visibility_changed",
  ARCHIVED: "archived",
});

export const teamHealthActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  CALCULATE: "calculate",
  SUBMIT: "submit",
  APPROVE: "approve",
  ACTIVATE: "activate",
  RETURN: "return",
  OVERRIDE_VISIBILITY: "override_visibility",
  ARCHIVE: "archive",
});

export const teamHealthWorkflow = Object.freeze({
  [teamHealthStatuses.DRAFT]: {
    status: teamHealthStatuses.DRAFT,
    owner: "MANAGER",
    nextAction: teamHealthActions.CALCULATE,
    transitions: {
      [teamHealthActions.UPDATE]: teamHealthStatuses.DRAFT,
      [teamHealthActions.CALCULATE]: teamHealthStatuses.DRAFT,
      [teamHealthActions.SUBMIT]: teamHealthStatuses.SUBMITTED,
      [teamHealthActions.OVERRIDE_VISIBILITY]: teamHealthStatuses.VISIBILITY_CHANGED,
      [teamHealthActions.ARCHIVE]: teamHealthStatuses.ARCHIVED,
    },
  },
  [teamHealthStatuses.SUBMITTED]: {
    status: teamHealthStatuses.SUBMITTED,
    owner: "HRBP",
    nextAction: teamHealthActions.APPROVE,
    transitions: {
      [teamHealthActions.APPROVE]: teamHealthStatuses.APPROVED,
      [teamHealthActions.RETURN]: teamHealthStatuses.RETURNED,
      [teamHealthActions.OVERRIDE_VISIBILITY]: teamHealthStatuses.VISIBILITY_CHANGED,
      [teamHealthActions.ARCHIVE]: teamHealthStatuses.ARCHIVED,
    },
  },
  [teamHealthStatuses.APPROVED]: {
    status: teamHealthStatuses.APPROVED,
    owner: "MANAGER",
    nextAction: teamHealthActions.ACTIVATE,
    transitions: {
      [teamHealthActions.ACTIVATE]: teamHealthStatuses.ACTIVE,
      [teamHealthActions.RETURN]: teamHealthStatuses.RETURNED,
      [teamHealthActions.OVERRIDE_VISIBILITY]: teamHealthStatuses.VISIBILITY_CHANGED,
      [teamHealthActions.ARCHIVE]: teamHealthStatuses.ARCHIVED,
    },
  },
  [teamHealthStatuses.ACTIVE]: {
    status: teamHealthStatuses.ACTIVE,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [teamHealthActions.CALCULATE]: teamHealthStatuses.ACTIVE,
      [teamHealthActions.OVERRIDE_VISIBILITY]: teamHealthStatuses.VISIBILITY_CHANGED,
      [teamHealthActions.ARCHIVE]: teamHealthStatuses.ARCHIVED,
    },
  },
  [teamHealthStatuses.RETURNED]: {
    status: teamHealthStatuses.RETURNED,
    owner: "MANAGER",
    nextAction: teamHealthActions.UPDATE,
    transitions: {
      [teamHealthActions.UPDATE]: teamHealthStatuses.DRAFT,
      [teamHealthActions.CALCULATE]: teamHealthStatuses.DRAFT,
      [teamHealthActions.SUBMIT]: teamHealthStatuses.SUBMITTED,
      [teamHealthActions.ARCHIVE]: teamHealthStatuses.ARCHIVED,
    },
  },
  [teamHealthStatuses.VISIBILITY_CHANGED]: {
    status: teamHealthStatuses.VISIBILITY_CHANGED,
    owner: "MANAGER",
    nextAction: teamHealthActions.UPDATE,
    transitions: {
      [teamHealthActions.UPDATE]: teamHealthStatuses.DRAFT,
      [teamHealthActions.SUBMIT]: teamHealthStatuses.SUBMITTED,
      [teamHealthActions.ARCHIVE]: teamHealthStatuses.ARCHIVED,
    },
  },
  [teamHealthStatuses.ARCHIVED]: {
    status: teamHealthStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getTeamHealthState(status) {
  const state = teamHealthWorkflow[status];
  if (!state) throw new Error(`Unknown team health status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionTeamHealthState(status, action) {
  const state = teamHealthWorkflow[status];
  if (!state) throw new Error(`Unknown team health status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getTeamHealthState(nextStatus);
}

export function calculateTeamHealthScore(metrics) {
  const weights = {
    evaluationCompletionRate: 0.25,
    averagePerformanceScore: 0.25,
    feedbackParticipationRate: 0.2,
    pipRiskInverse: 0.15,
    overdueTaskInverse: 0.15,
  };
  const normalized = {
    evaluationCompletionRate: clamp(metrics.evaluationCompletionRate ?? 0),
    averagePerformanceScore: clamp((metrics.averagePerformanceScore ?? 0) / 5),
    feedbackParticipationRate: clamp(metrics.feedbackParticipationRate ?? 0),
    pipRiskInverse: clamp(1 - (metrics.pipRiskRate ?? 0)),
    overdueTaskInverse: clamp(1 - (metrics.overdueTaskRate ?? 0)),
  };
  const score = Object.entries(weights).reduce((sum, [key, weight]) => sum + normalized[key] * weight, 0) * 100;
  const rounded = Math.round(score * 10) / 10;
  return {
    score: rounded,
    band: rounded >= 80 ? "healthy" : rounded >= 60 ? "watch" : "risk",
    contributions: Object.fromEntries(
      Object.entries(weights).map(([key, weight]) => [key, Math.round(normalized[key] * weight * 1000) / 10]),
    ),
  };
}

function clamp(value) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.min(1, Math.max(0, Number(value)));
}
