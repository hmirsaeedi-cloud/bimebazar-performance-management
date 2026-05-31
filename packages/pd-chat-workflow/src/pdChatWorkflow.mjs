export const pdChatStatuses = Object.freeze({
  DRAFT: "draft",
  ACTIVE: "active",
  SUBMITTED: "submitted",
  MANAGER_REVIEWED: "manager_reviewed",
  RETURNED: "returned",
  VISIBILITY_APPROVED: "visibility_approved",
  ARCHIVED: "archived",
});

export const pdChatActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  RETURN: "return",
  OVERRIDE_VISIBILITY: "override_visibility",
  ARCHIVE: "archive",
});

export const pdChatWorkflow = Object.freeze({
  [pdChatStatuses.DRAFT]: {
    status: pdChatStatuses.DRAFT,
    owner: "EMPLOYEE",
    nextAction: pdChatActions.UPDATE,
    transitions: {
      [pdChatActions.UPDATE]: pdChatStatuses.ACTIVE,
      [pdChatActions.SUBMIT]: pdChatStatuses.SUBMITTED,
    },
  },
  [pdChatStatuses.ACTIVE]: {
    status: pdChatStatuses.ACTIVE,
    owner: "EMPLOYEE_MANAGER",
    nextAction: pdChatActions.SUBMIT,
    transitions: {
      [pdChatActions.UPDATE]: pdChatStatuses.ACTIVE,
      [pdChatActions.SUBMIT]: pdChatStatuses.SUBMITTED,
    },
  },
  [pdChatStatuses.SUBMITTED]: {
    status: pdChatStatuses.SUBMITTED,
    owner: "MANAGER",
    nextAction: pdChatActions.APPROVE,
    transitions: {
      [pdChatActions.APPROVE]: pdChatStatuses.MANAGER_REVIEWED,
      [pdChatActions.RETURN]: pdChatStatuses.RETURNED,
    },
  },
  [pdChatStatuses.MANAGER_REVIEWED]: {
    status: pdChatStatuses.MANAGER_REVIEWED,
    owner: "MANAGER",
    nextAction: pdChatActions.OVERRIDE_VISIBILITY,
    transitions: {
      [pdChatActions.RETURN]: pdChatStatuses.RETURNED,
      [pdChatActions.OVERRIDE_VISIBILITY]: pdChatStatuses.VISIBILITY_APPROVED,
      [pdChatActions.ARCHIVE]: pdChatStatuses.ARCHIVED,
    },
  },
  [pdChatStatuses.RETURNED]: {
    status: pdChatStatuses.RETURNED,
    owner: "EMPLOYEE",
    nextAction: pdChatActions.UPDATE,
    transitions: {
      [pdChatActions.UPDATE]: pdChatStatuses.ACTIVE,
      [pdChatActions.SUBMIT]: pdChatStatuses.SUBMITTED,
    },
  },
  [pdChatStatuses.VISIBILITY_APPROVED]: {
    status: pdChatStatuses.VISIBILITY_APPROVED,
    owner: "EMPLOYEE_MANAGER",
    nextAction: pdChatActions.ARCHIVE,
    transitions: {
      [pdChatActions.ARCHIVE]: pdChatStatuses.ARCHIVED,
    },
  },
  [pdChatStatuses.ARCHIVED]: {
    status: pdChatStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getPdChatState(status) {
  const state = pdChatWorkflow[status];
  if (!state) throw new Error(`Unknown PD Chat status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionPdChatState(status, action) {
  const state = pdChatWorkflow[status];
  if (!state) throw new Error(`Unknown PD Chat status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getPdChatState(nextStatus);
}

export function normalizeChatMessage(input) {
  return {
    id: input.id,
    authorId: input.authorId,
    authorRole: input.authorRole,
    body: String(input.body ?? "").trim(),
    createdAt: input.createdAt,
    editedAt: input.editedAt ?? null,
    visibility: input.visibility ?? "employee_manager",
  };
}

export function appendChatMessage(messages, message) {
  const normalized = normalizeChatMessage(message);
  if (!normalized.body) throw new Error("PD Chat message body is required");
  return [...(Array.isArray(messages) ? messages : []), normalized];
}
