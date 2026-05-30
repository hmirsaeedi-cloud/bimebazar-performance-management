import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountStatus, AuthUser, PermissionCode, RoleCode } from "../auth/auth.types.js";

interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  employee_id: string | null;
  role_code: RoleCode;
  account_status: AccountStatus;
  failed_login_count: number;
}

interface PermissionRow {
  permission_code: PermissionCode;
}

interface RoleAssignmentRow {
  role_code: RoleCode;
}

export async function getAuthUserById(supabase: SupabaseClient, id: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,employee_id,role_code,account_status,failed_login_count")
    .eq("id", id)
    .single<ProfileRow>();

  if (error || !profile) {
    return null;
  }

  const roles = await getActiveRoles(supabase, id, profile.role_code);
  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("permission_code")
    .in("role_code", roles)
    .returns<PermissionRow[]>();

  return mapProfile(profile, roles, permissions ?? []);
}

export async function createProfile(
  supabase: SupabaseClient,
  input: {
    id: string;
    email: string;
    displayName: string;
    employeeId: string | null;
    role: RoleCode;
    status: AccountStatus;
  },
) {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: input.id,
      email: input.email,
      display_name: input.displayName,
      employee_id: input.employeeId,
      role_code: input.role,
      account_status: input.status,
    })
    .select("id,email,display_name,employee_id,role_code,account_status,failed_login_count")
    .single<ProfileRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Profile creation failed");
  }

  await supabase.from("profile_roles").upsert({
    user_id: data.id,
    role_code: input.role,
    assignment_type: "manual",
    status: "active",
    reason: "Initial profile role",
  });

  const roles = await getActiveRoles(supabase, data.id, data.role_code);
  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("permission_code")
    .in("role_code", roles)
    .returns<PermissionRow[]>();

  return mapProfile(data, roles, permissions ?? []);
}

export async function recordSuccessfulLogin(supabase: SupabaseClient, userId: string) {
  await supabase
    .from("profiles")
    .update({ failed_login_count: 0, last_login_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function updateUserStatus(supabase: SupabaseClient, userId: string, status: AccountStatus) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ account_status: status, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id,email,display_name,employee_id,role_code,account_status,failed_login_count")
    .single<ProfileRow>();

  if (error || !data) {
    return null;
  }

  const roles = await getActiveRoles(supabase, data.id, data.role_code);
  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("permission_code")
    .in("role_code", roles)
    .returns<PermissionRow[]>();

  return mapProfile(data, roles, permissions ?? []);
}

async function getActiveRoles(supabase: SupabaseClient, userId: string, fallbackRole: RoleCode) {
  const { data } = await supabase
    .from("profile_roles")
    .select("role_code")
    .eq("user_id", userId)
    .eq("status", "active")
    .returns<RoleAssignmentRow[]>();
  const roles = new Set<RoleCode>((data ?? []).map((row) => row.role_code));

  roles.add(fallbackRole);
  return [...roles];
}

function mapProfile(profile: ProfileRow, roles: RoleCode[], permissions: PermissionRow[]): AuthUser {
  const uniquePermissions = [...new Set(permissions.map((item) => item.permission_code))];

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    employeeId: profile.employee_id,
    role: profile.role_code,
    roles,
    permissions: uniquePermissions,
    status: profile.account_status,
    failedLoginCount: profile.failed_login_count,
  };
}
