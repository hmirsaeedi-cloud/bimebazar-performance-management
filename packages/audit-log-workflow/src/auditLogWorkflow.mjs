export const auditExportStatuses = Object.freeze({
  REQUESTED: "requested",
  GENERATED: "generated",
  VERIFIED: "verified",
  EXPIRED: "expired",
});

export const auditExportActions = Object.freeze({
  GENERATE: "generate",
  VERIFY: "verify",
  EXPIRE: "expire",
});

export const auditExportWorkflow = Object.freeze({
  [auditExportStatuses.REQUESTED]: {
    status: auditExportStatuses.REQUESTED,
    owner: "HR_ADMIN",
    nextAction: auditExportActions.GENERATE,
    transitions: {
      [auditExportActions.GENERATE]: auditExportStatuses.GENERATED,
      [auditExportActions.EXPIRE]: auditExportStatuses.EXPIRED,
    },
  },
  [auditExportStatuses.GENERATED]: {
    status: auditExportStatuses.GENERATED,
    owner: "HR_ADMIN",
    nextAction: auditExportActions.VERIFY,
    transitions: {
      [auditExportActions.VERIFY]: auditExportStatuses.VERIFIED,
      [auditExportActions.EXPIRE]: auditExportStatuses.EXPIRED,
    },
  },
  [auditExportStatuses.VERIFIED]: {
    status: auditExportStatuses.VERIFIED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
  [auditExportStatuses.EXPIRED]: {
    status: auditExportStatuses.EXPIRED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getAuditExportState(status) {
  const state = auditExportWorkflow[status];
  if (!state) throw new Error(`Unknown audit export status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionAuditExportState(status, action) {
  const state = auditExportWorkflow[status];
  if (!state) throw new Error(`Unknown audit export status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getAuditExportState(nextStatus);
}

export function auditEventFingerprint(event) {
  return [
    event.id,
    event.actor_user_id ?? "",
    event.target_user_id ?? "",
    event.action,
    event.entity_type,
    event.entity_id ?? "",
    event.from_status ?? "",
    event.to_status ?? "",
    event.reason ?? "",
    JSON.stringify(event.metadata ?? {}),
    event.created_at,
  ].join("|");
}

export function verifyAuditHashChain(events) {
  let previousHash = null;
  for (const event of events) {
    if (event.prev_event_hash !== previousHash) return false;
    if (!event.event_hash) return false;
    previousHash = event.event_hash;
  }
  return true;
}
