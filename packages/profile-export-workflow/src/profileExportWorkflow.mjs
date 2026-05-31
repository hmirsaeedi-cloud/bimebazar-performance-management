export const profileExportStatuses = Object.freeze({
  REQUESTED: "requested",
  GENERATING: "generating",
  READY: "ready",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

export const profileExportActions = Object.freeze({
  GENERATE: "generate",
  MARK_READY: "mark_ready",
  MARK_FAILED: "mark_failed",
  CANCEL: "cancel",
});

export const profileExportWorkflow = Object.freeze({
  [profileExportStatuses.REQUESTED]: {
    status: profileExportStatuses.REQUESTED,
    owner: "HR_ADMIN",
    nextAction: profileExportActions.GENERATE,
    transitions: {
      [profileExportActions.GENERATE]: profileExportStatuses.GENERATING,
      [profileExportActions.CANCEL]: profileExportStatuses.CANCELLED,
    },
  },
  [profileExportStatuses.GENERATING]: {
    status: profileExportStatuses.GENERATING,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [profileExportActions.MARK_READY]: profileExportStatuses.READY,
      [profileExportActions.MARK_FAILED]: profileExportStatuses.FAILED,
    },
  },
  [profileExportStatuses.READY]: {
    status: profileExportStatuses.READY,
    owner: "HR_ADMIN",
    nextAction: null,
    transitions: {},
  },
  [profileExportStatuses.FAILED]: {
    status: profileExportStatuses.FAILED,
    owner: "HR_ADMIN",
    nextAction: profileExportActions.GENERATE,
    transitions: {
      [profileExportActions.GENERATE]: profileExportStatuses.GENERATING,
      [profileExportActions.CANCEL]: profileExportStatuses.CANCELLED,
    },
  },
  [profileExportStatuses.CANCELLED]: {
    status: profileExportStatuses.CANCELLED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getProfileExportState(status) {
  const state = profileExportWorkflow[status];
  if (!state) throw new Error(`Unknown profile export status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionProfileExportState(status, action) {
  const state = profileExportWorkflow[status];
  if (!state) throw new Error(`Unknown profile export status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getProfileExportState(nextStatus);
}
