export const goalStatuses = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  RETURNED: "returned",
  ACTIVE: "active",
  VISIBILITY_CHANGED: "visibility_changed",
  COMPLETED: "completed",
  ARCHIVED: "archived",
});

export const goalActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  RETURN: "return",
  ACTIVATE: "activate",
  OVERRIDE_VISIBILITY: "override_visibility",
  COMPLETE: "complete",
  ARCHIVE: "archive",
});

export const goalsWorkflow = Object.freeze({
  [goalStatuses.DRAFT]: {
    status: goalStatuses.DRAFT,
    owner: "OWNER",
    nextAction: goalActions.UPDATE,
    transitions: {
      [goalActions.UPDATE]: goalStatuses.DRAFT,
      [goalActions.SUBMIT]: goalStatuses.SUBMITTED,
      [goalActions.OVERRIDE_VISIBILITY]: goalStatuses.VISIBILITY_CHANGED,
      [goalActions.ARCHIVE]: goalStatuses.ARCHIVED,
    },
  },
  [goalStatuses.SUBMITTED]: {
    status: goalStatuses.SUBMITTED,
    owner: "MANAGER",
    nextAction: goalActions.APPROVE,
    transitions: {
      [goalActions.APPROVE]: goalStatuses.APPROVED,
      [goalActions.RETURN]: goalStatuses.RETURNED,
      [goalActions.OVERRIDE_VISIBILITY]: goalStatuses.VISIBILITY_CHANGED,
    },
  },
  [goalStatuses.APPROVED]: {
    status: goalStatuses.APPROVED,
    owner: "HRBP",
    nextAction: goalActions.ACTIVATE,
    transitions: {
      [goalActions.ACTIVATE]: goalStatuses.ACTIVE,
      [goalActions.RETURN]: goalStatuses.RETURNED,
      [goalActions.OVERRIDE_VISIBILITY]: goalStatuses.VISIBILITY_CHANGED,
    },
  },
  [goalStatuses.RETURNED]: {
    status: goalStatuses.RETURNED,
    owner: "OWNER",
    nextAction: goalActions.UPDATE,
    transitions: {
      [goalActions.UPDATE]: goalStatuses.DRAFT,
      [goalActions.SUBMIT]: goalStatuses.SUBMITTED,
      [goalActions.OVERRIDE_VISIBILITY]: goalStatuses.VISIBILITY_CHANGED,
      [goalActions.ARCHIVE]: goalStatuses.ARCHIVED,
    },
  },
  [goalStatuses.ACTIVE]: {
    status: goalStatuses.ACTIVE,
    owner: "OWNER",
    nextAction: goalActions.UPDATE,
    transitions: {
      [goalActions.UPDATE]: goalStatuses.ACTIVE,
      [goalActions.COMPLETE]: goalStatuses.COMPLETED,
      [goalActions.OVERRIDE_VISIBILITY]: goalStatuses.VISIBILITY_CHANGED,
      [goalActions.ARCHIVE]: goalStatuses.ARCHIVED,
    },
  },
  [goalStatuses.VISIBILITY_CHANGED]: {
    status: goalStatuses.VISIBILITY_CHANGED,
    owner: "HRBP",
    nextAction: goalActions.ACTIVATE,
    transitions: {
      [goalActions.ACTIVATE]: goalStatuses.ACTIVE,
      [goalActions.COMPLETE]: goalStatuses.COMPLETED,
      [goalActions.ARCHIVE]: goalStatuses.ARCHIVED,
    },
  },
  [goalStatuses.COMPLETED]: {
    status: goalStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [goalActions.ARCHIVE]: goalStatuses.ARCHIVED,
    },
  },
  [goalStatuses.ARCHIVED]: {
    status: goalStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getGoalState(status) {
  const state = goalsWorkflow[status];
  if (!state) throw new Error(`Unknown goal status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionGoalState(status, action) {
  const state = goalsWorkflow[status];
  if (!state) throw new Error(`Unknown goal status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getGoalState(nextStatus);
}

export function calculateGoalProgress(keyResults = []) {
  if (!Array.isArray(keyResults) || keyResults.length === 0) return 0;
  const totalWeight = keyResults.reduce((sum, item) => sum + Number(item.weight ?? 1), 0);
  if (totalWeight <= 0) return 0;
  const weighted = keyResults.reduce((sum, item) => {
    const current = Number(item.currentValue ?? 0);
    const target = Number(item.targetValue ?? 1);
    const progress = target === 0 ? 0 : Math.max(0, Math.min(100, (current / target) * 100));
    return sum + progress * Number(item.weight ?? 1);
  }, 0);
  return Number((weighted / totalWeight).toFixed(2));
}

export function buildCascadePath(parentPath = [], goalId) {
  return [...(Array.isArray(parentPath) ? parentPath : []), goalId].filter(Boolean);
}
