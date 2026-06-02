export const notificationStatuses = Object.freeze({
  UNREAD: "unread",
  READ: "read",
  ARCHIVED: "archived",
});

export const notificationActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  MARK_READ: "mark_read",
  ARCHIVE: "archive",
});

export const notificationWorkflow = Object.freeze({
  [notificationStatuses.UNREAD]: {
    status: notificationStatuses.UNREAD,
    owner: "RECIPIENT",
    nextAction: notificationActions.MARK_READ,
    transitions: {
      [notificationActions.UPDATE]: notificationStatuses.UNREAD,
      [notificationActions.MARK_READ]: notificationStatuses.READ,
      [notificationActions.ARCHIVE]: notificationStatuses.ARCHIVED,
    },
  },
  [notificationStatuses.READ]: {
    status: notificationStatuses.READ,
    owner: "RECIPIENT",
    nextAction: notificationActions.ARCHIVE,
    transitions: {
      [notificationActions.UPDATE]: notificationStatuses.READ,
      [notificationActions.ARCHIVE]: notificationStatuses.ARCHIVED,
    },
  },
  [notificationStatuses.ARCHIVED]: {
    status: notificationStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getNotificationState(status) {
  const state = notificationWorkflow[status];
  if (!state) throw new Error(`Unknown notification status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionNotificationState(status, action) {
  const state = notificationWorkflow[status];
  if (!state) throw new Error(`Unknown notification status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getNotificationState(nextStatus);
}

export function normalizeNotificationPayload(input) {
  return {
    title: String(input.title ?? "").trim(),
    body: String(input.body ?? "").trim(),
    channel: input.channel ?? "in_app",
    priority: input.priority ?? "normal",
    metadata: input.metadata ?? {},
  };
}
