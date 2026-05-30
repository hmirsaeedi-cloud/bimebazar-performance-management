import {
  managerRoleActions,
  managerRoleStatuses,
  transitionManagerRoleState,
} from "@bimebazar/manager-role-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

interface SyncResult {
  user_id: string;
  role_code: "MANAGER";
  status: "active" | "revoked";
  direct_report_count: number;
  changed: boolean;
}

export async function syncComputedManagerRole(input: {
  actor?: AuthUser;
  managerUserId: string | null | undefined;
  reason: string;
}) {
  if (!input.managerUserId) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { count, error: countError } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", input.managerUserId)
    .eq("account_status", "active");

  if (countError) {
    throw new Error(countError.message);
  }

  const directReportCount = count ?? 0;
  const { data: existing } = await admin
    .from("profile_roles")
    .select("status,assignment_type")
    .eq("user_id", input.managerUserId)
    .eq("role_code", "MANAGER")
    .eq("assignment_type", "computed")
    .maybeSingle<{ status: "active" | "revoked"; assignment_type: "computed" }>();

  let data: SyncResult;
  if (directReportCount > 0) {
    const { data: assignment, error } = await admin
      .from("profile_roles")
      .upsert({
        user_id: input.managerUserId,
        role_code: "MANAGER",
        assignment_type: "computed",
        status: "active",
        assigned_at: new Date().toISOString(),
        revoked_at: null,
        reason: "Auto-assigned because employee has active direct reports",
      })
      .select("user_id,role_code,status")
      .single<{ user_id: string; role_code: "MANAGER"; status: "active" }>();

    if (error || !assignment) throw new Error(error?.message ?? "Manager role assignment failed");
    data = {
      ...assignment,
      direct_report_count: directReportCount,
      changed: existing?.status !== "active",
    };
  } else {
    const { data: assignment, error } = await admin
      .from("profile_roles")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        reason: "Auto-revoked because employee has no active direct reports",
      })
      .eq("user_id", input.managerUserId)
      .eq("role_code", "MANAGER")
      .eq("assignment_type", "computed")
      .select("user_id,role_code,status")
      .maybeSingle<{ user_id: string; role_code: "MANAGER"; status: "revoked" }>();

    if (error) throw new Error(error.message);
    data = {
      user_id: input.managerUserId,
      role_code: "MANAGER",
      status: assignment?.status ?? "revoked",
      direct_report_count: directReportCount,
      changed: existing?.status === "active",
    };
  }

  const workflowStatus = data.status === "active"
    ? managerRoleStatuses.NOT_MANAGER
    : managerRoleStatuses.ACTIVE_MANAGER;
  const workflowAction = data.status === "active"
    ? managerRoleActions.DIRECT_REPORT_ADDED
    : managerRoleActions.DIRECT_REPORT_REMOVED;
  const nextState = transitionManagerRoleState(workflowStatus, workflowAction);

  if (data.changed) {
    await writeAuditEvent({
      actorUserId: input.actor?.id ?? null,
      targetUserId: data.user_id,
      action: data.status === "active" ? "rbac.manager_role_auto_assigned" : "rbac.manager_role_auto_revoked",
      entityType: "profile_role",
      entityId: `${data.user_id}:MANAGER`,
      fromStatus: workflowStatus,
      toStatus: nextState.status,
      reason: input.reason,
      metadata: {
        owner: nextState.owner,
        nextAction: nextState.nextAction,
        directReportCount: data.direct_report_count,
      },
    });
  }

  return data;
}

export async function syncAllComputedManagerRoles(input: { actor: AuthUser; reason: string }) {
  const admin = createSupabaseAdminClient();
  const { data: managerIds, error } = await admin
    .from("profiles")
    .select("id")
    .or("account_status.eq.active,manager_id.not.is.null");

  if (error) {
    throw new Error(error.message);
  }

  const ids = new Set<string>();
  for (const row of managerIds ?? []) {
    ids.add(row.id);
  }

  const { data: referencedManagers } = await admin
    .from("profiles")
    .select("manager_id")
    .not("manager_id", "is", null);

  for (const row of referencedManagers ?? []) {
    if (row.manager_id) ids.add(row.manager_id);
  }

  const results = [];
  for (const id of ids) {
    results.push(await syncComputedManagerRole({ actor: input.actor, managerUserId: id, reason: input.reason }));
  }

  return results.filter(Boolean);
}
