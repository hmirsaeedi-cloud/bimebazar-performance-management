export const processStatuses = Object.freeze({
  DRAFT: "draft",
  CONFIGURED: "configured",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export const processActions = Object.freeze({
  UPDATE_CONFIG: "update_config",
  CONFIGURE: "configure",
  SCHEDULE: "schedule",
  START: "start",
  PAUSE: "pause",
  RESUME: "resume",
  COMPLETE: "complete",
  CANCEL: "cancel",
});

export const processWorkflow = Object.freeze({
  [processStatuses.DRAFT]: {
    status: processStatuses.DRAFT,
    owner: "HR_ADMIN",
    nextAction: processActions.CONFIGURE,
    transitions: {
      [processActions.UPDATE_CONFIG]: processStatuses.DRAFT,
      [processActions.CONFIGURE]: processStatuses.CONFIGURED,
      [processActions.CANCEL]: processStatuses.CANCELLED,
    },
  },
  [processStatuses.CONFIGURED]: {
    status: processStatuses.CONFIGURED,
    owner: "HR_ADMIN",
    nextAction: processActions.SCHEDULE,
    transitions: {
      [processActions.UPDATE_CONFIG]: processStatuses.DRAFT,
      [processActions.SCHEDULE]: processStatuses.SCHEDULED,
      [processActions.START]: processStatuses.ACTIVE,
      [processActions.CANCEL]: processStatuses.CANCELLED,
    },
  },
  [processStatuses.SCHEDULED]: {
    status: processStatuses.SCHEDULED,
    owner: "SYSTEM",
    nextAction: processActions.START,
    transitions: {
      [processActions.START]: processStatuses.ACTIVE,
      [processActions.CANCEL]: processStatuses.CANCELLED,
    },
  },
  [processStatuses.ACTIVE]: {
    status: processStatuses.ACTIVE,
    owner: "HRBP",
    nextAction: processActions.COMPLETE,
    transitions: {
      [processActions.PAUSE]: processStatuses.PAUSED,
      [processActions.COMPLETE]: processStatuses.COMPLETED,
      [processActions.CANCEL]: processStatuses.CANCELLED,
    },
  },
  [processStatuses.PAUSED]: {
    status: processStatuses.PAUSED,
    owner: "HRBP",
    nextAction: processActions.RESUME,
    transitions: {
      [processActions.RESUME]: processStatuses.ACTIVE,
      [processActions.CANCEL]: processStatuses.CANCELLED,
    },
  },
  [processStatuses.COMPLETED]: {
    status: processStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
  [processStatuses.CANCELLED]: {
    status: processStatuses.CANCELLED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getProcessState(status) {
  const state = processWorkflow[status];
  if (!state) throw new Error(`Unknown process status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionProcessState(status, action) {
  const state = processWorkflow[status];
  if (!state) throw new Error(`Unknown process status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getProcessState(nextStatus);
}
