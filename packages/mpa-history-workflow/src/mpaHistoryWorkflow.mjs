export const mpaHistoryStatuses = Object.freeze({
  CAPTURED: "captured",
  REVIEWED: "reviewed",
  RESTORED: "restored",
  RETURNED: "returned",
  ARCHIVED: "archived",
});

export const mpaHistoryActions = Object.freeze({
  CAPTURE: "capture",
  APPROVE: "approve",
  RESTORE: "restore",
  RETURN: "return",
  ARCHIVE: "archive",
  OVERRIDE_VISIBILITY: "override_visibility",
});

export const mpaHistoryWorkflow = Object.freeze({
  [mpaHistoryStatuses.CAPTURED]: {
    status: mpaHistoryStatuses.CAPTURED,
    owner: "HRBP",
    nextAction: mpaHistoryActions.APPROVE,
    transitions: {
      [mpaHistoryActions.APPROVE]: mpaHistoryStatuses.REVIEWED,
      [mpaHistoryActions.RETURN]: mpaHistoryStatuses.RETURNED,
      [mpaHistoryActions.ARCHIVE]: mpaHistoryStatuses.ARCHIVED,
      [mpaHistoryActions.OVERRIDE_VISIBILITY]: mpaHistoryStatuses.CAPTURED,
    },
  },
  [mpaHistoryStatuses.REVIEWED]: {
    status: mpaHistoryStatuses.REVIEWED,
    owner: "MANAGER",
    nextAction: mpaHistoryActions.RESTORE,
    transitions: {
      [mpaHistoryActions.RESTORE]: mpaHistoryStatuses.RESTORED,
      [mpaHistoryActions.ARCHIVE]: mpaHistoryStatuses.ARCHIVED,
      [mpaHistoryActions.OVERRIDE_VISIBILITY]: mpaHistoryStatuses.REVIEWED,
    },
  },
  [mpaHistoryStatuses.RESTORED]: {
    status: mpaHistoryStatuses.RESTORED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [mpaHistoryActions.ARCHIVE]: mpaHistoryStatuses.ARCHIVED,
      [mpaHistoryActions.OVERRIDE_VISIBILITY]: mpaHistoryStatuses.RESTORED,
    },
  },
  [mpaHistoryStatuses.RETURNED]: {
    status: mpaHistoryStatuses.RETURNED,
    owner: "MANAGER",
    nextAction: mpaHistoryActions.APPROVE,
    transitions: {
      [mpaHistoryActions.APPROVE]: mpaHistoryStatuses.REVIEWED,
      [mpaHistoryActions.ARCHIVE]: mpaHistoryStatuses.ARCHIVED,
      [mpaHistoryActions.OVERRIDE_VISIBILITY]: mpaHistoryStatuses.RETURNED,
    },
  },
  [mpaHistoryStatuses.ARCHIVED]: {
    status: mpaHistoryStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getMpaHistoryState(status) {
  const state = mpaHistoryWorkflow[status];
  if (!state) throw new Error(`Unknown MPA history status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionMpaHistoryState(status, action) {
  const state = mpaHistoryWorkflow[status];
  if (!state) throw new Error(`Unknown MPA history status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getMpaHistoryState(nextStatus);
}

export function summarizeMpaSnapshot(input) {
  return {
    title: String(input.title ?? "").trim(),
    status: String(input.status ?? "").trim(),
    contentPlainText: String(input.contentPlainText ?? "").trim(),
  };
}
