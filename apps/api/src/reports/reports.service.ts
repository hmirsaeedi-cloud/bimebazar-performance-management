import {
  buildAdvancedAnalytics,
  getReportState,
  reportActions,
  reportStatuses,
  summarizeReportMetrics,
  transitionReportState,
} from "@bimebazar/reports-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyReportChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const reportSelect = `
  id,report_key,title,period_start,period_end,business_unit_id,status,owner_role,next_action,filters,metrics,insights,
  export_format,exported_at,submitted_at,reviewed_at,returned_at,visibility_changed_at,archived_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

const advancedAnalyticsSelect = `
  id,report_key,title,period_start,period_end,cohort_key,interval,status,owner_role,next_action,filters,trends,cohorts,summary,insights,
  export_format,exported_at,submitted_at,reviewed_at,returned_at,visibility_changed_at,archived_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

export async function listReports(input: { status?: string; reportKey?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("hrbp_report_snapshots").select(reportSelect).order("updated_at", { ascending: false });
  if (input.status) query = query.eq("status", input.status);
  if (input.reportKey) query = query.eq("report_key", input.reportKey);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getReport(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("hrbp_report_snapshots").select(reportSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createReport(input: {
  actor: AuthUser;
  title: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  businessUnitId?: string | null;
  filters: Record<string, unknown>;
}) {
  const state = getReportState(reportStatuses.DRAFT);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("hrbp_report_snapshots")
    .insert({
      title: input.title,
      period_start: input.periodStart ?? null,
      period_end: input.periodEnd ?? null,
      business_unit_id: input.businessUnitId ?? null,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      filters: input.filters,
      metrics: {},
      insights: [],
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(reportSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditReport(input.actor, data, "reports.created", null, state);
  await notifyReportChanged(toReportNotification(data, "created"));
  return data;
}

export async function generateReport(input: { actor: AuthUser; id: string; filters: Record<string, unknown> }) {
  const current = await getReport(input.id);
  const state = transitionReportState(current.status, reportActions.GENERATE);
  const aggregate = await calculateReportAggregate({
    filters: { ...(current.filters ?? {}), ...input.filters },
    periodStart: current.period_start,
    periodEnd: current.period_end,
  });
  const insights = buildInsights(aggregate);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("hrbp_report_snapshots")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      filters: { ...(current.filters ?? {}), ...input.filters },
      metrics: aggregate,
      insights,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(reportSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditReport(input.actor, data, "reports.generated", current.status, state, { metricKeys: Object.keys(aggregate) });
  await notifyReportChanged(toReportNotification(data, "generated"));
  return data;
}

export async function submitReport(input: { actor: AuthUser; id: string }) {
  return moveReport(input.actor, input.id, reportActions.SUBMIT, "reports.submitted", "submitted", { submitted_at: new Date().toISOString() });
}

export async function approveReport(input: { actor: AuthUser; id: string }) {
  return moveReport(input.actor, input.id, reportActions.APPROVE, "reports.approved", "approved", { reviewed_at: new Date().toISOString() });
}

export async function returnReport(input: { actor: AuthUser; id: string; reason: string }) {
  return moveReport(input.actor, input.id, reportActions.RETURN, "reports.returned", "returned", {
    reason: input.reason,
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
  });
}

export async function updateReportVisibility(input: { actor: AuthUser; id: string; insights: string[] }) {
  return moveReport(input.actor, input.id, reportActions.OVERRIDE_VISIBILITY, "reports.visibility_changed", "visibility_changed", {
    insights: input.insights,
    visibility_changed_at: new Date().toISOString(),
  });
}

export async function exportReport(input: { actor: AuthUser; id: string; exportFormat: "csv" | "xlsx" | "pdf" | "json" }) {
  return moveReport(input.actor, input.id, reportActions.EXPORT, "reports.exported", "exported", {
    export_format: input.exportFormat,
    exported_at: new Date().toISOString(),
  });
}

export async function archiveReport(input: { actor: AuthUser; id: string }) {
  return moveReport(input.actor, input.id, reportActions.ARCHIVE, "reports.archived", "archived", { archived_at: new Date().toISOString() });
}

export async function listAdvancedAnalytics(input: { status?: string; cohortKey?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("advanced_analytics_snapshots").select(advancedAnalyticsSelect).order("updated_at", { ascending: false });
  if (input.status) query = query.eq("status", input.status);
  if (input.cohortKey) query = query.eq("cohort_key", input.cohortKey);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAdvancedAnalytics(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("advanced_analytics_snapshots").select(advancedAnalyticsSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createAdvancedAnalytics(input: {
  actor: AuthUser;
  title: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  cohortKey: "businessUnit" | "role" | "manager";
  interval: "month" | "quarter";
  filters: Record<string, unknown>;
}) {
  const state = getReportState(reportStatuses.DRAFT);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("advanced_analytics_snapshots")
    .insert({
      report_key: "advanced_trends_cohorts",
      title: input.title,
      period_start: input.periodStart ?? null,
      period_end: input.periodEnd ?? null,
      cohort_key: input.cohortKey,
      interval: input.interval,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      filters: input.filters,
      trends: [],
      cohorts: [],
      summary: {},
      insights: [],
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(advancedAnalyticsSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditAdvancedAnalytics(input.actor, data, "reports.advanced.created", null, state);
  await notifyReportChanged(toReportNotification(data, "created"));
  return data;
}

export async function generateAdvancedAnalytics(input: {
  actor: AuthUser;
  id: string;
  cohortKey?: "businessUnit" | "role" | "manager";
  interval?: "month" | "quarter";
  filters: Record<string, unknown>;
}) {
  const current = await getAdvancedAnalytics(input.id);
  const state = transitionReportState(current.status, reportActions.GENERATE);
  const filters = { ...(current.filters ?? {}), ...input.filters };
  const cohortKey = input.cohortKey ?? current.cohort_key ?? "businessUnit";
  const interval = input.interval ?? current.interval ?? "month";
  const analytics = await calculateAdvancedAnalytics({
    periodStart: current.period_start,
    periodEnd: current.period_end,
    cohortKey,
    interval,
    filters,
  });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("advanced_analytics_snapshots")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      filters,
      cohort_key: cohortKey,
      interval,
      trends: analytics.trends,
      cohorts: analytics.cohorts,
      summary: analytics.summary,
      insights: buildAdvancedInsights(analytics),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(advancedAnalyticsSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditAdvancedAnalytics(input.actor, data, "reports.advanced.generated", current.status, state, {
    trendPeriods: analytics.trends.length,
    cohorts: analytics.cohorts.length,
  });
  await notifyReportChanged(toReportNotification(data, "generated"));
  return data;
}

export async function submitAdvancedAnalytics(input: { actor: AuthUser; id: string }) {
  return moveAdvancedAnalytics(input.actor, input.id, reportActions.SUBMIT, "reports.advanced.submitted", "submitted", { submitted_at: new Date().toISOString() });
}

export async function approveAdvancedAnalytics(input: { actor: AuthUser; id: string }) {
  return moveAdvancedAnalytics(input.actor, input.id, reportActions.APPROVE, "reports.advanced.approved", "approved", { reviewed_at: new Date().toISOString() });
}

export async function returnAdvancedAnalytics(input: { actor: AuthUser; id: string; reason: string }) {
  return moveAdvancedAnalytics(input.actor, input.id, reportActions.RETURN, "reports.advanced.returned", "returned", {
    reason: input.reason,
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
  });
}

export async function updateAdvancedAnalyticsVisibility(input: { actor: AuthUser; id: string; insights: string[] }) {
  return moveAdvancedAnalytics(input.actor, input.id, reportActions.OVERRIDE_VISIBILITY, "reports.advanced.visibility_changed", "visibility_changed", {
    insights: input.insights,
    visibility_changed_at: new Date().toISOString(),
  });
}

export async function exportAdvancedAnalytics(input: { actor: AuthUser; id: string; exportFormat: "csv" | "xlsx" | "pdf" | "json" }) {
  return moveAdvancedAnalytics(input.actor, input.id, reportActions.EXPORT, "reports.advanced.exported", "exported", {
    export_format: input.exportFormat,
    exported_at: new Date().toISOString(),
  });
}

export async function archiveAdvancedAnalytics(input: { actor: AuthUser; id: string }) {
  return moveAdvancedAnalytics(input.actor, input.id, reportActions.ARCHIVE, "reports.advanced.archived", "archived", { archived_at: new Date().toISOString() });
}

async function moveReport(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyReportChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const current = await getReport(id);
  const state = transitionReportState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("hrbp_report_snapshots")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(reportSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditReport(actor, data, auditAction, current.status, state, { reason, exportFormat: data.export_format });
  await notifyReportChanged(toReportNotification(data, notificationAction));
  return data;
}

async function calculateReportAggregate(input: { filters: Record<string, unknown>; periodStart?: string | null; periodEnd?: string | null }) {
  const admin = createSupabaseAdminClient();
  const [
    profiles,
    endCycle,
    midCycle,
    bandFlags,
    feedback,
    pdChats,
    promotions,
    pips,
  ] = await Promise.all([
    admin.from("profiles").select("id,account_status,org_unit_id,role_code"),
    admin.from("end_cycle_evaluations").select("id,status,score,employee_id,process_id,created_at"),
    admin.from("mid_cycle_evaluations").select("id,status,score,employee_id,process_id,created_at"),
    admin.from("performance_band_flags").select("id,flag_type,status,weighted_score,employee_id,created_at"),
    admin.from("feedback_requests").select("id,status,is_anonymous,response_count,employee_id:subject_user_id,created_at"),
    admin.from("pd_chat_logs").select("id,status,employee_id,created_at"),
    admin.from("promotion_cases").select("id,status,employee_id,created_at"),
    admin.from("pip_cases").select("id,status,employee_id,created_at"),
  ]);
  for (const result of [profiles, endCycle, midCycle, bandFlags, feedback, pdChats, promotions, pips]) {
    if (result.error) throw new Error(result.error.message);
  }
  const allEvaluations = [...(endCycle.data ?? []), ...(midCycle.data ?? [])].filter((item) => inPeriod(item, input.periodStart, input.periodEnd));
  const visibleScores = allEvaluations
    .map((item) => item.score)
    .filter((score) => score?.visible && typeof score.totalScore === "number")
    .map((score) => Number(score.totalScore));
  const flags = (bandFlags.data ?? []).filter((item) => inPeriod(item, input.periodStart, input.periodEnd));
  const base = summarizeReportMetrics({
    activeEmployees: (profiles.data ?? []).filter((item) => item.account_status === "active").length,
    totalEvaluations: allEvaluations.length,
    completedEvaluations: allEvaluations.filter((item) => item.status === "completed").length,
    pipFlags: flags.filter((item) => item.flag_type === "pip").length,
    promotionFlags: flags.filter((item) => item.flag_type === "promotion").length,
  });
  return {
    ...base,
    averageScore: visibleScores.length ? Number((visibleScores.reduce((sum, score) => sum + score, 0) / visibleScores.length).toFixed(2)) : null,
    submittedEvaluations: allEvaluations.filter((item) => ["submitted", "manager_approved", "hrbp_approved", "reviewed"].includes(item.status)).length,
    feedbackRequests: (feedback.data ?? []).filter((item) => inPeriod(item, input.periodStart, input.periodEnd)).length,
    pdChatLogs: (pdChats.data ?? []).filter((item) => inPeriod(item, input.periodStart, input.periodEnd)).length,
    promotionCases: (promotions.data ?? []).filter((item) => inPeriod(item, input.periodStart, input.periodEnd)).length,
    pipCases: (pips.data ?? []).filter((item) => inPeriod(item, input.periodStart, input.periodEnd)).length,
    filters: input.filters,
    generatedAt: new Date().toISOString(),
  };
}

async function moveAdvancedAnalytics(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyReportChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const current = await getAdvancedAnalytics(id);
  const state = transitionReportState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("advanced_analytics_snapshots")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(advancedAnalyticsSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditAdvancedAnalytics(actor, data, auditAction, current.status, state, { reason, exportFormat: data.export_format });
  await notifyReportChanged(toReportNotification(data, notificationAction));
  return data;
}

async function calculateAdvancedAnalytics(input: {
  filters: Record<string, unknown>;
  periodStart?: string | null;
  periodEnd?: string | null;
  cohortKey: string;
  interval: "month" | "quarter";
}) {
  const admin = createSupabaseAdminClient();
  const [profiles, endCycle, midCycle, bandFlags] = await Promise.all([
    admin.from("profiles").select("id,account_status,org_unit_id,role_code,manager_id"),
    admin.from("end_cycle_evaluations").select("id,status,score,employee_id,created_at"),
    admin.from("mid_cycle_evaluations").select("id,status,score,employee_id,created_at"),
    admin.from("performance_band_flags").select("id,flag_type,status,weighted_score,employee_id,created_at"),
  ]);
  for (const result of [profiles, endCycle, midCycle, bandFlags]) {
    if (result.error) throw new Error(result.error.message);
  }
  const profilesById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  const evaluationRecords = [...(endCycle.data ?? []), ...(midCycle.data ?? [])]
    .filter((item) => inPeriod(item, input.periodStart, input.periodEnd))
    .map((item) => {
      const profile = profilesById.get(item.employee_id);
      return {
        kind: "evaluation",
        date: item.created_at?.slice(0, 10),
        employeeId: item.employee_id,
        status: item.status,
        score: item.score?.visible && typeof item.score.totalScore === "number" ? Number(item.score.totalScore) : undefined,
        businessUnit: profile?.org_unit_id ?? "Unassigned",
        role: profile?.role_code ?? "Unassigned",
        manager: profile?.manager_id ?? "Unassigned",
      };
    });
  const flagRecords = (bandFlags.data ?? [])
    .filter((item) => inPeriod(item, input.periodStart, input.periodEnd))
    .map((item) => {
      const profile = profilesById.get(item.employee_id);
      return {
        kind: "flag",
        date: item.created_at?.slice(0, 10),
        employeeId: item.employee_id,
        flagType: item.flag_type,
        businessUnit: profile?.org_unit_id ?? "Unassigned",
        role: profile?.role_code ?? "Unassigned",
        manager: profile?.manager_id ?? "Unassigned",
      };
    });
  return {
    ...buildAdvancedAnalytics([...evaluationRecords, ...flagRecords], { interval: input.interval, cohortKey: input.cohortKey }),
    filters: input.filters,
    generatedAt: new Date().toISOString(),
  };
}

function buildAdvancedInsights(analytics: { trends: unknown[]; cohorts: Array<{ cohort: string; completionRate: number; averageScore: number | null }>; summary: Record<string, unknown> }) {
  const insights = [
    `${analytics.trends.length} trend period(s) generated for advanced analytics.`,
    `${analytics.cohorts.length} cohort(s) compared by ${analytics.summary.cohortKey ?? "selected cohort"}.`,
  ];
  const top = analytics.cohorts[0];
  if (top) insights.push(`${top.cohort} currently has ${top.completionRate}% completion and ${top.averageScore ?? "no visible"} average score.`);
  if (typeof analytics.summary.scoreDelta === "number") insights.push(`Latest score movement is ${analytics.summary.scoreDelta >= 0 ? "+" : ""}${analytics.summary.scoreDelta}.`);
  return insights;
}

function buildInsights(metrics: Record<string, unknown>) {
  const insights = [
    `Evaluation completion is ${metrics.completionRate ?? 0}%.`,
    `PIP flag rate is ${metrics.riskRate ?? 0}% and promotion flag rate is ${metrics.promotionRate ?? 0}%.`,
  ];
  if (typeof metrics.averageScore === "number") insights.push(`Average visible evaluation score is ${metrics.averageScore}.`);
  return insights;
}

function inPeriod(item: { created_at?: string | null }, periodStart?: string | null, periodEnd?: string | null) {
  if (!item.created_at) return true;
  const created = item.created_at.slice(0, 10);
  if (periodStart && created < periodStart) return false;
  if (periodEnd && created > periodEnd) return false;
  return true;
}

async function auditReport(
  actor: AuthUser,
  report: { id: string; report_key: string; title: string },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: actor.id,
    action,
    entityType: "hrbp_report_snapshot",
    entityId: report.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      reportKey: report.report_key,
      title: report.title,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toReportNotification(
  report: { id: string; report_key: string; status: string; owner_role: string; next_action: string | null },
  action: Parameters<typeof notifyReportChanged>[0]["action"],
) {
  return {
    reportId: report.id,
    reportKey: report.report_key,
    status: report.status,
    owner: report.owner_role,
    nextAction: report.next_action,
    action,
  };
}

async function auditAdvancedAnalytics(
  actor: AuthUser,
  report: { id: string; report_key: string; title: string },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: actor.id,
    action,
    entityType: "advanced_analytics_snapshot",
    entityId: report.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      reportKey: report.report_key,
      title: report.title,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}
