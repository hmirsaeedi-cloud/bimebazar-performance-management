import {
  dashboardActions,
  dashboardStatuses,
  defaultDashboardLayout,
  getDashboardState,
  resolveDashboardView,
  transitionDashboardState,
} from "@bimebazar/dashboard-workflow";
import {
  calculateTeamHealthScore,
  getTeamHealthState,
  teamHealthActions,
  teamHealthStatuses,
  transitionTeamHealthState,
} from "@bimebazar/team-health-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyDashboardChanged, notifyTeamHealthChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const preferenceSelect = "id,user_id,role_view,status,owner_role,next_action,layout,filters,created_by,updated_by,created_at,updated_at";
const teamHealthSelect = `
  id,team_id,manager_id,cycle,status,owner_role,next_action,name,metrics,score,band,contributions,visibility,
  submitted_at,approved_at,activated_at,calculated_at,returned_at,visibility_changed_at,archived_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

export async function getDashboardSummary(input: { actor: AuthUser; view?: string; userId?: string }) {
  const view = input.view ?? resolveDashboardView(input.actor.roles);
  const targetUserId = input.actor.roles.includes("HR_ADMIN") && input.userId ? input.userId : input.actor.id;
  const preference = await ensureDashboardPreference(input.actor, targetUserId, view);
  const [counts, notifications, recentActivity] = await Promise.all([
    getDashboardCounts(input.actor, view, targetUserId),
    listRecentNotifications(targetUserId),
    listRecentActivity(input.actor, targetUserId),
  ]);

  return {
    view,
    owner: preference.owner_role,
    status: preference.status,
    nextAction: preference.next_action,
    layout: preference.layout,
    filters: preference.filters,
    counts,
    notifications,
    recentActivity,
  };
}

export async function updateDashboardPreference(input: {
  actor: AuthUser;
  view: string;
  layout: string[];
  filters: Record<string, unknown>;
}) {
  const current = await ensureDashboardPreference(input.actor, input.actor.id, input.view);
  const state = transitionDashboardState(current.status, dashboardActions.UPDATE);
  return saveDashboardPreference({
    actor: input.actor,
    userId: input.actor.id,
    view: input.view,
    layout: input.layout,
    filters: input.filters,
    fromStatus: current.status,
    state,
    auditAction: "dashboard.updated",
  });
}

export async function overrideDashboardPreference(input: {
  actor: AuthUser;
  userId: string;
  view: string;
  layout: string[];
  filters: Record<string, unknown>;
}) {
  const current = await ensureDashboardPreference(input.actor, input.userId, input.view);
  const pending = current.status === dashboardStatuses.OVERRIDE_PENDING
    ? getDashboardState(dashboardStatuses.OVERRIDE_PENDING)
    : transitionDashboardState(current.status, dashboardActions.REQUEST_OVERRIDE);
  const state = transitionDashboardState(pending.status, dashboardActions.APPROVE_OVERRIDE);
  return saveDashboardPreference({
    actor: input.actor,
    userId: input.userId,
    view: input.view,
    layout: input.layout,
    filters: input.filters,
    fromStatus: current.status,
    state,
    auditAction: "dashboard.override_approved",
  });
}

export async function listTeamHealthScores(input: { teamId?: string; managerId?: string; status?: string; cycle?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("team_health_scores").select(teamHealthSelect).order("updated_at", { ascending: false });
  if (input.teamId) query = query.eq("team_id", input.teamId);
  if (input.managerId) query = query.eq("manager_id", input.managerId);
  if (input.status) query = query.eq("status", input.status);
  if (input.cycle) query = query.eq("cycle", input.cycle);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createTeamHealthScore(input: {
  actor: AuthUser;
  teamId: string;
  managerId?: string;
  cycle: string;
  name: string;
  metrics: Record<string, number>;
  visibility: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const state = getTeamHealthState(teamHealthStatuses.DRAFT);
  const result = calculateTeamHealthScore(input.metrics);
  const { data, error } = await admin
    .from("team_health_scores")
    .insert({
      team_id: input.teamId,
      manager_id: input.managerId ?? input.actor.id,
      cycle: input.cycle,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      name: input.name,
      metrics: input.metrics,
      score: result.score,
      band: result.band,
      contributions: result.contributions,
      visibility: input.visibility,
      calculated_at: new Date().toISOString(),
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(teamHealthSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditTeamHealth(input.actor, data, "dashboard.team_health.created", null, state);
  await notifyTeamHealth(data, state, "created");
  return data;
}

export async function updateTeamHealthScore(input: {
  actor: AuthUser;
  id: string;
  patch: { name?: string; metrics?: Record<string, number> };
}) {
  const current = await getTeamHealthScore(input.id);
  const state = transitionTeamHealthState(current.status, teamHealthActions.UPDATE);
  const metrics = input.patch.metrics ?? current.metrics;
  const result = calculateTeamHealthScore(metrics);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("team_health_scores")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      name: input.patch.name ?? current.name,
      metrics,
      score: result.score,
      band: result.band,
      contributions: result.contributions,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(teamHealthSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditTeamHealth(input.actor, data, "dashboard.team_health.updated", current.status, state);
  await notifyTeamHealth(data, state, "updated");
  return data;
}

export async function calculateTeamHealth(input: { actor: AuthUser; id: string }) {
  const current = await getTeamHealthScore(input.id);
  const state = transitionTeamHealthState(current.status, teamHealthActions.CALCULATE);
  const result = calculateTeamHealthScore(current.metrics);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("team_health_scores")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      score: result.score,
      band: result.band,
      contributions: result.contributions,
      calculated_at: new Date().toISOString(),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(teamHealthSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditTeamHealth(input.actor, data, "dashboard.team_health.calculated", current.status, state);
  await notifyTeamHealth(data, state, "calculated");
  return data;
}

export async function submitTeamHealth(input: { actor: AuthUser; id: string }) {
  return moveTeamHealth(input.actor, input.id, teamHealthActions.SUBMIT, "dashboard.team_health.submitted", {
    submitted_at: new Date().toISOString(),
  });
}

export async function approveTeamHealth(input: { actor: AuthUser; id: string }) {
  return moveTeamHealth(input.actor, input.id, teamHealthActions.APPROVE, "dashboard.team_health.approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function activateTeamHealth(input: { actor: AuthUser; id: string }) {
  return moveTeamHealth(input.actor, input.id, teamHealthActions.ACTIVATE, "dashboard.team_health.activated", {
    activated_at: new Date().toISOString(),
  });
}

export async function returnTeamHealth(input: { actor: AuthUser; id: string; reason: string }) {
  return moveTeamHealth(input.actor, input.id, teamHealthActions.RETURN, "dashboard.team_health.returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function updateTeamHealthVisibility(input: {
  actor: AuthUser;
  id: string;
  visibility: Record<string, unknown>;
  reason: string;
}) {
  const current = await getTeamHealthScore(input.id);
  const state = transitionTeamHealthState(current.status, teamHealthActions.OVERRIDE_VISIBILITY);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("team_health_scores")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      visibility: input.visibility,
      visibility_changed_at: new Date().toISOString(),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(teamHealthSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditTeamHealth(input.actor, data, "dashboard.team_health.visibility_changed", current.status, state, {
    reason: input.reason,
    from: current.visibility,
    to: input.visibility,
  });
  await notifyTeamHealth(data, state, "visibility_changed");
  return data;
}

export async function archiveTeamHealth(input: { actor: AuthUser; id: string }) {
  return moveTeamHealth(input.actor, input.id, teamHealthActions.ARCHIVE, "dashboard.team_health.archived", {
    archived_at: new Date().toISOString(),
  });
}

async function ensureDashboardPreference(actor: AuthUser, userId: string, view: string) {
  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("dashboard_preferences")
    .select(preferenceSelect)
    .eq("user_id", userId)
    .eq("role_view", view)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing;

  const state = getDashboardState(dashboardStatuses.DEFAULTED);
  const { data, error } = await admin
    .from("dashboard_preferences")
    .insert({
      user_id: userId,
      role_view: view,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      layout: defaultDashboardLayout(view),
      filters: { source: "api_default" },
      created_by: actor.id,
      updated_by: actor.id,
    })
    .select(preferenceSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditDashboard(actor, data, "dashboard.created", null, state);
  return data;
}

async function saveDashboardPreference(input: {
  actor: AuthUser;
  userId: string;
  view: string;
  layout: string[];
  filters: Record<string, unknown>;
  fromStatus: string;
  state: { status: string; owner: string; nextAction: string | null };
  auditAction: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("dashboard_preferences")
    .upsert({
      user_id: input.userId,
      role_view: input.view,
      status: input.state.status,
      owner_role: input.state.owner,
      next_action: input.state.nextAction,
      layout: input.layout,
      filters: input.filters,
      created_by: input.actor.id,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,role_view" })
    .select(preferenceSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditDashboard(input.actor, data, input.auditAction, input.fromStatus, input.state);
  await notifyDashboardChanged({
    userId: input.userId,
    view: input.view,
    status: input.state.status,
    owner: input.state.owner,
    nextAction: input.state.nextAction,
    action: input.auditAction === "dashboard.override_approved" ? "override" : "updated",
  });
  return data;
}

async function getDashboardCounts(actor: AuthUser, view: string, targetUserId: string) {
  const admin = createSupabaseAdminClient();
  const [
    profiles,
    processes,
    evaluations,
    mpas,
    notifications,
    audits,
  ] = await Promise.all([
    countRows(admin.from("profiles").select("id", { count: "exact", head: true })),
    countRows(admin.from("performance_processes").select("id", { count: "exact", head: true })),
    countRows(admin.from("end_cycle_evaluations").select("id", { count: "exact", head: true })),
    countRows(admin.from("mpas").select("id", { count: "exact", head: true })),
    countRows(admin.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_user_id", targetUserId).neq("status", "archived")),
    countRows(admin.from("audit_events").select("id", { count: "exact", head: true })),
  ]);

  return {
    activeEmployees: profiles,
    activeProcesses: processes,
    openEvaluations: evaluations,
    activeMpas: mpas,
    unreadNotifications: notifications,
    auditEvents: actor.roles.includes("HR_ADMIN") || view === "hr_admin" ? audits : undefined,
  };
}

async function listRecentNotifications(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id,title,body,status,priority,created_at")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function listRecentActivity(actor: AuthUser, targetUserId: string) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("audit_events")
    .select("id,action,entity_type,entity_id,to_status,created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  if (!actor.roles.includes("HR_ADMIN")) {
    query = query.or(`actor_user_id.eq.${targetUserId},target_user_id.eq.${targetUserId}`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function countRows(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function auditDashboard(
  actor: AuthUser,
  preference: { id: string; user_id: string; role_view: string },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: preference.user_id,
    action,
    entityType: "dashboard_preference",
    entityId: preference.id,
    fromStatus,
    toStatus: state.status,
    metadata: {
      view: preference.role_view,
      owner: state.owner,
      nextAction: state.nextAction,
    },
  });
}

async function getTeamHealthScore(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("team_health_scores").select(teamHealthSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function moveTeamHealth(
  actor: AuthUser,
  id: string,
  action: string,
  auditAction: string,
  patch: Record<string, unknown>,
) {
  const current = await getTeamHealthScore(id);
  const state = transitionTeamHealthState(current.status, action);
  const { reason, ...dbPatch } = patch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("team_health_scores")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
      ...dbPatch,
    })
    .eq("id", id)
    .select(teamHealthSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditTeamHealth(actor, data, auditAction, current.status, state, {
    reason: typeof reason === "string" ? reason : undefined,
  });
  await notifyTeamHealth(data, state, teamHealthActionNameFromAudit(auditAction));
  return data;
}

async function auditTeamHealth(
  actor: AuthUser,
  score: { id: string; team_id: string; manager_id?: string | null; score: number; band: string },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: score.manager_id ?? undefined,
    action,
    entityType: "team_health_score",
    entityId: score.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      teamId: score.team_id,
      managerId: score.manager_id ?? null,
      score: score.score,
      band: score.band,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

async function notifyTeamHealth(
  score: { id: string; team_id: string; manager_id?: string | null; status: string; score: number; band: string },
  state: { owner: string; nextAction: string | null },
  action: "created" | "updated" | "calculated" | "submitted" | "approved" | "activated" | "returned" | "visibility_changed" | "archived",
) {
  await notifyTeamHealthChanged({
    scoreId: score.id,
    teamId: score.team_id,
    managerId: score.manager_id ?? null,
    status: score.status,
    owner: state.owner,
    nextAction: state.nextAction,
    action,
    score: score.score,
    band: score.band,
  });
}

function teamHealthActionNameFromAudit(
  auditAction: string,
): "created" | "updated" | "calculated" | "submitted" | "approved" | "activated" | "returned" | "visibility_changed" | "archived" {
  if (auditAction.endsWith(".calculated")) return "calculated";
  if (auditAction.endsWith(".submitted")) return "submitted";
  if (auditAction.endsWith(".approved")) return "approved";
  if (auditAction.endsWith(".activated")) return "activated";
  if (auditAction.endsWith(".returned")) return "returned";
  if (auditAction.endsWith(".visibility_changed")) return "visibility_changed";
  if (auditAction.endsWith(".archived")) return "archived";
  return "updated";
}
