export const emailNotificationStatuses = Object.freeze({
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  QUEUED: "queued",
  SENT: "sent",
  FAILED: "failed",
  RETURNED: "returned",
  CANCELLED: "cancelled",
});

export const emailNotificationActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  QUEUE: "queue",
  MARK_SENT: "mark_sent",
  FAIL: "fail",
  RETURN: "return",
  CANCEL: "cancel",
  OVERRIDE_VISIBILITY: "override_visibility",
});

export const emailNotificationWorkflow = Object.freeze({
  [emailNotificationStatuses.DRAFT]: {
    status: emailNotificationStatuses.DRAFT,
    owner: "HR_ADMIN",
    nextAction: emailNotificationActions.SUBMIT,
    recipientVisible: false,
    transitions: {
      [emailNotificationActions.UPDATE]: emailNotificationStatuses.DRAFT,
      [emailNotificationActions.SUBMIT]: emailNotificationStatuses.PENDING_APPROVAL,
      [emailNotificationActions.CANCEL]: emailNotificationStatuses.CANCELLED,
      [emailNotificationActions.OVERRIDE_VISIBILITY]: emailNotificationStatuses.DRAFT,
    },
  },
  [emailNotificationStatuses.PENDING_APPROVAL]: {
    status: emailNotificationStatuses.PENDING_APPROVAL,
    owner: "HRBP",
    nextAction: emailNotificationActions.APPROVE,
    recipientVisible: false,
    transitions: {
      [emailNotificationActions.APPROVE]: emailNotificationStatuses.APPROVED,
      [emailNotificationActions.RETURN]: emailNotificationStatuses.RETURNED,
      [emailNotificationActions.CANCEL]: emailNotificationStatuses.CANCELLED,
      [emailNotificationActions.OVERRIDE_VISIBILITY]: emailNotificationStatuses.PENDING_APPROVAL,
    },
  },
  [emailNotificationStatuses.APPROVED]: {
    status: emailNotificationStatuses.APPROVED,
    owner: "SYSTEM",
    nextAction: emailNotificationActions.QUEUE,
    recipientVisible: false,
    transitions: {
      [emailNotificationActions.QUEUE]: emailNotificationStatuses.QUEUED,
      [emailNotificationActions.RETURN]: emailNotificationStatuses.RETURNED,
      [emailNotificationActions.CANCEL]: emailNotificationStatuses.CANCELLED,
      [emailNotificationActions.OVERRIDE_VISIBILITY]: emailNotificationStatuses.APPROVED,
    },
  },
  [emailNotificationStatuses.QUEUED]: {
    status: emailNotificationStatuses.QUEUED,
    owner: "SYSTEM",
    nextAction: emailNotificationActions.MARK_SENT,
    recipientVisible: false,
    transitions: {
      [emailNotificationActions.MARK_SENT]: emailNotificationStatuses.SENT,
      [emailNotificationActions.FAIL]: emailNotificationStatuses.FAILED,
      [emailNotificationActions.CANCEL]: emailNotificationStatuses.CANCELLED,
      [emailNotificationActions.OVERRIDE_VISIBILITY]: emailNotificationStatuses.QUEUED,
    },
  },
  [emailNotificationStatuses.SENT]: {
    status: emailNotificationStatuses.SENT,
    owner: "RECIPIENT",
    nextAction: null,
    recipientVisible: true,
    transitions: {
      [emailNotificationActions.OVERRIDE_VISIBILITY]: emailNotificationStatuses.SENT,
    },
  },
  [emailNotificationStatuses.FAILED]: {
    status: emailNotificationStatuses.FAILED,
    owner: "HR_ADMIN",
    nextAction: emailNotificationActions.UPDATE,
    recipientVisible: false,
    transitions: {
      [emailNotificationActions.UPDATE]: emailNotificationStatuses.DRAFT,
      [emailNotificationActions.CANCEL]: emailNotificationStatuses.CANCELLED,
      [emailNotificationActions.OVERRIDE_VISIBILITY]: emailNotificationStatuses.FAILED,
    },
  },
  [emailNotificationStatuses.RETURNED]: {
    status: emailNotificationStatuses.RETURNED,
    owner: "HR_ADMIN",
    nextAction: emailNotificationActions.UPDATE,
    recipientVisible: false,
    transitions: {
      [emailNotificationActions.UPDATE]: emailNotificationStatuses.DRAFT,
      [emailNotificationActions.SUBMIT]: emailNotificationStatuses.PENDING_APPROVAL,
      [emailNotificationActions.CANCEL]: emailNotificationStatuses.CANCELLED,
      [emailNotificationActions.OVERRIDE_VISIBILITY]: emailNotificationStatuses.RETURNED,
    },
  },
  [emailNotificationStatuses.CANCELLED]: {
    status: emailNotificationStatuses.CANCELLED,
    owner: "SYSTEM",
    nextAction: null,
    recipientVisible: false,
    transitions: {},
  },
});

export function getEmailNotificationState(status) {
  const state = emailNotificationWorkflow[status];
  if (!state) throw new Error(`Unknown email notification status: ${status}`);
  return {
    status: state.status,
    owner: state.owner,
    nextAction: state.nextAction,
    recipientVisible: state.recipientVisible,
  };
}

export function transitionEmailNotificationState(status, action) {
  const state = emailNotificationWorkflow[status];
  if (!state) throw new Error(`Unknown email notification status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getEmailNotificationState(nextStatus);
}

export function normalizeEmailNotificationPayload(input) {
  return {
    toEmail: String(input.toEmail ?? "").trim().toLowerCase(),
    subject: String(input.subject ?? "").trim(),
    bodyText: String(input.bodyText ?? "").trim(),
    bodyHtml: String(input.bodyHtml ?? "").trim(),
  };
}
