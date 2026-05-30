import { rbacActions, rbacStatuses, transitionRbacState } from "@bimebazar/rbac-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser, RoleCode } from "../auth/auth.types.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

export async function listRbacCatalog() {
  const admin = createSupabaseAdminClient();
  const [{ data: roles }, { data: permissions }, { data: rolePermissions }] = await Promise.all([
    admin.from("roles").select("*").order("code"),
    admin.from("permissions").select("*").order("code"),
    admin.from("role_permissions").select("*").order("role_code"),
  ]);

  return {
    roles: roles ?? [],
    permissions: permissions ?? [],
    rolePermissions: rolePermissions ?? [],
  };
}

export async function listUserRoleAssignments(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profile_roles")
    .select("user_id,role_code,assignment_type,status,assigned_by,revoked_by,assigned_at,revoked_at,reason")
    .eq("user_id", userId)
    .order("role_code");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function assignUserRole(input: {
  actor: AuthUser;
  userId: string;
  role: RoleCode;
  assignmentType: "manual" | "computed";
  reason: string;
}) {
  const admin = createSupabaseAdminClient();
  const nextState = transitionRbacState(rbacStatuses.DRAFT, rbacActions.ACTIVATE_ASSIGNMENT);

  const { data, error } = await admin
    .from("profile_roles")
    .upsert({
      user_id: input.userId,
      role_code: input.role,
      assignment_type: input.assignmentType,
      status: nextState.status,
      assigned_by: input.actor.id,
      revoked_by: null,
      assigned_at: new Date().toISOString(),
      revoked_at: null,
      reason: input.reason,
    })
    .select("user_id,role_code,assignment_type,status,assigned_by,revoked_by,assigned_at,revoked_at,reason")
    .single();

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: input.userId,
    action: "rbac.role_assigned",
    entityType: "profile_role",
    entityId: `${input.userId}:${input.role}`,
    fromStatus: rbacStatuses.DRAFT,
    toStatus: nextState.status,
    reason: input.reason,
    metadata: {
      role: input.role,
      assignmentType: input.assignmentType,
      owner: nextState.owner,
      nextAction: nextState.nextAction,
    },
  });

  return data;
}

export async function revokeUserRole(input: {
  actor: AuthUser;
  userId: string;
  role: RoleCode;
  reason: string;
}) {
  const admin = createSupabaseAdminClient();
  const nextState = transitionRbacState(rbacStatuses.ACTIVE, rbacActions.REVOKE_ASSIGNMENT);

  const { data, error } = await admin
    .from("profile_roles")
    .update({
      status: nextState.status,
      revoked_by: input.actor.id,
      revoked_at: new Date().toISOString(),
      reason: input.reason,
    })
    .eq("user_id", input.userId)
    .eq("role_code", input.role)
    .eq("assignment_type", "manual")
    .select("user_id,role_code,assignment_type,status,assigned_by,revoked_by,assigned_at,revoked_at,reason")
    .single();

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: input.userId,
    action: "rbac.role_revoked",
    entityType: "profile_role",
    entityId: `${input.userId}:${input.role}`,
    fromStatus: rbacStatuses.ACTIVE,
    toStatus: nextState.status,
    reason: input.reason,
    metadata: {
      role: input.role,
      owner: nextState.owner,
      nextAction: nextState.nextAction,
    },
  });

  return data;
}
