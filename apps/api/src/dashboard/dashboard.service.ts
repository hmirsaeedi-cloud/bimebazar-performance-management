import {
  dashboardActions,
  dashboardStatuses,
  defaultDashboardLayout,
  getDashboardState,
  resolveDashboardView,
  transitionDashboardState,
} from "@bimebazar/dashboard-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyDashboardChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const preferenceSelect = "id,user_id,role_view,status,owner_role,next_action,layout,filters,created_by,updated_by,created_at,updated_at";

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
