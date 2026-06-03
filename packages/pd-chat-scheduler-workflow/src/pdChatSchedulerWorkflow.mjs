export const pdChatScheduleStatuses = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  ACTIVE: "active",
  PAUSED: "paused",
  RETURNED: "returned",
  VISIBILITY_CHANGED: "visibility_changed",
  ARCHIVED: "archived",
});

export const pdChatScheduleActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  ACTIVATE: "activate",
  PAUSE: "pause",
  RESUME: "resume",
  RETURN: "return",
  GENERATE_OCCURRENCE: "generate_occurrence",
  OVERRIDE_VISIBILITY: "override_visibility",
  ARCHIVE: "archive",
});

export const pdChatScheduleWorkflow = Object.freeze({
  [pdChatScheduleStatuses.DRAFT]: {
    status: pdChatScheduleStatuses.DRAFT,
    owner: "EMPLOYEE_MANAGER",
    nextAction: pdChatScheduleActions.UPDATE,
    transitions: {
      [pdChatScheduleActions.UPDATE]: pdChatScheduleStatuses.DRAFT,
      [pdChatScheduleActions.SUBMIT]: pdChatScheduleStatuses.SUBMITTED,
      [pdChatScheduleActions.OVERRIDE_VISIBILITY]: pdChatScheduleStatuses.VISIBILITY_CHANGED,
      [pdChatScheduleActions.ARCHIVE]: pdChatScheduleStatuses.ARCHIVED,
    },
  },
  [pdChatScheduleStatuses.SUBMITTED]: {
    status: pdChatScheduleStatuses.SUBMITTED,
    owner: "MANAGER",
    nextAction: pdChatScheduleActions.APPROVE,
    transitions: {
      [pdChatScheduleActions.APPROVE]: pdChatScheduleStatuses.APPROVED,
      [pdChatScheduleActions.RETURN]: pdChatScheduleStatuses.RETURNED,
      [pdChatScheduleActions.ARCHIVE]: pdChatScheduleStatuses.ARCHIVED,
    },
  },
  [pdChatScheduleStatuses.APPROVED]: {
    status: pdChatScheduleStatuses.APPROVED,
    owner: "MANAGER",
    nextAction: pdChatScheduleActions.ACTIVATE,
    transitions: {
      [pdChatScheduleActions.ACTIVATE]: pdChatScheduleStatuses.ACTIVE,
      [pdChatScheduleActions.RETURN]: pdChatScheduleStatuses.RETURNED,
      [pdChatScheduleActions.OVERRIDE_VISIBILITY]: pdChatScheduleStatuses.VISIBILITY_CHANGED,
      [pdChatScheduleActions.ARCHIVE]: pdChatScheduleStatuses.ARCHIVED,
    },
  },
  [pdChatScheduleStatuses.ACTIVE]: {
    status: pdChatScheduleStatuses.ACTIVE,
    owner: "SYSTEM",
    nextAction: pdChatScheduleActions.GENERATE_OCCURRENCE,
    transitions: {
      [pdChatScheduleActions.GENERATE_OCCURRENCE]: pdChatScheduleStatuses.ACTIVE,
      [pdChatScheduleActions.PAUSE]: pdChatScheduleStatuses.PAUSED,
      [pdChatScheduleActions.OVERRIDE_VISIBILITY]: pdChatScheduleStatuses.VISIBILITY_CHANGED,
      [pdChatScheduleActions.ARCHIVE]: pdChatScheduleStatuses.ARCHIVED,
    },
  },
  [pdChatScheduleStatuses.PAUSED]: {
    status: pdChatScheduleStatuses.PAUSED,
    owner: "MANAGER",
    nextAction: pdChatScheduleActions.RESUME,
    transitions: {
      [pdChatScheduleActions.RESUME]: pdChatScheduleStatuses.ACTIVE,
      [pdChatScheduleActions.UPDATE]: pdChatScheduleStatuses.PAUSED,
      [pdChatScheduleActions.OVERRIDE_VISIBILITY]: pdChatScheduleStatuses.VISIBILITY_CHANGED,
      [pdChatScheduleActions.ARCHIVE]: pdChatScheduleStatuses.ARCHIVED,
    },
  },
  [pdChatScheduleStatuses.RETURNED]: {
    status: pdChatScheduleStatuses.RETURNED,
    owner: "EMPLOYEE_MANAGER",
    nextAction: pdChatScheduleActions.UPDATE,
    transitions: {
      [pdChatScheduleActions.UPDATE]: pdChatScheduleStatuses.DRAFT,
      [pdChatScheduleActions.SUBMIT]: pdChatScheduleStatuses.SUBMITTED,
      [pdChatScheduleActions.ARCHIVE]: pdChatScheduleStatuses.ARCHIVED,
    },
  },
  [pdChatScheduleStatuses.VISIBILITY_CHANGED]: {
    status: pdChatScheduleStatuses.VISIBILITY_CHANGED,
    owner: "MANAGER",
    nextAction: pdChatScheduleActions.UPDATE,
    transitions: {
      [pdChatScheduleActions.UPDATE]: pdChatScheduleStatuses.DRAFT,
      [pdChatScheduleActions.SUBMIT]: pdChatScheduleStatuses.SUBMITTED,
      [pdChatScheduleActions.ARCHIVE]: pdChatScheduleStatuses.ARCHIVED,
    },
  },
  [pdChatScheduleStatuses.ARCHIVED]: {
    status: pdChatScheduleStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getPdChatScheduleState(status) {
  const state = pdChatScheduleWorkflow[status];
  if (!state) throw new Error(`Unknown PD Chat schedule status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionPdChatScheduleState(status, action) {
  const state = pdChatScheduleWorkflow[status];
  if (!state) throw new Error(`Unknown PD Chat schedule status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getPdChatScheduleState(nextStatus);
}

export function buildNextPdChatOccurrences(input) {
  const count = Math.max(1, Math.min(12, Number(input.count ?? 3)));
  const cadence = input.cadence;
  const dates = [];
  let cursor = new Date(input.startAt);
  if (Number.isNaN(cursor.getTime())) throw new Error("startAt must be a valid date");
  for (let index = 0; index < count; index += 1) {
    dates.push(cursor.toISOString());
    cursor = addCadence(cursor, cadence);
  }
  return dates;
}

function addCadence(date, cadence) {
  const next = new Date(date);
  if (cadence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (cadence === "biweekly") next.setUTCDate(next.getUTCDate() + 14);
  else if (cadence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else if (cadence === "quarterly") next.setUTCMonth(next.getUTCMonth() + 3);
  else throw new Error(`Unsupported PD Chat cadence: ${cadence}`);
  return next;
}
