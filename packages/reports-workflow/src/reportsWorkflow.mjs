export const reportStatuses = Object.freeze({
  DRAFT: "draft",
  GENERATED: "generated",
  SUBMITTED: "submitted",
  REVIEWED: "reviewed",
  RETURNED: "returned",
  VISIBILITY_APPROVED: "visibility_approved",
  EXPORTED: "exported",
  ARCHIVED: "archived",
});

export const reportActions = Object.freeze({
  CREATE: "create",
  GENERATE: "generate",
  SUBMIT: "submit",
  APPROVE: "approve",
  RETURN: "return",
  OVERRIDE_VISIBILITY: "override_visibility",
  EXPORT: "export",
  ARCHIVE: "archive",
});

export const reportWorkflow = Object.freeze({
  [reportStatuses.DRAFT]: {
    status: reportStatuses.DRAFT,
    owner: "HRBP",
    nextAction: reportActions.GENERATE,
    transitions: {
      [reportActions.GENERATE]: reportStatuses.GENERATED,
    },
  },
  [reportStatuses.GENERATED]: {
    status: reportStatuses.GENERATED,
    owner: "HRBP",
    nextAction: reportActions.SUBMIT,
    transitions: {
      [reportActions.GENERATE]: reportStatuses.GENERATED,
      [reportActions.SUBMIT]: reportStatuses.SUBMITTED,
      [reportActions.EXPORT]: reportStatuses.EXPORTED,
    },
  },
  [reportStatuses.SUBMITTED]: {
    status: reportStatuses.SUBMITTED,
    owner: "HR_ADMIN",
    nextAction: reportActions.APPROVE,
    transitions: {
      [reportActions.APPROVE]: reportStatuses.REVIEWED,
      [reportActions.RETURN]: reportStatuses.RETURNED,
    },
  },
  [reportStatuses.REVIEWED]: {
    status: reportStatuses.REVIEWED,
    owner: "HR_ADMIN",
    nextAction: reportActions.OVERRIDE_VISIBILITY,
    transitions: {
      [reportActions.OVERRIDE_VISIBILITY]: reportStatuses.VISIBILITY_APPROVED,
      [reportActions.EXPORT]: reportStatuses.EXPORTED,
      [reportActions.RETURN]: reportStatuses.RETURNED,
    },
  },
  [reportStatuses.RETURNED]: {
    status: reportStatuses.RETURNED,
    owner: "HRBP",
    nextAction: reportActions.GENERATE,
    transitions: {
      [reportActions.GENERATE]: reportStatuses.GENERATED,
      [reportActions.SUBMIT]: reportStatuses.SUBMITTED,
    },
  },
  [reportStatuses.VISIBILITY_APPROVED]: {
    status: reportStatuses.VISIBILITY_APPROVED,
    owner: "HRBP_HR_ADMIN",
    nextAction: reportActions.EXPORT,
    transitions: {
      [reportActions.EXPORT]: reportStatuses.EXPORTED,
      [reportActions.ARCHIVE]: reportStatuses.ARCHIVED,
    },
  },
  [reportStatuses.EXPORTED]: {
    status: reportStatuses.EXPORTED,
    owner: "HRBP_HR_ADMIN",
    nextAction: reportActions.ARCHIVE,
    transitions: {
      [reportActions.ARCHIVE]: reportStatuses.ARCHIVED,
      [reportActions.OVERRIDE_VISIBILITY]: reportStatuses.VISIBILITY_APPROVED,
    },
  },
  [reportStatuses.ARCHIVED]: {
    status: reportStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getReportState(status) {
  const state = reportWorkflow[status];
  if (!state) throw new Error(`Unknown report status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionReportState(status, action) {
  const state = reportWorkflow[status];
  if (!state) throw new Error(`Unknown report status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getReportState(nextStatus);
}

export function summarizeReportMetrics(input) {
  const activeEmployees = Number(input.activeEmployees ?? 0);
  const completedEvaluations = Number(input.completedEvaluations ?? 0);
  const totalEvaluations = Number(input.totalEvaluations ?? 0);
  const pipFlags = Number(input.pipFlags ?? 0);
  const promotionFlags = Number(input.promotionFlags ?? 0);
  const denominator = totalEvaluations > 0 ? totalEvaluations : 1;
  return {
    activeEmployees,
    totalEvaluations,
    completedEvaluations,
    completionRate: Number(((completedEvaluations / denominator) * 100).toFixed(2)),
    pipFlags,
    promotionFlags,
    riskRate: Number(((pipFlags / denominator) * 100).toFixed(2)),
    promotionRate: Number(((promotionFlags / denominator) * 100).toFixed(2)),
  };
}
