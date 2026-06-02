export const formVersionStatuses = Object.freeze({
  DRAFT_EDIT: "draft_edit",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  PUBLISHED: "published",
  RETURNED: "returned",
  ARCHIVED: "archived",
});

export const formVersionActions = Object.freeze({
  CREATE_EDIT: "create_edit",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  PUBLISH: "publish",
  RETURN: "return",
  ARCHIVE: "archive",
  OVERRIDE_VISIBILITY: "override_visibility",
});

export const formVersionWorkflow = Object.freeze({
  [formVersionStatuses.DRAFT_EDIT]: {
    status: formVersionStatuses.DRAFT_EDIT,
    owner: "HR_ADMIN",
    nextAction: formVersionActions.SUBMIT,
    transitions: {
      [formVersionActions.UPDATE]: formVersionStatuses.DRAFT_EDIT,
      [formVersionActions.SUBMIT]: formVersionStatuses.SUBMITTED,
      [formVersionActions.ARCHIVE]: formVersionStatuses.ARCHIVED,
      [formVersionActions.OVERRIDE_VISIBILITY]: formVersionStatuses.DRAFT_EDIT,
    },
  },
  [formVersionStatuses.SUBMITTED]: {
    status: formVersionStatuses.SUBMITTED,
    owner: "HRBP",
    nextAction: formVersionActions.APPROVE,
    transitions: {
      [formVersionActions.APPROVE]: formVersionStatuses.APPROVED,
      [formVersionActions.RETURN]: formVersionStatuses.RETURNED,
      [formVersionActions.ARCHIVE]: formVersionStatuses.ARCHIVED,
      [formVersionActions.OVERRIDE_VISIBILITY]: formVersionStatuses.SUBMITTED,
    },
  },
  [formVersionStatuses.APPROVED]: {
    status: formVersionStatuses.APPROVED,
    owner: "HR_ADMIN",
    nextAction: formVersionActions.PUBLISH,
    transitions: {
      [formVersionActions.PUBLISH]: formVersionStatuses.PUBLISHED,
      [formVersionActions.RETURN]: formVersionStatuses.RETURNED,
      [formVersionActions.ARCHIVE]: formVersionStatuses.ARCHIVED,
      [formVersionActions.OVERRIDE_VISIBILITY]: formVersionStatuses.APPROVED,
    },
  },
  [formVersionStatuses.RETURNED]: {
    status: formVersionStatuses.RETURNED,
    owner: "HR_ADMIN",
    nextAction: formVersionActions.UPDATE,
    transitions: {
      [formVersionActions.UPDATE]: formVersionStatuses.DRAFT_EDIT,
      [formVersionActions.SUBMIT]: formVersionStatuses.SUBMITTED,
      [formVersionActions.ARCHIVE]: formVersionStatuses.ARCHIVED,
      [formVersionActions.OVERRIDE_VISIBILITY]: formVersionStatuses.RETURNED,
    },
  },
  [formVersionStatuses.PUBLISHED]: {
    status: formVersionStatuses.PUBLISHED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [formVersionActions.ARCHIVE]: formVersionStatuses.ARCHIVED,
      [formVersionActions.OVERRIDE_VISIBILITY]: formVersionStatuses.PUBLISHED,
    },
  },
  [formVersionStatuses.ARCHIVED]: {
    status: formVersionStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getFormVersionState(status) {
  const state = formVersionWorkflow[status];
  if (!state) throw new Error(`Unknown form version status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionFormVersionState(status, action) {
  const state = formVersionWorkflow[status];
  if (!state) throw new Error(`Unknown form version status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getFormVersionState(nextStatus);
}

export function summarizeFormSchema(schema) {
  const sections = Array.isArray(schema?.sections) ? schema.sections : [];
  const questionCount = sections.reduce((sum, section) => sum + (Array.isArray(section.questions) ? section.questions.length : 0), 0);
  return { sectionCount: sections.length, questionCount };
}
