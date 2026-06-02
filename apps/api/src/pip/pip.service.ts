import {
  getPipState,
  normalizePipPlan,
  pipActions,
  pipStatuses,
  transitionPipState,
} from "@bimebazar/pip-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyPipChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const pipSelect = `
  id,employee_id,manager_id,hrbp_id,source_evaluation_id,status,owner_role,next_action,employee_visible,
  performance_concern,success_criteria,support_plan,start_date,due_date,checkpoints,visibility,
  submitted_at,hrbp_approved_at,visibility_activated_at,started_at,completed_at,returned_at,cancelled_at,visibility_changed_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

export async function listPipCases(input: { actor: AuthUser; employeeId?: string; managerId?: string; hrbpId?: string; status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("pip_cases").select(pipSelect).order("updated_at", { ascending: false });
  if (!input.actor.roles.includes("HR_ADMIN") && !input.actor.roles.includes("HRBP")) {
    query = query.or(`manager_id.eq.${input.actor.id},employee_id.eq.${input.actor.id}`);
  }
  if (input.employeeId) query = query.eq("employee_id", input.employeeId);
  if (input.managerId) query = query.eq("manager_id", input.managerId);
  if (input.hrbpId) query = query.eq("hrbp_id", input.hrbpId);
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPipCase(input: {
  actor: AuthUser;
  employeeId: string;
  managerId?: string | null;
  hrbpId?: string | null;
  sourceEvaluationId?: string | null;
  performanceConcern: string;
  successCriteria: string;
  supportPlan: string;
  startDate?: string | null;
  dueDate?: string | null;
  checkpoints?: Record<string, unknown>[];
}) {
  const admin = createSupabaseAdminClient();
  const state = getPipState(pipStatuses.DRAFT);
  const plan = normalizePipPlan(input);
  const { data, error } = await admin
    .from("pip_cases")
    .insert({
      employee_id: input.employeeId,
      manager_id: input.managerId ?? input.actor.id,
      hrbp_id: input.hrbpId ?? null,
      source_evaluation_id: input.sourceEvaluationId ?? null,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      employee_visible: state.employeeVisible,
      performance_concern: plan.performanceConcern,
      success_criteria: plan.successCriteria,
      support_plan: plan.supportPlan,
      start_date: input.startDate ?? null,
      due_date: input.dueDate ?? null,
      checkpoints: input.checkpoints ?? [],
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(pipSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPip(input.actor, data, "pip.created", null, state);
  await notifyPipChanged(toPipNotification(data, "created"));
  return data;
}

export async function updatePipCase(input: { actor: AuthUser; id: string; patch: Record<string, unknown> }) {
  const current = await getPipCase(input.id);
  const state = transitionPipState(current.status, pipActions.UPDATE);
  const plan = normalizePipPlan({
    performanceConcern: input.patch.performanceConcern ?? current.performance_concern,
    successCriteria: input.patch.successCriteria ?? current.success_criteria,
    supportPlan: input.patch.supportPlan ?? current.support_plan,
  });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pip_cases")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      employee_visible: state.employeeVisible,
      manager_id: input.patch.managerId ?? current.manager_id,
      hrbp_id: input.patch.hrbpId ?? current.hrbp_id,
      source_evaluation_id: input.patch.sourceEvaluationId ?? current.source_evaluation_id,
      performance_concern: plan.performanceConcern,
      success_criteria: plan.successCriteria,
      support_plan: plan.supportPlan,
      start_date: input.patch.startDate ?? current.start_date,
      due_date: input.patch.dueDate ?? current.due_date,
      checkpoints: input.patch.checkpoints ?? current.checkpoints,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(pipSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPip(input.actor, data, "pip.updated", current.status, state);
  await notifyPipChanged(toPipNotification(data, "updated"));
  return data;
}

export async function submitPipCase(input: { actor: AuthUser; id: string }) {
  return movePip(input.actor, input.id, pipActions.SUBMIT, "pip.submitted", "submitted", { submitted_at: new Date().toISOString() });
}

export async function approvePipCase(input: { actor: AuthUser; id: string }) {
  return movePip(input.actor, input.id, pipActions.APPROVE, "pip.approved", "approved", { hrbp_approved_at: new Date().toISOString() });
}

export async function activatePipVisibility(input: { actor: AuthUser; id: string }) {
  const data = await movePip(input.actor, input.id, pipActions.ACTIVATE_VISIBILITY, "pip.visibility_activated", "visibility_activated", {
    visibility_activated_at: new Date().toISOString(),
    visibility: { employeeCanView: true, managerCanView: true, hrbpCanView: true, hrAdminCanView: true },
  });
  await auditPip(input.actor, data, "pip.visibility_changed", pipStatuses.HRBP_APPROVED, getPipState(data.status), {
    activatedBy: input.actor.id,
  });
  return data;
}

export async function startPipCase(input: { actor: AuthUser; id: string }) {
  return movePip(input.actor, input.id, pipActions.START, "pip.started", "started", { started_at: new Date().toISOString() });
}

export async function completePipCase(input: { actor: AuthUser; id: string }) {
  return movePip(input.actor, input.id, pipActions.COMPLETE, "pip.completed", "completed", { completed_at: new Date().toISOString() });
}

export async function returnPipCase(input: { actor: AuthUser; id: string; reason: string }) {
  return movePip(input.actor, input.id, pipActions.RETURN, "pip.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function cancelPipCase(input: { actor: AuthUser; id: string }) {
  return movePip(input.actor, input.id, pipActions.CANCEL, "pip.cancelled", "cancelled", { cancelled_at: new Date().toISOString() });
}

export async function updatePipVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  const current = await getPipCase(input.id);
  const state = transitionPipState(current.status, pipActions.OVERRIDE_VISIBILITY);
  const employeeVisible = input.visibility.employeeCanView === true && current.status !== pipStatuses.CANCELLED;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pip_cases")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      employee_visible: employeeVisible,
      visibility: input.visibility,
      visibility_changed_at: new Date().toISOString(),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(pipSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPip(input.actor, data, "pip.visibility_changed", current.status, state, { from: current.visibility, to: data.visibility });
  await notifyPipChanged(toPipNotification(data, "visibility_changed"));
  return data;
}

async function getPipCase(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("pip_cases").select(pipSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function movePip(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyPipChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const current = await getPipCase(id);
  const state = transitionPipState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pip_cases")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      employee_visible: state.employeeVisible,
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(pipSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPip(actor, data, auditAction, current.status, state, { reason });
  await notifyPipChanged(toPipNotification(data, notificationAction));
  return data;
}

async function auditPip(
  actor: AuthUser,
  pipCase: { id: string; employee_id: string; source_evaluation_id?: string | null; employee_visible?: boolean },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null; employeeVisible: boolean },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: pipCase.employee_id,
    action,
    entityType: "pip_case",
    entityId: pipCase.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      sourceEvaluationId: pipCase.source_evaluation_id ?? null,
      owner: state.owner,
      nextAction: state.nextAction,
      employeeVisible: pipCase.employee_visible ?? state.employeeVisible,
      ...metadata,
    },
  });
}

function toPipNotification(
  pipCase: { id: string; employee_id: string; manager_id?: string | null; hrbp_id?: string | null; status: string; owner_role: string; next_action: string | null; employee_visible: boolean },
  action: Parameters<typeof notifyPipChanged>[0]["action"],
) {
  return {
    pipCaseId: pipCase.id,
    employeeId: pipCase.employee_id,
    managerId: pipCase.manager_id ?? null,
    hrbpId: pipCase.hrbp_id ?? null,
    status: pipCase.status,
    owner: pipCase.owner_role,
    nextAction: pipCase.next_action,
    employeeVisible: pipCase.employee_visible,
    action,
  };
}
