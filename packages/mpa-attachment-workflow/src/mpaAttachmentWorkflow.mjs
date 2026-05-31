export const mpaAttachmentStatuses = Object.freeze({
  MATCHED: "matched",
  ATTACHED: "attached",
  MISSING_MPA: "missing_mpa",
  DETACHED: "detached",
});

export const mpaAttachmentActions = Object.freeze({
  AUTO_ATTACH: "auto_attach",
  MARK_MISSING: "mark_missing",
  DETACH: "detach",
  OVERRIDE_ATTACH: "override_attach",
});

export const mpaAttachmentWorkflow = Object.freeze({
  [mpaAttachmentStatuses.MATCHED]: {
    status: mpaAttachmentStatuses.MATCHED,
    owner: "SYSTEM",
    nextAction: mpaAttachmentActions.AUTO_ATTACH,
    transitions: {
      [mpaAttachmentActions.AUTO_ATTACH]: mpaAttachmentStatuses.ATTACHED,
      [mpaAttachmentActions.MARK_MISSING]: mpaAttachmentStatuses.MISSING_MPA,
    },
  },
  [mpaAttachmentStatuses.ATTACHED]: {
    status: mpaAttachmentStatuses.ATTACHED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [mpaAttachmentActions.DETACH]: mpaAttachmentStatuses.DETACHED,
      [mpaAttachmentActions.OVERRIDE_ATTACH]: mpaAttachmentStatuses.ATTACHED,
    },
  },
  [mpaAttachmentStatuses.MISSING_MPA]: {
    status: mpaAttachmentStatuses.MISSING_MPA,
    owner: "MANAGER",
    nextAction: mpaAttachmentActions.OVERRIDE_ATTACH,
    transitions: {
      [mpaAttachmentActions.OVERRIDE_ATTACH]: mpaAttachmentStatuses.ATTACHED,
    },
  },
  [mpaAttachmentStatuses.DETACHED]: {
    status: mpaAttachmentStatuses.DETACHED,
    owner: "MANAGER",
    nextAction: mpaAttachmentActions.OVERRIDE_ATTACH,
    transitions: {
      [mpaAttachmentActions.OVERRIDE_ATTACH]: mpaAttachmentStatuses.ATTACHED,
    },
  },
});

export function getMpaAttachmentState(status) {
  const state = mpaAttachmentWorkflow[status];
  if (!state) throw new Error(`Unknown MPA attachment status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionMpaAttachmentState(status, action) {
  const state = mpaAttachmentWorkflow[status];
  if (!state) throw new Error(`Unknown MPA attachment status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getMpaAttachmentState(nextStatus);
}
