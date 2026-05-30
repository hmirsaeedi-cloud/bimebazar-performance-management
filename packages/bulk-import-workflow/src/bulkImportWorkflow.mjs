export const bulkImportStatuses = Object.freeze({
  UPLOADED: "uploaded",
  VALIDATING: "validating",
  VALIDATED: "validated",
  FAILED_VALIDATION: "failed_validation",
  PROCESSING: "processing",
  COMPLETED: "completed",
  COMPLETED_WITH_ERRORS: "completed_with_errors",
  CANCELLED: "cancelled",
});

export const bulkImportActions = Object.freeze({
  VALIDATE: "validate",
  FIX_ROWS: "fix_rows",
  PROCESS: "process",
  MARK_COMPLETE: "mark_complete",
  MARK_COMPLETE_WITH_ERRORS: "mark_complete_with_errors",
  CANCEL: "cancel",
});

export const bulkImportWorkflow = Object.freeze({
  [bulkImportStatuses.UPLOADED]: {
    status: bulkImportStatuses.UPLOADED,
    owner: "HR_ADMIN",
    nextAction: bulkImportActions.VALIDATE,
    transitions: {
      [bulkImportActions.VALIDATE]: bulkImportStatuses.VALIDATING,
      [bulkImportActions.CANCEL]: bulkImportStatuses.CANCELLED,
    },
  },
  [bulkImportStatuses.VALIDATING]: {
    status: bulkImportStatuses.VALIDATING,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [bulkImportActions.MARK_COMPLETE]: bulkImportStatuses.VALIDATED,
      [bulkImportActions.MARK_COMPLETE_WITH_ERRORS]: bulkImportStatuses.FAILED_VALIDATION,
      [bulkImportActions.CANCEL]: bulkImportStatuses.CANCELLED,
    },
  },
  [bulkImportStatuses.VALIDATED]: {
    status: bulkImportStatuses.VALIDATED,
    owner: "HR_ADMIN",
    nextAction: bulkImportActions.PROCESS,
    transitions: {
      [bulkImportActions.PROCESS]: bulkImportStatuses.PROCESSING,
      [bulkImportActions.CANCEL]: bulkImportStatuses.CANCELLED,
    },
  },
  [bulkImportStatuses.FAILED_VALIDATION]: {
    status: bulkImportStatuses.FAILED_VALIDATION,
    owner: "HR_ADMIN",
    nextAction: bulkImportActions.FIX_ROWS,
    transitions: {
      [bulkImportActions.FIX_ROWS]: bulkImportStatuses.UPLOADED,
      [bulkImportActions.CANCEL]: bulkImportStatuses.CANCELLED,
    },
  },
  [bulkImportStatuses.PROCESSING]: {
    status: bulkImportStatuses.PROCESSING,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [bulkImportActions.MARK_COMPLETE]: bulkImportStatuses.COMPLETED,
      [bulkImportActions.MARK_COMPLETE_WITH_ERRORS]: bulkImportStatuses.COMPLETED_WITH_ERRORS,
    },
  },
  [bulkImportStatuses.COMPLETED]: {
    status: bulkImportStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
  [bulkImportStatuses.COMPLETED_WITH_ERRORS]: {
    status: bulkImportStatuses.COMPLETED_WITH_ERRORS,
    owner: "HR_ADMIN",
    nextAction: bulkImportActions.FIX_ROWS,
    transitions: {
      [bulkImportActions.FIX_ROWS]: bulkImportStatuses.UPLOADED,
    },
  },
  [bulkImportStatuses.CANCELLED]: {
    status: bulkImportStatuses.CANCELLED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getBulkImportState(status) {
  const state = bulkImportWorkflow[status];
  if (!state) throw new Error(`Unknown bulk import status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionBulkImportState(status, action) {
  const state = bulkImportWorkflow[status];
  if (!state) throw new Error(`Unknown bulk import status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getBulkImportState(nextStatus);
}
