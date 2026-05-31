import {
  bulkImportActions,
  bulkImportStatuses,
  getBulkImportState,
  transitionBulkImportState,
} from "@bimebazar/bulk-import-workflow";
import { profileStatuses } from "@bimebazar/profile-workflow";
import { randomUUID } from "node:crypto";
import { writeAuditEvent } from "../audit/audit.service.js";
import { notifyEmployeeImportCompleted, notifyUserCreated } from "../notifications/notification.service.js";
import { syncComputedManagerRole } from "../rbac/managerRole.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import type { AuthUser } from "../auth/auth.types.js";
import { importEmployeeRowSchema } from "./employeeImport.schemas.js";

interface ImportInput {
  actor: AuthUser;
  sourceFilename: string;
  rows: Array<Record<string, unknown>>;
  dryRun?: boolean;
}

export async function listEmployeeImportRuns() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("employee_import_runs")
    .select("*, employee_import_rows(id,row_number,status,errors,profile_id)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function previewEmployeeImport(input: ImportInput) {
  const validation = await validateRows(input.rows);
  const state = getBulkImportState(validation.invalidRows > 0 ? bulkImportStatuses.FAILED_VALIDATION : bulkImportStatuses.VALIDATED);
  return {
    status: state.status,
    owner: state.owner,
    nextAction: state.nextAction,
    sourceFilename: input.sourceFilename,
    ...validation,
  };
}

export async function processEmployeeImport(input: ImportInput) {
  const admin = createSupabaseAdminClient();
  const uploadedState = getBulkImportState(bulkImportStatuses.UPLOADED);
  const validationStarted = transitionBulkImportState(uploadedState.status, bulkImportActions.VALIDATE);
  const validation = await validateRows(input.rows);
  const validationDone = transitionBulkImportState(
    validationStarted.status,
    validation.invalidRows > 0 ? bulkImportActions.MARK_COMPLETE_WITH_ERRORS : bulkImportActions.MARK_COMPLETE,
  );

  const { data: run, error: runError } = await admin
    .from("employee_import_runs")
    .insert({
      source_filename: input.sourceFilename,
      status: validationDone.status,
      owner_role: validationDone.owner,
      next_action: validationDone.nextAction,
      total_rows: input.rows.length,
      valid_rows: validation.validRows,
      invalid_rows: validation.invalidRows,
      dry_run: input.dryRun ?? false,
      submitted_at: new Date().toISOString(),
      validation_summary: buildValidationSummary(validation.rows),
      created_by: input.actor.id,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (runError || !run) throw new Error(runError?.message ?? "Could not create import run");

  await writeImportRows(run.id, validation.rows);
  await writeImportAudit(input.actor, run.id, null, uploadedState.status, uploadedState, {
    sourceFilename: input.sourceFilename,
    totalRows: input.rows.length,
    dryRun: input.dryRun ?? false,
  }, "employee_import.submitted");
  await writeImportAudit(input.actor, run.id, uploadedState.status, validationDone.status, validationDone, {
    sourceFilename: input.sourceFilename,
    totalRows: input.rows.length,
    validRows: validation.validRows,
    invalidRows: validation.invalidRows,
    dryRun: input.dryRun ?? false,
  });

  if (input.dryRun || validation.invalidRows > 0) {
    await notifyEmployeeImportCompleted({
      importRunId: run.id,
      status: validationDone.status,
      totalRows: input.rows.length,
      createdCount: 0,
      errorCount: 0,
    });
    return getImportRun(run.id);
  }

  const processingState = transitionBulkImportState(validationDone.status, bulkImportActions.PROCESS);
  await updateRun(run.id, processingState, { updated_at: new Date().toISOString() });

  let createdCount = 0;
  let errorCount = 0;
  for (const row of validation.rows) {
    if (row.status !== "valid" || !row.normalized) continue;
    try {
      const created = await createImportedEmployee({ actor: input.actor, row: row.normalized });
      createdCount += 1;
      await admin
        .from("employee_import_rows")
        .update({ status: "created", profile_id: created.id, updated_at: new Date().toISOString() })
        .eq("import_run_id", run.id)
        .eq("row_number", row.rowNumber);
    } catch (error) {
      errorCount += 1;
      await admin
        .from("employee_import_rows")
        .update({
          status: "error",
          errors: [error instanceof Error ? error.message : "Could not create employee"],
          updated_at: new Date().toISOString(),
        })
        .eq("import_run_id", run.id)
        .eq("row_number", row.rowNumber);
    }
  }

  const completedState = transitionBulkImportState(
    processingState.status,
    errorCount > 0 ? bulkImportActions.MARK_COMPLETE_WITH_ERRORS : bulkImportActions.MARK_COMPLETE,
  );
  await updateRun(run.id, completedState, {
    created_count: createdCount,
    error_count: errorCount,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await writeImportAudit(input.actor, run.id, processingState.status, completedState.status, completedState, {
    createdCount,
    errorCount,
  });
  await notifyEmployeeImportCompleted({
    importRunId: run.id,
    status: completedState.status,
    totalRows: input.rows.length,
    createdCount,
    errorCount,
  });

  return getImportRun(run.id);
}

export async function cancelEmployeeImportRun(input: { actor: AuthUser; id: string; reason: string }) {
  const current = await getImportRun(input.id);
  const nextState = transitionBulkImportState(current.status, bulkImportActions.CANCEL);
  await updateRun(input.id, nextState, {
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await writeImportAudit(input.actor, input.id, current.status, nextState.status, nextState, {
    totalRows: current.total_rows,
    validRows: current.valid_rows,
    invalidRows: current.invalid_rows,
  }, "employee_import.cancelled", input.reason);
  await notifyEmployeeImportCompleted({
    importRunId: input.id,
    status: nextState.status,
    totalRows: current.total_rows,
    createdCount: current.created_count,
    errorCount: current.error_count,
  });
  return getImportRun(input.id);
}

async function validateRows(rows: Array<Record<string, unknown>>) {
  const admin = createSupabaseAdminClient();
  const [{ data: businessUnits }, { data: departments }, { data: teams }, { data: profiles }] = await Promise.all([
    admin.from("business_units").select("id,name"),
    admin.from("departments").select("id,name,business_unit_id"),
    admin.from("teams").select("id,name,department_id"),
    admin.from("profiles").select("id,email,employee_id"),
  ]);
  const existingEmails = new Set((profiles ?? []).map((profile) => String(profile.email).toLowerCase()));
  const existingEmployeeIds = new Set((profiles ?? []).map((profile) => profile.employee_id).filter(Boolean));
  const managerByEmail = new Map((profiles ?? []).map((profile) => [String(profile.email).toLowerCase(), profile.id]));
  const seenEmails = new Set<string>();
  const seenEmployeeIds = new Set<string>();
  const results = rows.map((row, index) => {
    const parsed = importEmployeeRowSchema.safeParse(row);
    const errors: string[] = parsed.success ? [] : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    let normalized: Record<string, unknown> | null = parsed.success ? { ...parsed.data } : null;

    if (parsed.success) {
      const businessUnit = (businessUnits ?? []).find((item) => item.name === parsed.data.businessUnitName);
      const department = (departments ?? []).find((item) => item.name === parsed.data.departmentName && item.business_unit_id === businessUnit?.id);
      const team = (teams ?? []).find((item) => item.name === parsed.data.teamName && item.department_id === department?.id);
      if (!businessUnit) errors.push(`Unknown business unit: ${parsed.data.businessUnitName}`);
      if (!department) errors.push(`Unknown department for selected business unit: ${parsed.data.departmentName}`);
      if (!team) errors.push(`Unknown team for selected department: ${parsed.data.teamName}`);
      if (existingEmails.has(parsed.data.email)) errors.push(`Email already exists: ${parsed.data.email}`);
      if (existingEmployeeIds.has(parsed.data.employeeId)) errors.push(`Employee ID already exists: ${parsed.data.employeeId}`);
      if (seenEmails.has(parsed.data.email)) errors.push(`Duplicate email in file: ${parsed.data.email}`);
      if (seenEmployeeIds.has(parsed.data.employeeId)) errors.push(`Duplicate employee ID in file: ${parsed.data.employeeId}`);
      if (parsed.data.managerEmail?.toLowerCase() === parsed.data.email) errors.push("Manager email cannot be the same as employee email");
      seenEmails.add(parsed.data.email);
      seenEmployeeIds.add(parsed.data.employeeId);

      const managerId = parsed.data.managerEmail ? managerByEmail.get(parsed.data.managerEmail.toLowerCase()) : null;
      if (parsed.data.managerEmail && !managerId) errors.push(`Manager email was not found: ${parsed.data.managerEmail}`);
      normalized = {
        ...parsed.data,
        businessUnitId: businessUnit?.id,
        departmentId: department?.id,
        teamId: team?.id,
        managerId,
        importAction: "create",
      };
    }

    return {
      rowNumber: index + 2,
      raw: row,
      normalized,
      status: errors.length > 0 ? "invalid" : "valid",
      errors,
    };
  });

  return {
    totalRows: rows.length,
    validRows: results.filter((row) => row.status === "valid").length,
    invalidRows: results.filter((row) => row.status === "invalid").length,
    rows: results,
  };
}

async function writeImportRows(importRunId: string, rows: Awaited<ReturnType<typeof validateRows>>["rows"]) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("employee_import_rows").insert(
    rows.map((row) => ({
      import_run_id: importRunId,
      row_number: row.rowNumber,
      raw_data: row.raw,
      normalized_data: row.normalized ?? {},
      status: row.status,
      errors: row.errors,
    })),
  );
  if (error) throw new Error(error.message);
}

async function createImportedEmployee(input: { actor: AuthUser; row: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient();
  const temporaryPassword = randomUUID();
  const email = String(input.row.email);
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { display_name: input.row.fullNameEnglish },
    app_metadata: { role: "EMPLOYEE", account_status: profileStatuses.ACTIVE },
  });
  if (authError || !authUser.user) throw new Error(authError?.message ?? "Could not create Supabase Auth user");

  const { data, error } = await admin
    .from("profiles")
    .insert({
      id: authUser.user.id,
      email,
      display_name: input.row.fullNameEnglish,
      employee_id: input.row.employeeId,
      role_code: "EMPLOYEE",
      account_status: profileStatuses.ACTIVE,
      full_name_persian: input.row.fullNamePersian,
      full_name_english: input.row.fullNameEnglish,
      username: email.split("@")[0],
      join_date: input.row.joinDate,
      manager_id: input.row.managerId ?? null,
      business_unit_id: input.row.businessUnitId,
      department_id: input.row.departmentId,
      team_id: input.row.teamId,
      level: input.row.level,
      position_title: input.row.positionTitle,
      phone: input.row.phone ?? null,
      preferred_calendar: "jalali",
      preferred_locale: "fa-IR",
      date_display_timezone: "Asia/Tehran",
      calendar_preference_status: "defaulted",
      preferred_language: "fa",
      text_direction: "rtl",
      language_preference_status: "defaulted",
    })
    .select("id,manager_id,employee_id")
    .single();
  if (error) throw new Error(error.message);

  await admin.from("profile_roles").upsert({
    user_id: authUser.user.id,
    role_code: "EMPLOYEE",
    assignment_type: "manual",
    status: "active",
    assigned_by: input.actor.id,
    assigned_at: new Date().toISOString(),
    reason: "Bulk employee import",
  });

  const state = { status: profileStatuses.ACTIVE, owner: "EMPLOYEE", nextAction: null };
  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: authUser.user.id,
    action: "profile.created_from_bulk_import",
    entityType: "profile",
    entityId: authUser.user.id,
    fromStatus: null,
    toStatus: state.status,
    metadata: {
      employeeId: data.employee_id,
      owner: state.owner,
      nextAction: state.nextAction,
    },
  });
  await syncComputedManagerRole({ actor: input.actor, managerUserId: data.manager_id, reason: "Bulk import manager assignment" });
  await notifyUserCreated({ userId: authUser.user.id, temporaryPassword });
  return data;
}

async function updateRun(id: string, state: { status: string; owner: string; nextAction: string | null }, patch: Record<string, unknown>) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("employee_import_runs")
    .update({ status: state.status, owner_role: state.owner, next_action: state.nextAction, ...patch })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function getImportRun(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("employee_import_runs")
    .select("*, employee_import_rows(*)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function writeImportAudit(
  actor: AuthUser,
  runId: string,
  fromStatus: string | null,
  toStatus: string,
  state: { owner: string; nextAction: string | null },
  metadata: Record<string, unknown>,
  action = "employee_import.status_changed",
  reason?: string,
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    action,
    entityType: "employee_import_run",
    entityId: runId,
    fromStatus,
    toStatus,
    reason,
    metadata: {
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function buildValidationSummary(rows: Awaited<ReturnType<typeof validateRows>>["rows"]) {
  return {
    errorsByRow: rows
      .filter((row) => row.errors.length > 0)
      .map((row) => ({
        rowNumber: row.rowNumber,
        errors: row.errors,
      })),
  };
}
