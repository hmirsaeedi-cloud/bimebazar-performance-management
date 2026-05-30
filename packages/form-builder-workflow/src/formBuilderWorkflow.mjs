export const formBuilderStatuses = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
});

export const formBuilderActions = Object.freeze({
  UPDATE_DRAFT: "update_draft",
  PUBLISH: "publish",
  ARCHIVE: "archive",
  RETURN_TO_DRAFT: "return_to_draft",
});

export const formBuilderWorkflow = Object.freeze({
  [formBuilderStatuses.DRAFT]: {
    status: formBuilderStatuses.DRAFT,
    owner: "HR_ADMIN",
    nextAction: formBuilderActions.PUBLISH,
    transitions: {
      [formBuilderActions.UPDATE_DRAFT]: formBuilderStatuses.DRAFT,
      [formBuilderActions.PUBLISH]: formBuilderStatuses.PUBLISHED,
      [formBuilderActions.ARCHIVE]: formBuilderStatuses.ARCHIVED,
    },
  },
  [formBuilderStatuses.PUBLISHED]: {
    status: formBuilderStatuses.PUBLISHED,
    owner: "HRBP",
    nextAction: formBuilderActions.RETURN_TO_DRAFT,
    transitions: {
      [formBuilderActions.RETURN_TO_DRAFT]: formBuilderStatuses.DRAFT,
      [formBuilderActions.ARCHIVE]: formBuilderStatuses.ARCHIVED,
    },
  },
  [formBuilderStatuses.ARCHIVED]: {
    status: formBuilderStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getFormBuilderState(status) {
  const state = formBuilderWorkflow[status];
  if (!state) throw new Error(`Unknown form builder status: ${status}`);
  return {
    status: state.status,
    owner: state.owner,
    nextAction: state.nextAction,
  };
}

export function transitionFormBuilderState(status, action) {
  const state = formBuilderWorkflow[status];
  if (!state) throw new Error(`Unknown form builder status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) {
    throw new Error(`Action ${action} is not allowed from ${status}`);
  }
  return getFormBuilderState(nextStatus);
}
