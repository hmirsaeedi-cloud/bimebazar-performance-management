import {
  calculateWeightedScore,
  endCycleActions,
  endCycleStatuses,
  getEndCycleState,
  transitionEndCycleState,
} from "@bimebazar/end-cycle-evaluation-workflow";
import {
  buildSideBySideRows,
  comparisonActions,
  comparisonStatuses,
  getComparisonState,
  summarizeComparison,
  transitionComparisonState,
} from "@bimebazar/evaluation-comparison-workflow";
import {
  assertScoreMayBeFlagged,
  bandFlagActions,
  bandFlagStatuses,
  classifyPerformanceBand,
  getBandFlagState,
  transitionBandFlagState,
} from "@bimebazar/performance-band-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import { notifyEvaluationChanged, notifyEvaluationComparisonChanged, notifyPerformanceBandFlagChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import type { AuthUser } from "../auth/auth.types.js";

const evaluationSelect = `
  id,process_id,participant_id,employee_id,manager_id,hrbp_id,form_template_version_id,locked_form_schema,
  next_level_manager_id,head_reviewer_id,status,owner_role,next_action,answers,score,score_engine_version,score_calculated_at,visibility,
  submitted_at,nl_approved_at,head_approved_at,hrbp_approved_at,approved_at,returned_at,completed_at,review_chain,
  last_return_reason,created_by,updated_by,created_at,updated_at
`;

const performanceBandFlagSelect = `
  id,evaluation_id,process_id,employee_id,manager_id,hrbp_id,flag_type,band_label,weighted_score,score_engine_version,
  section_contributions,thresholds,rationale,status,owner_role,next_action,visibility,submitted_at,approved_at,returned_at,
  converted_at,dismissed_at,visibility_changed_at,last_return_reason,dismissal_reason,conversion_target_type,conversion_target_id,
  created_by,updated_by,created_at,updated_at
`;

const evaluationComparisonSelect = `
  id,process_id,employee_id,manager_id,hrbp_id,self_assessment_id,manager_evaluation_id,form_template_version_id,
  locked_form_schema,status,owner_role,next_action,self_answers,manager_answers,comparison_rows,alignment_summary,
  self_score,manager_score,score_visible,visibility,submitted_at,approved_at,returned_at,visibility_changed_at,completed_at,
  last_return_reason,created_by,updated_by,created_at,updated_at
`;

export async function listEndCycleEvaluations(input: { processId?: string; employeeId?: string; status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("end_cycle_evaluations").select(evaluationSelect).order("updated_at", { ascending: false });
  if (input.processId) query = query.eq("process_id", input.processId);
  if (input.employeeId) query = query.eq("employee_id", input.employeeId);
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEndCycleEvaluation(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("end_cycle_evaluations").select(evaluationSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createEndCycleEvaluation(input: {
  actor: AuthUser;
  processId?: string | null;
  participantId?: string | null;
  employeeId: string;
  managerId?: string | null;
  hrbpId?: string | null;
  nextLevelManagerId?: string | null;
  headReviewerId?: string | null;
  formTemplateVersionId: string;
}) {
  const admin = createSupabaseAdminClient();
  const formVersion = await getFormVersionSnapshot(input.formTemplateVersionId);
  const state = getEndCycleState(endCycleStatuses.DRAFT);
  const { data, error } = await admin
    .from("end_cycle_evaluations")
    .insert({
      process_id: input.processId ?? null,
      participant_id: input.participantId ?? null,
      employee_id: input.employeeId,
      manager_id: input.managerId ?? input.actor.id,
      hrbp_id: input.hrbpId ?? null,
      next_level_manager_id: input.nextLevelManagerId ?? null,
      head_reviewer_id: input.headReviewerId ?? null,
      form_template_version_id: formVersion.id,
      locked_form_schema: formVersion.schema,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      review_chain: buildReviewChain(state.owner),
      score: calculateWeightedScore(formVersion.schema, {}, { reveal: false }),
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(evaluationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEvaluation(input.actor, data, "evaluation.created", null, state, {
    lockedFormTemplateVersionId: formVersion.id,
    lockedFormVersionNumber: formVersion.version_number,
  });
  await notifyEvaluationChanged(toEvaluationNotification(data, "created"));
  return data;
}

export async function updateEndCycleEvaluation(input: { actor: AuthUser; id: string; answers: Record<string, unknown> }) {
  const current = await getEndCycleEvaluation(input.id);
  const state = transitionEndCycleState(current.status, endCycleActions.UPDATE_DRAFT);
  return saveEvaluationAnswers(input.actor, current, input.answers, state, "evaluation.updated", false);
}

export async function submitEndCycleEvaluation(input: { actor: AuthUser; id: string; answers: Record<string, unknown> }) {
  const current = await getEndCycleEvaluation(input.id);
  const state = transitionEndCycleState(current.status, endCycleActions.SUBMIT);
  return saveEvaluationAnswers(input.actor, current, input.answers, state, "evaluation.submitted", true);
}

export async function calculateEndCycleScore(input: { id: string; answers: Record<string, unknown>; reveal?: boolean }) {
  const current = await getEndCycleEvaluation(input.id);
  return calculateWeightedScore(current.locked_form_schema, input.answers, { reveal: input.reveal === true });
}

export async function approveEndCycleEvaluation(input: { actor: AuthUser; id: string }) {
  return approveNextLevelEvaluation(input);
}

export async function approveNextLevelEvaluation(input: { actor: AuthUser; id: string }) {
  return moveEvaluation(input.actor, input.id, endCycleActions.NEXT_LEVEL_APPROVE, "evaluation.next_level_approved", "next_level_approved", {
    nl_approved_at: new Date().toISOString(),
  });
}

export async function approveHeadEvaluation(input: { actor: AuthUser; id: string }) {
  return moveEvaluation(input.actor, input.id, endCycleActions.HEAD_APPROVE, "evaluation.head_approved", "head_approved", {
    head_approved_at: new Date().toISOString(),
  });
}

export async function approveHrbpEvaluation(input: { actor: AuthUser; id: string }) {
  const now = new Date().toISOString();
  return moveEvaluation(input.actor, input.id, endCycleActions.HRBP_APPROVE, "evaluation.hrbp_approved", "hrbp_approved", {
    hrbp_approved_at: now,
    approved_at: now,
  });
}

export async function returnEndCycleEvaluation(input: { actor: AuthUser; id: string; reason: string }) {
  return moveEvaluation(input.actor, input.id, endCycleActions.RETURN, "evaluation.returned", "returned", {
    reason: input.reason,
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
  });
}

export async function completeEndCycleEvaluation(input: { actor: AuthUser; id: string }) {
  return moveEvaluation(input.actor, input.id, endCycleActions.COMPLETE, "evaluation.completed", "completed", { completed_at: new Date().toISOString() });
}

export async function updateEndCycleVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient();
  const current = await getEndCycleEvaluation(input.id);
  const state = transitionEndCycleState(current.status, endCycleActions.OVERRIDE_VISIBILITY);
  const { data, error } = await admin
    .from("end_cycle_evaluations")
    .update({
      visibility: input.visibility,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      review_chain: buildReviewChain(state.owner),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(evaluationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEvaluation(input.actor, data, "evaluation.visibility_changed", current.status, state, { from: current.visibility, to: data.visibility });
  await notifyEvaluationChanged(toEvaluationNotification(data, "visibility_changed"));
  return data;
}

export async function listEvaluationComparisons(input: { processId?: string; employeeId?: string; status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("evaluation_comparisons").select(evaluationComparisonSelect).order("updated_at", { ascending: false });
  if (input.processId) query = query.eq("process_id", input.processId);
  if (input.employeeId) query = query.eq("employee_id", input.employeeId);
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createEvaluationComparison(input: {
  actor: AuthUser;
  selfAssessmentId: string;
  managerEvaluationId: string;
  revealScores?: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const selfAssessment = await getSelfAssessmentForComparison(input.selfAssessmentId);
  const managerEvaluation = await getEndCycleEvaluation(input.managerEvaluationId);
  if (selfAssessment.employee_id !== managerEvaluation.employee_id) {
    throw new Error("Self-assessment and manager evaluation must belong to the same employee");
  }
  const state = getComparisonState(comparisonStatuses.DRAFT);
  const comparison = buildComparisonPayload(selfAssessment, managerEvaluation, input.revealScores === true);
  const { data, error } = await admin
    .from("evaluation_comparisons")
    .upsert({
      process_id: managerEvaluation.process_id ?? selfAssessment.process_id ?? null,
      employee_id: managerEvaluation.employee_id,
      manager_id: managerEvaluation.manager_id ?? selfAssessment.manager_id ?? null,
      hrbp_id: managerEvaluation.hrbp_id ?? null,
      self_assessment_id: selfAssessment.id,
      manager_evaluation_id: managerEvaluation.id,
      form_template_version_id: managerEvaluation.form_template_version_id,
      locked_form_schema: managerEvaluation.locked_form_schema,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...comparison,
      created_by: input.actor.id,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "self_assessment_id,manager_evaluation_id" })
    .select(evaluationComparisonSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEvaluationComparison(input.actor, data, "evaluation.comparison.created", null, state, {
    scoreVisible: data.score_visible,
    alignmentSummary: data.alignment_summary,
  });
  await notifyEvaluationComparisonChanged(toComparisonNotification(data, "created"));
  return data;
}

export async function updateEvaluationComparison(input: { actor: AuthUser; id: string; notes?: string; revealScores?: boolean }) {
  const current = await getEvaluationComparison(input.id);
  const selfAssessment = await getSelfAssessmentForComparison(current.self_assessment_id);
  const managerEvaluation = await getEndCycleEvaluation(current.manager_evaluation_id);
  const state = transitionComparisonState(current.status, comparisonActions.UPDATE);
  const comparison = buildComparisonPayload(selfAssessment, managerEvaluation, input.revealScores === true);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("evaluation_comparisons")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...comparison,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(evaluationComparisonSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEvaluationComparison(input.actor, data, "evaluation.comparison.updated", current.status, state, {
    notes: input.notes ?? null,
    scoreVisible: data.score_visible,
    alignmentSummary: data.alignment_summary,
  });
  await notifyEvaluationComparisonChanged(toComparisonNotification(data, "updated"));
  return data;
}

export async function submitEvaluationComparison(input: { actor: AuthUser; id: string }) {
  const current = await getEvaluationComparison(input.id);
  const selfAssessment = await getSelfAssessmentForComparison(current.self_assessment_id);
  const managerEvaluation = await getEndCycleEvaluation(current.manager_evaluation_id);
  const comparison = buildComparisonPayload(selfAssessment, managerEvaluation, true);
  return moveEvaluationComparison(input.actor, input.id, comparisonActions.SUBMIT, "evaluation.comparison.submitted", "submitted", {
    submitted_at: new Date().toISOString(),
    ...comparison,
  });
}

export async function approveEvaluationComparison(input: { actor: AuthUser; id: string }) {
  return moveEvaluationComparison(input.actor, input.id, comparisonActions.APPROVE, "evaluation.comparison.approved", "approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function returnEvaluationComparison(input: { actor: AuthUser; id: string; reason: string }) {
  return moveEvaluationComparison(input.actor, input.id, comparisonActions.RETURN, "evaluation.comparison.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function updateEvaluationComparisonVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  return moveEvaluationComparison(input.actor, input.id, comparisonActions.OVERRIDE_VISIBILITY, "evaluation.comparison.visibility_changed", "visibility_changed", {
    visibility: input.visibility,
    visibility_changed_at: new Date().toISOString(),
  });
}

export async function completeEvaluationComparison(input: { actor: AuthUser; id: string }) {
  return moveEvaluationComparison(input.actor, input.id, comparisonActions.COMPLETE, "evaluation.comparison.completed", "completed", {
    completed_at: new Date().toISOString(),
  });
}

export async function listPerformanceBandFlags(input: { evaluationId?: string; employeeId?: string; flagType?: string; status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("performance_band_flags").select(performanceBandFlagSelect).order("updated_at", { ascending: false });
  if (input.evaluationId) query = query.eq("evaluation_id", input.evaluationId);
  if (input.employeeId) query = query.eq("employee_id", input.employeeId);
  if (input.flagType) query = query.eq("flag_type", input.flagType);
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function generatePerformanceBandFlag(input: { actor: AuthUser; evaluationId: string; thresholds?: { pipMax?: number; promotionMin?: number } }) {
  const admin = createSupabaseAdminClient();
  const evaluation = await getEndCycleEvaluation(input.evaluationId);
  assertScoreMayBeFlagged(evaluation.score);
  const classification = classifyPerformanceBand(evaluation.score.totalScore, input.thresholds ?? {});
  const state = getBandFlagState(bandFlagStatuses.DETECTED);
  const { data, error } = await admin
    .from("performance_band_flags")
    .upsert({
      evaluation_id: evaluation.id,
      process_id: evaluation.process_id ?? null,
      employee_id: evaluation.employee_id,
      manager_id: evaluation.manager_id ?? null,
      hrbp_id: evaluation.hrbp_id ?? null,
      flag_type: classification.flagType,
      band_label: classification.bandLabel,
      weighted_score: evaluation.score.totalScore,
      score_engine_version: evaluation.score_engine_version,
      section_contributions: evaluation.score.sections ?? [],
      thresholds: input.thresholds ?? { pipMax: 59.99, promotionMin: 90 },
      rationale: classification.rationale,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
      created_by: input.actor.id,
    }, { onConflict: "evaluation_id,flag_type" })
    .select(performanceBandFlagSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPerformanceBandFlag(input.actor, data, "evaluation.band_flag.created", null, state, {
    totalScore: evaluation.score.totalScore,
    scoreVisible: evaluation.score.visible,
    sectionContributionsVisible: true,
  });
  await notifyPerformanceBandFlagChanged(toBandFlagNotification(data, "created"));
  return data;
}

export async function updatePerformanceBandFlag(input: { actor: AuthUser; id: string; patch: { rationale?: string; thresholds?: Record<string, unknown> } }) {
  const admin = createSupabaseAdminClient();
  const current = await getPerformanceBandFlag(input.id);
  const state = transitionBandFlagState(current.status, bandFlagActions.UPDATE);
  const patch: Record<string, unknown> = {
    status: state.status,
    owner_role: state.owner,
    next_action: state.nextAction,
    updated_by: input.actor.id,
    updated_at: new Date().toISOString(),
  };
  if (input.patch.rationale) patch.rationale = input.patch.rationale;
  if (input.patch.thresholds) patch.thresholds = { ...(current.thresholds ?? {}), ...input.patch.thresholds };
  const { data, error } = await admin.from("performance_band_flags").update(patch).eq("id", input.id).select(performanceBandFlagSelect).single();
  if (error) throw new Error(error.message);
  await auditPerformanceBandFlag(input.actor, data, "evaluation.band_flag.updated", current.status, state, {
    thresholdChanged: Boolean(input.patch.thresholds),
  });
  await notifyPerformanceBandFlagChanged(toBandFlagNotification(data, "updated"));
  return data;
}

export async function submitPerformanceBandFlag(input: { actor: AuthUser; id: string }) {
  return movePerformanceBandFlag(input.actor, input.id, bandFlagActions.SUBMIT, "evaluation.band_flag.submitted", "submitted", {
    submitted_at: new Date().toISOString(),
  });
}

export async function approvePerformanceBandFlag(input: { actor: AuthUser; id: string }) {
  return movePerformanceBandFlag(input.actor, input.id, bandFlagActions.APPROVE, "evaluation.band_flag.approved", "approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function returnPerformanceBandFlag(input: { actor: AuthUser; id: string; reason: string }) {
  return movePerformanceBandFlag(input.actor, input.id, bandFlagActions.RETURN, "evaluation.band_flag.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function dismissPerformanceBandFlag(input: { actor: AuthUser; id: string; reason: string }) {
  return movePerformanceBandFlag(input.actor, input.id, bandFlagActions.DISMISS, "evaluation.band_flag.dismissed", "dismissed", {
    dismissed_at: new Date().toISOString(),
    dismissal_reason: input.reason,
    reason: input.reason,
  });
}

export async function convertPerformanceBandFlag(input: { actor: AuthUser; id: string; targetType: "pip" | "promotion"; targetId?: string | null }) {
  const current = await getPerformanceBandFlag(input.id);
  if (current.flag_type !== input.targetType) {
    throw new Error("Conversion target must match the detected performance band flag type");
  }
  return movePerformanceBandFlag(input.actor, input.id, bandFlagActions.CONVERT, "evaluation.band_flag.converted", "converted", {
    converted_at: new Date().toISOString(),
    conversion_target_type: input.targetType,
    conversion_target_id: input.targetId ?? null,
  });
}

export async function updatePerformanceBandFlagVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient();
  const current = await getPerformanceBandFlag(input.id);
  const state = transitionBandFlagState(current.status, bandFlagActions.OVERRIDE_VISIBILITY);
  const { data, error } = await admin
    .from("performance_band_flags")
    .update({
      visibility: input.visibility,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      visibility_changed_at: new Date().toISOString(),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(performanceBandFlagSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPerformanceBandFlag(input.actor, data, "evaluation.band_flag.visibility_changed", current.status, state, {
    from: current.visibility,
    to: data.visibility,
  });
  await notifyPerformanceBandFlagChanged(toBandFlagNotification(data, "visibility_changed"));
  return data;
}

async function saveEvaluationAnswers(actor: AuthUser, current: any, answers: Record<string, unknown>, state: { status: string; owner: string; nextAction: string | null }, action: string, revealScore: boolean) {
  const admin = createSupabaseAdminClient();
  const score = calculateWeightedScore(current.locked_form_schema, answers, { reveal: revealScore });
  const { data, error } = await admin
    .from("end_cycle_evaluations")
    .update({
      answers,
      score,
      score_engine_version: score.engineVersion,
      score_calculated_at: new Date().toISOString(),
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      review_chain: buildReviewChain(state.owner),
      submitted_at: revealScore ? new Date().toISOString() : current.submitted_at,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .select(evaluationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEvaluation(actor, data, action, current.status, state, {
    answerKeys: Object.keys(answers),
    scoreVisible: score.visible,
    scoreEngineVersion: score.engineVersion,
    scoreMode: score.mode,
    totalScore: score.totalScore,
  });
  await writeScoreSnapshot({ actor, evaluation: data, score, answers });
  await notifyEvaluationChanged(toEvaluationNotification(data, revealScore ? "submitted" : "updated"));
  return data;
}

async function moveEvaluation(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: "next_level_approved" | "head_approved" | "hrbp_approved" | "approved" | "returned" | "completed",
  patch: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  const current = await getEndCycleEvaluation(id);
  const state = transitionEndCycleState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const { data, error } = await admin
    .from("end_cycle_evaluations")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      review_chain: buildReviewChain(state.owner),
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(evaluationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEvaluation(actor, data, auditAction, current.status, state, { reason, reviewChain: data.review_chain });
  await notifyEvaluationChanged(toEvaluationNotification(data, notificationAction));
  return data;
}

async function getPerformanceBandFlag(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("performance_band_flags").select(performanceBandFlagSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getEvaluationComparison(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("evaluation_comparisons").select(evaluationComparisonSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getSelfAssessmentForComparison(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("process_self_assessments")
    .select("id,process_id,participant_id,employee_id,manager_id,form_template_version_id,locked_form_schema,status,responses")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

function buildComparisonPayload(selfAssessment: any, managerEvaluation: any, revealScores: boolean) {
  const selfAnswers = selfAssessment.responses ?? {};
  const managerAnswers = managerEvaluation.answers ?? {};
  const rows = buildSideBySideRows(managerEvaluation.locked_form_schema, selfAnswers, managerAnswers);
  return {
    self_answers: selfAnswers,
    manager_answers: managerAnswers,
    comparison_rows: rows,
    alignment_summary: summarizeComparison(rows),
    self_score: calculateWeightedScore(managerEvaluation.locked_form_schema, selfAnswers, { reveal: revealScores }),
    manager_score: calculateWeightedScore(managerEvaluation.locked_form_schema, managerAnswers, { reveal: revealScores }),
    score_visible: revealScores,
  };
}

async function moveEvaluationComparison(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyEvaluationComparisonChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  const current = await getEvaluationComparison(id);
  const state = transitionComparisonState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const { data, error } = await admin
    .from("evaluation_comparisons")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(evaluationComparisonSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEvaluationComparison(actor, data, auditAction, current.status, state, {
    reason,
    scoreVisible: data.score_visible,
    alignmentSummary: data.alignment_summary,
  });
  await notifyEvaluationComparisonChanged(toComparisonNotification(data, notificationAction));
  return data;
}

async function movePerformanceBandFlag(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyPerformanceBandFlagChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  const current = await getPerformanceBandFlag(id);
  const state = transitionBandFlagState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const { data, error } = await admin
    .from("performance_band_flags")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(performanceBandFlagSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPerformanceBandFlag(actor, data, auditAction, current.status, state, { reason });
  await notifyPerformanceBandFlagChanged(toBandFlagNotification(data, notificationAction));
  return data;
}

function buildReviewChain(currentStep: string) {
  return {
    steps: ["MANAGER", "NEXT_LEVEL_MANAGER", "HEAD", "HRBP", "SYSTEM"],
    currentStep,
  };
}

async function getFormVersionSnapshot(versionId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("form_template_versions")
    .select("id,version_number,status,schema")
    .eq("id", versionId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function writeScoreSnapshot(input: {
  actor: AuthUser;
  evaluation: { id: string };
  score: { engineVersion: string; mode: string; visible: boolean; totalScore: number | null; weightTotal: number; sections: unknown[] };
  answers: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("evaluation_score_snapshots").insert({
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

async function auditEvaluation(actor: AuthUser, evaluation: { id: string; employee_id: string; process_id?: string | null }, action: string, fromStatus: string | null, state: { status: string; owner: string; nextAction: string | null }, metadata: Record<string, unknown>) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: evaluation.employee_id,
    action,
    entityType: "end_cycle_evaluation",
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

async function auditPerformanceBandFlag(actor: AuthUser, flag: { id: string; evaluation_id: string; employee_id: string; flag_type: string; weighted_score: number; process_id?: string | null }, action: string, fromStatus: string | null, state: { status: string; owner: string; nextAction: string | null }, metadata: Record<string, unknown>) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: flag.employee_id,
    action,
    entityType: "performance_band_flag",
    entityId: flag.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      processId: flag.process_id ?? null,
      evaluationId: flag.evaluation_id,
      flagType: flag.flag_type,
      weightedScore: flag.weighted_score,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

async function auditEvaluationComparison(actor: AuthUser, comparison: { id: string; employee_id: string; process_id?: string | null; self_assessment_id?: string | null; manager_evaluation_id?: string | null }, action: string, fromStatus: string | null, state: { status: string; owner: string; nextAction: string | null }, metadata: Record<string, unknown>) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: comparison.employee_id,
    action,
    entityType: "evaluation_comparison",
    entityId: comparison.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      processId: comparison.process_id ?? null,
      selfAssessmentId: comparison.self_assessment_id ?? null,
      managerEvaluationId: comparison.manager_evaluation_id ?? null,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toEvaluationNotification(evaluation: { id: string; process_id?: string | null; employee_id: string; status: string; owner_role: string; next_action: string | null }, action: Parameters<typeof notifyEvaluationChanged>[0]["action"]) {
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

function toBandFlagNotification(flag: { id: string; evaluation_id: string; employee_id: string; flag_type: "pip" | "promotion" | "none"; status: string; owner_role: string; next_action: string | null }, action: Parameters<typeof notifyPerformanceBandFlagChanged>[0]["action"]) {
  return {
    flagId: flag.id,
    evaluationId: flag.evaluation_id,
    employeeId: flag.employee_id,
    flagType: flag.flag_type,
    status: flag.status,
    owner: flag.owner_role,
    nextAction: flag.next_action,
    action,
  };
}

function toComparisonNotification(comparison: { id: string; employee_id: string; status: string; owner_role: string; next_action: string | null; score_visible: boolean }, action: Parameters<typeof notifyEvaluationComparisonChanged>[0]["action"]) {
  return {
    comparisonId: comparison.id,
    employeeId: comparison.employee_id,
    status: comparison.status,
    owner: comparison.owner_role,
    nextAction: comparison.next_action,
    scoreVisible: comparison.score_visible,
    action,
  };
}
