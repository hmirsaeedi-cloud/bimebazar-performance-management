export const hrisIntegrationStatuses = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  ACTIVE: "active",
  SYNC_RUNNING: "sync_running",
  SYNC_COMPLETED: "sync_completed",
  SYNC_FAILED: "sync_failed",
  RETURNED: "returned",
  VISIBILITY_CHANGED: "visibility_changed",
  ARCHIVED: "archived",
});

export const hrisIntegrationActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  ACTIVATE: "activate",
  START_SYNC: "start_sync",
  COMPLETE_SYNC: "complete_sync",
  FAIL_SYNC: "fail_sync",
  RETURN: "return",
  OVERRIDE_VISIBILITY: "override_visibility",
  ARCHIVE: "archive",
});

export const hrisIntegrationWorkflow = Object.freeze({
  [hrisIntegrationStatuses.DRAFT]: {
    status: hrisIntegrationStatuses.DRAFT,
    owner: "HR_ADMIN",
    nextAction: hrisIntegrationActions.SUBMIT,
    transitions: {
      [hrisIntegrationActions.UPDATE]: hrisIntegrationStatuses.DRAFT,
      [hrisIntegrationActions.SUBMIT]: hrisIntegrationStatuses.SUBMITTED,
      [hrisIntegrationActions.OVERRIDE_VISIBILITY]: hrisIntegrationStatuses.VISIBILITY_CHANGED,
      [hrisIntegrationActions.ARCHIVE]: hrisIntegrationStatuses.ARCHIVED,
    },
  },
  [hrisIntegrationStatuses.SUBMITTED]: {
    status: hrisIntegrationStatuses.SUBMITTED,
    owner: "HRBP",
    nextAction: hrisIntegrationActions.APPROVE,
    transitions: {
      [hrisIntegrationActions.APPROVE]: hrisIntegrationStatuses.APPROVED,
      [hrisIntegrationActions.RETURN]: hrisIntegrationStatuses.RETURNED,
      [hrisIntegrationActions.OVERRIDE_VISIBILITY]: hrisIntegrationStatuses.VISIBILITY_CHANGED,
      [hrisIntegrationActions.ARCHIVE]: hrisIntegrationStatuses.ARCHIVED,
    },
  },
  [hrisIntegrationStatuses.APPROVED]: {
    status: hrisIntegrationStatuses.APPROVED,
    owner: "HR_ADMIN",
    nextAction: hrisIntegrationActions.ACTIVATE,
    transitions: {
      [hrisIntegrationActions.ACTIVATE]: hrisIntegrationStatuses.ACTIVE,
      [hrisIntegrationActions.RETURN]: hrisIntegrationStatuses.RETURNED,
      [hrisIntegrationActions.OVERRIDE_VISIBILITY]: hrisIntegrationStatuses.VISIBILITY_CHANGED,
      [hrisIntegrationActions.ARCHIVE]: hrisIntegrationStatuses.ARCHIVED,
    },
  },
  [hrisIntegrationStatuses.ACTIVE]: {
    status: hrisIntegrationStatuses.ACTIVE,
    owner: "SYSTEM",
    nextAction: hrisIntegrationActions.START_SYNC,
    transitions: {
      [hrisIntegrationActions.UPDATE]: hrisIntegrationStatuses.ACTIVE,
      [hrisIntegrationActions.START_SYNC]: hrisIntegrationStatuses.SYNC_RUNNING,
      [hrisIntegrationActions.OVERRIDE_VISIBILITY]: hrisIntegrationStatuses.VISIBILITY_CHANGED,
      [hrisIntegrationActions.ARCHIVE]: hrisIntegrationStatuses.ARCHIVED,
    },
  },
  [hrisIntegrationStatuses.SYNC_RUNNING]: {
    status: hrisIntegrationStatuses.SYNC_RUNNING,
    owner: "SYSTEM",
    nextAction: hrisIntegrationActions.COMPLETE_SYNC,
    transitions: {
      [hrisIntegrationActions.COMPLETE_SYNC]: hrisIntegrationStatuses.SYNC_COMPLETED,
      [hrisIntegrationActions.FAIL_SYNC]: hrisIntegrationStatuses.SYNC_FAILED,
    },
  },
  [hrisIntegrationStatuses.SYNC_COMPLETED]: {
    status: hrisIntegrationStatuses.SYNC_COMPLETED,
    owner: "SYSTEM",
    nextAction: hrisIntegrationActions.START_SYNC,
    transitions: {
      [hrisIntegrationActions.START_SYNC]: hrisIntegrationStatuses.SYNC_RUNNING,
      [hrisIntegrationActions.OVERRIDE_VISIBILITY]: hrisIntegrationStatuses.VISIBILITY_CHANGED,
      [hrisIntegrationActions.ARCHIVE]: hrisIntegrationStatuses.ARCHIVED,
    },
  },
  [hrisIntegrationStatuses.SYNC_FAILED]: {
    status: hrisIntegrationStatuses.SYNC_FAILED,
    owner: "HR_ADMIN",
    nextAction: hrisIntegrationActions.UPDATE,
    transitions: {
      [hrisIntegrationActions.UPDATE]: hrisIntegrationStatuses.ACTIVE,
      [hrisIntegrationActions.START_SYNC]: hrisIntegrationStatuses.SYNC_RUNNING,
      [hrisIntegrationActions.RETURN]: hrisIntegrationStatuses.RETURNED,
      [hrisIntegrationActions.ARCHIVE]: hrisIntegrationStatuses.ARCHIVED,
    },
  },
  [hrisIntegrationStatuses.RETURNED]: {
    status: hrisIntegrationStatuses.RETURNED,
    owner: "HR_ADMIN",
    nextAction: hrisIntegrationActions.UPDATE,
    transitions: {
      [hrisIntegrationActions.UPDATE]: hrisIntegrationStatuses.DRAFT,
      [hrisIntegrationActions.SUBMIT]: hrisIntegrationStatuses.SUBMITTED,
      [hrisIntegrationActions.ARCHIVE]: hrisIntegrationStatuses.ARCHIVED,
    },
  },
  [hrisIntegrationStatuses.VISIBILITY_CHANGED]: {
    status: hrisIntegrationStatuses.VISIBILITY_CHANGED,
    owner: "HR_ADMIN",
    nextAction: hrisIntegrationActions.UPDATE,
    transitions: {
      [hrisIntegrationActions.UPDATE]: hrisIntegrationStatuses.DRAFT,
      [hrisIntegrationActions.SUBMIT]: hrisIntegrationStatuses.SUBMITTED,
      [hrisIntegrationActions.ARCHIVE]: hrisIntegrationStatuses.ARCHIVED,
    },
  },
  [hrisIntegrationStatuses.ARCHIVED]: {
    status: hrisIntegrationStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getHrisIntegrationState(status) {
  const state = hrisIntegrationWorkflow[status];
  if (!state) throw new Error(`Unknown HRIS integration status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionHrisIntegrationState(status, action) {
  const state = hrisIntegrationWorkflow[status];
  if (!state) throw new Error(`Unknown HRIS integration status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getHrisIntegrationState(nextStatus);
}

export function buildHrisSyncPreview(records = []) {
  const normalized = records.map((record) => ({
    externalEmployeeId: String(record.externalEmployeeId ?? record.employee_id ?? ""),
    email: String(record.email ?? "").toLowerCase(),
    fullNameEnglish: record.fullNameEnglish ?? record.full_name_english ?? null,
    managerExternalId: record.managerExternalId ?? record.manager_external_id ?? null,
    status: record.status ?? "active",
  }));
  const missingEmail = normalized.filter((record) => !record.email).length;
  const missingExternalId = normalized.filter((record) => !record.externalEmployeeId).length;
  return {
    totalRecords: normalized.length,
    validRecords: normalized.length - missingEmail - missingExternalId,
    missingEmail,
    missingExternalId,
    sample: normalized.slice(0, 5),
  };
}
