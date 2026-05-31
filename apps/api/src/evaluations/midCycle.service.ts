import {
  calculateWeightedScore,
  midCycleActions,
  midCycleStatuses,
  getMidCycleState,
  transitionMidCycleState,
} from "@bimebazar/mid-cycle-evaluation-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyMidCycleEvaluationChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const midCycleSelect = `
  id,process_id,participant_id,employee_id,manager_id,hrbp_id,form_template_version_id,locked_form_schema,
  status,owner_role,next_action,answers,score,score_engine_version,score_calculated_at,visibility,
  submitted_at,manager_approved_at,hrbp_approved_at,returned_at,visibility_changed_at,completed_at,
  last_return_reason,created_by,updated_by,created_at,updated_at
`;

export async function listMidCycleEvaluations(input: { processId?: string; employeeId?: string; status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("mid_cycle_evaluations").select(midCycleSelect).order("updated_at", { ascending: false });
  if (input.processId) query = query.eq("process_id", input.processId);
  if (input.employeeId) query = query.eq("employee_id", input.employeeId);
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMidCycleEvaluation(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("mid_cycle_evaluations").select(midCycleSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createMidCycleEvaluation(input: {
  actor: AuthUser;
  processId?: string | null;
  participantId?: string | null;
  employeeId: string;
  managerId?: string | null;
  hrbpId?: string | null;
  formTemplateVersionId: string;
}) {
  const admin = createSupabaseAdminClient();
  const formVersion = await getFormVersionSnapshot(input.formTemplateVersionId);
  const state = getMidCycleState(midCycleStatuses.DRAFT);
  const { data, error } = await admin
    .from("mid_cycle_evaluations")
    .insert({
      process_id: input.processId ?? null,
      participant_id: input.participantId ?? null,
      employee_id: input.employeeId,
      manager_id: input.managerId ?? input.actor.id,
      hrbp_id: input.hrbpId ?? null,
      form_template_version_id: formVersion.id,
      locked_form_schema: formVersion.schema,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      score: calculateWeightedScore(formVersion.schema, {}, { reveal: false }),
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(midCycleSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditMidCycle(input.actor, data, "evaluation.mid_cycle_created", null, state, {
    lockedFormTemplateVersionId: formVersion.id,
    lockedFormVersionNumber: formVersion.version_number,
  });
  await notifyMidCycleEvaluationChanged(toMidCycleNotification(data, "created"));
  return data;
}

export async function updateMidCycleEvaluation(input: { actor: AuthUser; id: string; answers: Record<string, unknown> }) {
  const current = await getMidCycleEvaluation(input.id);
  const state = transitionMidCycleState(current.status, midCycleActions.UPDATE_DRAFT);
  return saveMidCycleAnswers(input.actor, current, input.answers, state, "evaluation.mid_cycle_updated", false);
}

export async function submitMidCycleEvaluation(input: { actor: AuthUser; id: string; answers: Record<string, unknown> }) {
  const current = await getMidCycleEvaluation(input.id);
  const state = transitionMidCycleState(current.status, midCycleActions.SUBMIT);
  return saveMidCycleAnswers(input.actor, current, input.answers, state, "evaluation.mid_cycle_submitted", true);
}

export async function calculateMidCycleScore(input: { id: string; answers: Record<string, unknown>; reveal?: boolean }) {
  const current = await getMidCycleEvaluation(input.id);
  return calculateWeightedScore(current.locked_form_schema, input.answers, { reveal: input.reveal === true });
}

export async function approveMidCycleManager(input: { actor: AuthUser; id: string }) {
  return moveMidCycle(input.actor, input.id, midCycleActions.MANAGER_APPROVE, "evaluation.mid_cycle_manager_approved", "manager_approved", {
    manager_approved_at: new Date().toISOString(),
  });
}

export async function approveMidCycleHrbp(input: { actor: AuthUser; id: string }) {
  return moveMidCycle(input.actor, input.id, midCycleActions.HRBP_APPROVE, "evaluation.mid_cycle_hrbp_approved", "hrbp_approved", {
    hrbp_approved_at: new Date().toISOString(),
  });
}

export async function returnMidCycleEvaluation(input: { actor: AuthUser; id: string; reason: string }) {
  return moveMidCycle(input.actor, input.id, midCycleActions.RETURN, "evaluation.mid_cycle_returned", "returned", {
    reason: input.reason,
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
  });
}

export async function updateMidCycleVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  return moveMidCycle(input.actor, input.id, midCycleActions.OVERRIDE_VISIBILITY, "evaluation.mid_cycle_visibility_changed", "visibility_changed", {
    visibility: input.visibility,
    visibility_changed_at: new Date().toISOString(),
  });
}

export async function completeMidCycleEvaluation(input: { actor: AuthUser; id: string }) {
  return moveMidCycle(input.actor, input.id, midCycleActions.COMPLETE, "evaluation.mid_cycle_completed", "completed", { completed_at: new Date().toISOString() });
}

async function saveMidCycleAnswers(actor: AuthUser, current: any, answers: Record<string, unknown>, state: { status: string; owner: string; nextAction: string | null }, action: string, revealScore: boolean) {
  const admin = createSupabaseAdminClient();
  const score = calculateWeightedScore(current.locked_form_schema, answers, { reveal: revealScore });
  const { data, error } = await admin
    .from("mid_cycle_evaluations")
    .update({
      answers,
      score,
      score_engine_version: score.engineVersion,
      score_calculated_at: new Date().toISOString(),
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      submitted_at: revealScore ? new Date().toISOString() : current.submitted_at,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .select(midCycleSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditMidCycle(actor, data, action, current.status, state, {
    answerKeys: Object.keys(answers),
    scoreVisible: score.visible,
    scoreEngineVersion: score.engineVersion,
    scoreMode: score.mode,
    totalScore: score.totalScore,
  });
  await writeMidCycleScoreSnapshot({ actor, evaluation: data, score, answers });
  await notifyMidCycleEvaluationChanged(toMidCycleNotification(data, revealScore ? "submitted" : "updated"));
  return data;
}

async function moveMidCycle(actor: AuthUser, id: string, workflowAction: string, auditAction: string, notificationAction: "manager_approved" | "hrbp_approved" | "returned" | "visibility_changed" | "completed", patch: Record<string, unknown>) {
  const admin = createSupabaseAdminClient();
  const current = await getMidCycleEvaluation(id);
  const state = transitionMidCycleState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const { data, error } = await admin
    .from("mid_cycle_evaluations")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(midCycleSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditMidCycle(actor, data, auditAction, current.status, state, { reason, visibility: data.visibility });
  await notifyMidCycleEvaluationChanged(toMidCycleNotification(data, notificationAction));
  return data;
}

async function getFormVersionSnapshot(versionId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("form_template_versions").select("id,version_number,status,schema").eq("id", versionId).single();
  if (error) throw new Error(error.message);
  return data;
}

async function writeMidCycleScoreSnapshot(input: {
  actor: AuthUser;
  evaluation: { id: string };
  score: { engineVersion: string; mode: string; visible: boolean; totalScore: number | null; weightTotal: number; sections: unknown[] };
  answers: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("mid_cycle_score_snapshots").insert({
    evaluation_id: input.evaluation.id,
    engine_version: input.score.engineVersion,
    mode: input.score.mode,
    visible: input.score.visible,
    total_score: input.score.totalScore,
    weight_total: input.score.weightTotal,
    sections: input.score.sections,
    answers_hash: String(JSON.stringify(input.answers).length),
    created_by: input.actor.id,
  });
  if (error) throw new Error(error.message);
}

async function auditMidCycle(actor: AuthUser, evaluation: { id: string; employee_id: string; process_id?: string | null }, action: string, fromStatus: string | null, state: { status: string; owner: string; nextAction: string | null }, metadata: Record<string, unknown>) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: evaluation.employee_id,
    action,
    entityType: "mid_cycle_evaluation",
    entityId: evaluation.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      processId: evaluation.process_id ?? null,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toMidCycleNotification(evaluation: { id: string; process_id?: string | null; employee_id: string; status: string; owner_role: string; next_action: string | null }, action: Parameters<typeof notifyMidCycleEvaluationChanged>[0]["action"]) {
  return {
    evaluationId: evaluation.id,
    processId: evaluation.process_id ?? null,
    employeeId: evaluation.employee_id,
    status: evaluation.status,
    owner: evaluation.owner_role,
    nextAction: evaluation.next_action,
    action,
  };
}
