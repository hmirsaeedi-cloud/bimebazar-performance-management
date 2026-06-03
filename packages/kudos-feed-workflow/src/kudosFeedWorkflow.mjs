export const kudosFeedStatuses = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  PUBLISHED: "published",
  RETURNED: "returned",
  VISIBILITY_CHANGED: "visibility_changed",
  ARCHIVED: "archived",
});

export const kudosFeedActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  PUBLISH: "publish",
  RETURN: "return",
  OVERRIDE_VISIBILITY: "override_visibility",
  ARCHIVE: "archive",
});

export const kudosFeedWorkflow = Object.freeze({
  [kudosFeedStatuses.DRAFT]: {
    status: kudosFeedStatuses.DRAFT,
    owner: "AUTHOR",
    nextAction: kudosFeedActions.SUBMIT,
    transitions: {
      [kudosFeedActions.UPDATE]: kudosFeedStatuses.DRAFT,
      [kudosFeedActions.SUBMIT]: kudosFeedStatuses.SUBMITTED,
      [kudosFeedActions.OVERRIDE_VISIBILITY]: kudosFeedStatuses.VISIBILITY_CHANGED,
      [kudosFeedActions.ARCHIVE]: kudosFeedStatuses.ARCHIVED,
    },
  },
  [kudosFeedStatuses.SUBMITTED]: {
    status: kudosFeedStatuses.SUBMITTED,
    owner: "HRBP",
    nextAction: kudosFeedActions.APPROVE,
    transitions: {
      [kudosFeedActions.APPROVE]: kudosFeedStatuses.APPROVED,
      [kudosFeedActions.RETURN]: kudosFeedStatuses.RETURNED,
      [kudosFeedActions.OVERRIDE_VISIBILITY]: kudosFeedStatuses.VISIBILITY_CHANGED,
      [kudosFeedActions.ARCHIVE]: kudosFeedStatuses.ARCHIVED,
    },
  },
  [kudosFeedStatuses.APPROVED]: {
    status: kudosFeedStatuses.APPROVED,
    owner: "HRBP",
    nextAction: kudosFeedActions.PUBLISH,
    transitions: {
      [kudosFeedActions.PUBLISH]: kudosFeedStatuses.PUBLISHED,
      [kudosFeedActions.RETURN]: kudosFeedStatuses.RETURNED,
      [kudosFeedActions.OVERRIDE_VISIBILITY]: kudosFeedStatuses.VISIBILITY_CHANGED,
      [kudosFeedActions.ARCHIVE]: kudosFeedStatuses.ARCHIVED,
    },
  },
  [kudosFeedStatuses.PUBLISHED]: {
    status: kudosFeedStatuses.PUBLISHED,
    owner: "FEED",
    nextAction: null,
    transitions: {
      [kudosFeedActions.OVERRIDE_VISIBILITY]: kudosFeedStatuses.VISIBILITY_CHANGED,
      [kudosFeedActions.ARCHIVE]: kudosFeedStatuses.ARCHIVED,
    },
  },
  [kudosFeedStatuses.RETURNED]: {
    status: kudosFeedStatuses.RETURNED,
    owner: "AUTHOR",
    nextAction: kudosFeedActions.UPDATE,
    transitions: {
      [kudosFeedActions.UPDATE]: kudosFeedStatuses.DRAFT,
      [kudosFeedActions.SUBMIT]: kudosFeedStatuses.SUBMITTED,
      [kudosFeedActions.ARCHIVE]: kudosFeedStatuses.ARCHIVED,
    },
  },
  [kudosFeedStatuses.VISIBILITY_CHANGED]: {
    status: kudosFeedStatuses.VISIBILITY_CHANGED,
    owner: "HRBP",
    nextAction: kudosFeedActions.UPDATE,
    transitions: {
      [kudosFeedActions.UPDATE]: kudosFeedStatuses.DRAFT,
      [kudosFeedActions.SUBMIT]: kudosFeedStatuses.SUBMITTED,
      [kudosFeedActions.ARCHIVE]: kudosFeedStatuses.ARCHIVED,
    },
  },
  [kudosFeedStatuses.ARCHIVED]: {
    status: kudosFeedStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getKudosFeedState(status) {
  const state = kudosFeedWorkflow[status];
  if (!state) throw new Error(`Unknown kudos feed status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionKudosFeedState(status, action) {
  const state = kudosFeedWorkflow[status];
  if (!state) throw new Error(`Unknown kudos feed status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getKudosFeedState(nextStatus);
}

export function normalizeKudosMessage(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function assertKudosRecipientsActive(recipients) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("Kudos feed posts require at least one active recipient");
  }
  return true;
}
