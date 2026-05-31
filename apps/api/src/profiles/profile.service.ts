import { randomUUID } from "node:crypto";
import {
  getProfileExportState,
  profileExportActions,
  profileExportStatuses,
  transitionProfileExportState,
} from "@bimebazar/profile-export-workflow";
import {
  getProfileState,
  profileActions,
  profileStatuses,
  transitionProfileState,
} from "@bimebazar/profile-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import { notifyUserCreated } from "../notifications/notification.service.js";
import { notifyEmployeeExportReady } from "../notifications/notification.service.js";
import { syncComputedManagerRole } from "../rbac/managerRole.service.js";
import type { AuthUser } from "../auth/auth.types.js";

const profileSelect = `
  id,email,display_name,employee_id,role_code,account_status,
  full_name_persian,full_name_english,username,join_date,exit_date,
  manager_id,team_id,business_unit_id,department_id,level,position_title,
  phone,function_lead_id,hrbp_id,preferred_calendar,preferred_locale,
  date_display_timezone,calendar_preference_status,preferred_language,
  text_direction,language_preference_status,created_at,updated_at
`;

interface CreateEmployeeProfileInput {
  actor: AuthUser;
  email: string;
  employeeId: string;
  fullNamePersian: string;
  fullNameEnglish: string;
  joinDate: string;
  managerId?: string | null;
  businessUnitId: string;
  departmentId: string;
  teamId: string;
  level: string;
  positionTitle: string;
  phone?: string | null;
  functionLeadId?: string | null;
  hrbpId?: string | null;
}

export async function listEmployeeProfiles(input: {
  search?: string;
  businessUnitId?: string;
  departmentId?: string;
  teamId?: string;
  status?: string;
  level?: string;
  page: number;
  pageSize: number;
}) {
  const admin = createSupabaseAdminClient();
  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;
  let query = admin.from("profiles").select(profileSelect, { count: "exact" }).order("employee_id", { ascending: true });

  if (input.businessUnitId) query = query.eq("business_unit_id", input.businessUnitId);
  if (input.departmentId) query = query.eq("department_id", input.departmentId);
  if (input.teamId) query = query.eq("team_id", input.teamId);
  if (input.status) query = query.eq("account_status", input.status);
  if (input.level) query = query.eq("level", input.level);
  if (input.search) {
    query = query.or(
      `email.ilike.%${input.search}%,employee_id.ilike.%${input.search}%,display_name.ilike.%${input.search}%,full_name_english.ilike.%${input.search}%`,
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return { data: data ?? [], count: count ?? 0, page: input.page, pageSize: input.pageSize };
}

export async function createEmployeeExportReport(input: {
  actor: AuthUser;
  search?: string;
  businessUnitId?: string;
  departmentId?: string;
  teamId?: string;
  status?: string;
  level?: string;
  columns: string[];
}) {
  const admin = createSupabaseAdminClient();
  const requestedState = getProfileExportState(profileExportStatuses.REQUESTED);
  const generatingState = transitionProfileExportState(requestedState.status, profileExportActions.GENERATE);
  const readyState = transitionProfileExportState(generatingState.status, profileExportActions.MARK_READY);
  const filters = {
    search: input.search,
    businessUnitId: input.businessUnitId,
    departmentId: input.departmentId,
    teamId: input.teamId,
    status: input.status,
    level: input.level,
  };
  const rows = await queryProfilesForExport(filters);
  const csv = toCsv(rows, input.columns);
  const fileName = `employee-export-${new Date().toISOString().slice(0, 10)}.csv`;
  const now = new Date().toISOString();

  const { data: report, error } = await admin
    .from("employee_export_reports")
    .insert({
      status: readyState.status,
      owner_role: readyState.owner,
      next_action: readyState.nextAction,
      filters,
      columns: input.columns,
      row_count: rows.length,
      file_name: fileName,
      requested_by: input.actor.id,
      generated_at: now,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "profile_export.requested",
    entityType: "employee_export_report",
    entityId: report.id,
    fromStatus: null,
    toStatus: requestedState.status,
    metadata: { owner: requestedState.owner, nextAction: requestedState.nextAction, filters, columns: input.columns },
  });
  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "profile_export.generated",
    entityType: "employee_export_report",
    entityId: report.id,
    fromStatus: generatingState.status,
    toStatus: readyState.status,
    metadata: { owner: readyState.owner, nextAction: readyState.nextAction, rowCount: rows.length, fileName },
  });
  await notifyEmployeeExportReady({
    exportReportId: report.id,
    status: readyState.status,
    rowCount: rows.length,
    fileName,
  });

  return { report, csv };
}

export async function getEmployeeProfile(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select(profileSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function queryProfilesForExport(filters: {
  search?: string;
  businessUnitId?: string;
  departmentId?: string;
  teamId?: string;
  status?: string;
  level?: string;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("profiles").select(profileSelect).order("employee_id", { ascending: true });
  if (filters.businessUnitId) query = query.eq("business_unit_id", filters.businessUnitId);
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.teamId) query = query.eq("team_id", filters.teamId);
  if (filters.status) query = query.eq("account_status", filters.status);
  if (filters.level) query = query.eq("level", filters.level);
  if (filters.search) {
    query = query.or(
      `email.ilike.%${filters.search}%,employee_id.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%,full_name_english.ilike.%${filters.search}%`,
    );
  }
  const { data, error } = await query.limit(5000);
  if (error) throw new Error(error.message);
  return data ?? [];
}

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]) {
  const escape = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [
    columns.map(escape).join(","),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(",")),
  ].join("\n");
}

export async function createEmployeeProfile(input: CreateEmployeeProfileInput) {
  const admin = createSupabaseAdminClient();
  const temporaryPassword = randomUUID();
  const username = input.email.split("@")[0];

  await assertOrgConsistency(input.businessUnitId, input.departmentId, input.teamId);

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      display_name: input.fullNameEnglish,
    },
    app_metadata: {
      role: "EMPLOYEE",
      account_status: profileStatuses.ACTIVE,
    },
  });

  if (authError || !authUser.user) {
    throw new Error(authError?.message ?? "Could not create Supabase Auth user");
  }

  const { data, error } = await admin
    .from("profiles")
    .insert({
      id: authUser.user.id,
      email: input.email,
      display_name: input.fullNameEnglish,
      employee_id: input.employeeId,
      role_code: "EMPLOYEE",
      account_status: profileStatuses.ACTIVE,
      full_name_persian: input.fullNamePersian,
      full_name_english: input.fullNameEnglish,
      username,
      join_date: input.joinDate,
      manager_id: input.managerId ?? null,
      business_unit_id: input.businessUnitId,
      department_id: input.departmentId,
      team_id: input.teamId,
      level: input.level,
      position_title: input.positionTitle,
      phone: input.phone ?? null,
      function_lead_id: input.functionLeadId ?? null,
      hrbp_id: input.hrbpId ?? null,
      preferred_calendar: "jalali",
      preferred_locale: "fa-IR",
      date_display_timezone: "Asia/Tehran",
      calendar_preference_status: "defaulted",
      preferred_language: "fa",
      text_direction: "rtl",
      language_preference_status: "defaulted",
    })
    .select(profileSelect)
    .single();

  if (error) throw new Error(error.message);

  await admin.from("profile_roles").upsert({
    user_id: authUser.user.id,
    role_code: "EMPLOYEE",
    assignment_type: "manual",
    status: "active",
    assigned_by: input.actor.id,
    assigned_at: new Date().toISOString(),
    reason: "Initial employee profile role",
  });

  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: authUser.user.id,
    action: "profile.created",
    entityType: "profile",
    entityId: authUser.user.id,
    fromStatus: null,
    toStatus: profileStatuses.ACTIVE,
    metadata: {
      employeeId: input.employeeId,
      role: "EMPLOYEE",
      owner: getProfileState(profileStatuses.ACTIVE).owner,
      nextAction: getProfileState(profileStatuses.ACTIVE).nextAction,
    },
  });
  await syncComputedManagerRole({
    actor: input.actor,
    managerUserId: input.managerId,
    reason: "Profile created with manager assignment",
  });
  await notifyUserCreated({ userId: authUser.user.id, temporaryPassword });

  return data;
}

export async function updateEmployeeProfile(input: {
  actor: AuthUser;
  id: string;
  patch: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const current = await getEmployeeProfile(input.id);
  const dbPatch = mapProfilePatch(input.patch);
  const currentState = getProfileState(current.account_status);
  const previousManagerId = current.manager_id;

  if (dbPatch.business_unit_id || dbPatch.department_id || dbPatch.team_id) {
    await assertOrgConsistency(
      String(dbPatch.business_unit_id ?? current.business_unit_id),
      String(dbPatch.department_id ?? current.department_id),
      String(dbPatch.team_id ?? current.team_id),
    );
  }

  const { data, error } = await admin
    .from("profiles")
    .update({ ...dbPatch, updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .select(profileSelect)
    .single();

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: input.id,
    action: "profile.updated",
    entityType: "profile",
    entityId: input.id,
    fromStatus: current.account_status,
    toStatus: current.account_status,
    metadata: {
      owner: currentState.owner,
      nextAction: currentState.nextAction,
      previous: current,
      next: data,
    },
  });

  if ("manager_id" in dbPatch && previousManagerId !== data.manager_id) {
    await syncComputedManagerRole({
      actor: input.actor,
      managerUserId: previousManagerId,
      reason: "Profile manager changed: previous manager resync",
    });
    await syncComputedManagerRole({
      actor: input.actor,
      managerUserId: data.manager_id,
      reason: "Profile manager changed: new manager resync",
    });
  }

  return data;
}

export async function deactivateEmployeeProfile(input: {
  actor: AuthUser;
  id: string;
  reason: string;
  exitDate?: string;
}) {
  const admin = createSupabaseAdminClient();
  const current = await getEmployeeProfile(input.id);
  const nextState = transitionProfileState(current.account_status, profileActions.DEACTIVATE_PROFILE);

  const { data, error } = await admin
    .from("profiles")
    .update({
      account_status: nextState.status,
      exit_date: input.exitDate ?? new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(profileSelect)
    .single();

  if (error) throw new Error(error.message);

  await admin.auth.admin.updateUserById(input.id, {
    app_metadata: {
      role: current.role_code,
      account_status: nextState.status,
    },
  });

  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: input.id,
    action: "profile.deactivated",
    entityType: "profile",
    entityId: input.id,
    fromStatus: current.account_status,
    toStatus: nextState.status,
    reason: input.reason,
    metadata: { owner: nextState.owner, nextAction: nextState.nextAction },
  });
  await syncComputedManagerRole({
    actor: input.actor,
    managerUserId: current.manager_id,
    reason: "Direct report deactivated",
  });

  return data;
}

export async function listOrgUnits() {
  const admin = createSupabaseAdminClient();
  const [{ data: businessUnits }, { data: departments }, { data: teams }] = await Promise.all([
    admin.from("business_units").select("*").order("name"),
    admin.from("departments").select("*").order("name"),
    admin.from("teams").select("*").order("name"),
  ]);

  return {
    businessUnits: businessUnits ?? [],
    departments: departments ?? [],
    teams: teams ?? [],
  };
}

async function assertOrgConsistency(businessUnitId: string, departmentId: string, teamId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("teams")
    .select("id,department_id,departments!inner(id,business_unit_id)")
    .eq("id", teamId)
    .single();

  if (error || !data) throw new Error("Selected team was not found");
  const department = Array.isArray(data.departments) ? data.departments[0] : data.departments;

  if (data.department_id !== departmentId || department.business_unit_id !== businessUnitId) {
    throw new Error("Team, department, and business unit do not match");
  }
}

function mapProfilePatch(patch: Record<string, unknown>) {
  const mapping: Record<string, string> = {
    email: "email",
    employeeId: "employee_id",
    fullNamePersian: "full_name_persian",
    fullNameEnglish: "full_name_english",
    joinDate: "join_date",
    exitDate: "exit_date",
    managerId: "manager_id",
    businessUnitId: "business_unit_id",
    departmentId: "department_id",
    teamId: "team_id",
    level: "level",
    positionTitle: "position_title",
    phone: "phone",
    functionLeadId: "function_lead_id",
    hrbpId: "hrbp_id",
    accountStatus: "account_status",
  };
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(patch)) {
    const dbKey = mapping[key];
    if (dbKey) result[dbKey] = value;
  }

  if (typeof patch.email === "string") {
    result.username = patch.email.split("@")[0];
  }
  if (typeof patch.fullNameEnglish === "string") {
    result.display_name = patch.fullNameEnglish;
  }

  return result;
}
