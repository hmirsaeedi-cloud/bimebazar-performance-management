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

export function buildTrendSeries(records, options = {}) {
  const interval = options.interval ?? "month";
  const buckets = new Map();
  for (const record of records ?? []) {
    if (!record?.date) continue;
    const bucket = interval === "quarter" ? quarterKey(record.date) : monthKey(record.date);
    const current = buckets.get(bucket) ?? { period: bucket, count: 0, scoreTotal: 0, scoreCount: 0, pipFlags: 0, promotionFlags: 0 };
    current.count += Number(record.count ?? 1);
    if (typeof record.score === "number") {
      current.scoreTotal += record.score;
      current.scoreCount += 1;
    }
    if (record.flagType === "pip") current.pipFlags += 1;
    if (record.flagType === "promotion") current.promotionFlags += 1;
    buckets.set(bucket, current);
  }
  return [...buckets.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((bucket) => ({
      period: bucket.period,
      count: bucket.count,
      averageScore: bucket.scoreCount ? Number((bucket.scoreTotal / bucket.scoreCount).toFixed(2)) : null,
      pipFlags: bucket.pipFlags,
      promotionFlags: bucket.promotionFlags,
    }));
}

export function compareCohorts(records, cohortKey = "businessUnit") {
  const cohorts = new Map();
  for (const record of records ?? []) {
    const key = String(record?.[cohortKey] ?? "Unassigned");
    const current = cohorts.get(key) ?? { cohort: key, employees: new Set(), evaluations: 0, completed: 0, scoreTotal: 0, scoreCount: 0, pipFlags: 0, promotionFlags: 0 };
    if (record.employeeId) current.employees.add(record.employeeId);
    if (record.kind === "evaluation") {
      current.evaluations += 1;
      if (record.status === "completed") current.completed += 1;
      if (typeof record.score === "number") {
        current.scoreTotal += record.score;
        current.scoreCount += 1;
      }
    }
    if (record.flagType === "pip") current.pipFlags += 1;
    if (record.flagType === "promotion") current.promotionFlags += 1;
    cohorts.set(key, current);
  }
  return [...cohorts.values()]
    .sort((a, b) => b.evaluations - a.evaluations || a.cohort.localeCompare(b.cohort))
    .map((cohort) => ({
      cohort: cohort.cohort,
      employees: cohort.employees.size,
      evaluations: cohort.evaluations,
      completionRate: Number(((cohort.completed / (cohort.evaluations || 1)) * 100).toFixed(2)),
      averageScore: cohort.scoreCount ? Number((cohort.scoreTotal / cohort.scoreCount).toFixed(2)) : null,
      pipFlags: cohort.pipFlags,
      promotionFlags: cohort.promotionFlags,
    }));
}

export function buildAdvancedAnalytics(records, options = {}) {
  const trends = buildTrendSeries(records, { interval: options.interval ?? "month" });
  const cohorts = compareCohorts(records, options.cohortKey ?? "businessUnit");
  const latest = trends.at(-1);
  const previous = trends.at(-2);
  const scoreDelta = latest?.averageScore != null && previous?.averageScore != null ? Number((latest.averageScore - previous.averageScore).toFixed(2)) : null;
  return {
    interval: options.interval ?? "month",
    cohortKey: options.cohortKey ?? "businessUnit",
    trends,
    cohorts,
    summary: {
      trendPeriods: trends.length,
      cohortCount: cohorts.length,
      latestAverageScore: latest?.averageScore ?? null,
      previousAverageScore: previous?.averageScore ?? null,
      scoreDelta,
      highestCompletionCohort: cohorts.reduce((best, cohort) => (cohort.completionRate > (best?.completionRate ?? -1) ? cohort : best), null),
    },
  };
}

function monthKey(date) {
  return String(date).slice(0, 7);
}

function quarterKey(date) {
  const [year, monthValue] = String(date).slice(0, 10).split("-");
  const quarter = Math.max(1, Math.ceil(Number(monthValue || 1) / 3));
  return `${year}-Q${quarter}`;
}
