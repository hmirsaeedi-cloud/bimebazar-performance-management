import {
  getPromotionState,
  normalizePromotionPayload,
  promotionActions,
  promotionStatuses,
  transitionPromotionState,
} from "@bimebazar/promotion-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyPromotionChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const promotionSelect = `
  id,employee_id,manager_id,hrbp_id,source_evaluation_id,status,owner_role,next_action,
  current_level,proposed_level,current_title,proposed_title,effective_date,rationale,evidence,visibility,
  submitted_at,manager_approved_at,hrbp_approved_at,approved_at,returned_at,cancelled_at,visibility_changed_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

export async function listPromotionCases(input: {
  actor: AuthUser;
  employeeId?: string;
  managerId?: string;
  hrbpId?: string;
  status?: string;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("promotion_cases").select(promotionSelect).order("updated_at", { ascending: false });
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

export async function createPromotionCase(input: {
  actor: AuthUser;
  employeeId: string;
  managerId?: string | null;
  hrbpId?: string | null;
  sourceEvaluationId?: string | null;
  currentLevel?: string | null;
  proposedLevel: string;
  currentTitle?: string | null;
  proposedTitle?: string | null;
  effectiveDate?: string | null;
  rationale: string;
  evidence?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const state = getPromotionState(promotionStatuses.DRAFT);
  const payload = normalizePromotionPayload(input);
  const { data, error } = await admin
    .from("promotion_cases")
    .insert({
      employee_id: input.employeeId,
      manager_id: input.managerId ?? input.actor.id,
      hrbp_id: input.hrbpId ?? null,
      source_evaluation_id: input.sourceEvaluationId ?? null,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      current_level: payload.currentLevel || null,
      proposed_level: payload.proposedLevel,
      current_title: input.currentTitle ?? null,
      proposed_title: input.proposedTitle ?? null,
      effective_date: input.effectiveDate ?? null,
      rationale: payload.rationale,
      evidence: input.evidence ?? {},
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(promotionSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPromotion(input.actor, data, "promotion.created", null, state);
  await notifyPromotionChanged(toPromotionNotification(data, "created"));
  return data;
}

export async function updatePromotionCase(input: { actor: AuthUser; id: string; patch: Record<string, unknown> }) {
  const current = await getPromotionCase(input.id);
  const state = transitionPromotionState(current.status, promotionActions.UPDATE);
  const payload = normalizePromotionPayload({
    currentLevel: input.patch.currentLevel ?? current.current_level,
    proposedLevel: input.patch.proposedLevel ?? current.proposed_level,
    rationale: input.patch.rationale ?? current.rationale,
  });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("promotion_cases")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      manager_id: input.patch.managerId ?? current.manager_id,
      hrbp_id: input.patch.hrbpId ?? current.hrbp_id,
      source_evaluation_id: input.patch.sourceEvaluationId ?? current.source_evaluation_id,
      current_level: payload.currentLevel || null,
      proposed_level: payload.proposedLevel,
      current_title: input.patch.currentTitle ?? current.current_title,
      proposed_title: input.patch.proposedTitle ?? current.proposed_title,
      effective_date: input.patch.effectiveDate ?? current.effective_date,
      rationale: payload.rationale,
      evidence: input.patch.evidence ?? current.evidence,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(promotionSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPromotion(input.actor, data, "promotion.updated", current.status, state);
  await notifyPromotionChanged(toPromotionNotification(data, "updated"));
  return data;
}

export async function submitPromotionCase(input: { actor: AuthUser; id: string }) {
  return movePromotion(input.actor, input.id, promotionActions.SUBMIT, "promotion.submitted", "submitted", {
    submitted_at: new Date().toISOString(),
  });
}

export async function managerApprovePromotionCase(input: { actor: AuthUser; id: string }) {
  return movePromotion(input.actor, input.id, promotionActions.MANAGER_APPROVE, "promotion.manager_approved", "manager_approved", {
    manager_approved_at: new Date().toISOString(),
  });
}

export async function hrbpApprovePromotionCase(input: { actor: AuthUser; id: string }) {
  return movePromotion(input.actor, input.id, promotionActions.HRBP_APPROVE, "promotion.hrbp_approved", "hrbp_approved", {
    hrbp_approved_at: new Date().toISOString(),
  });
}

export async function approvePromotionCase(input: { actor: AuthUser; id: string }) {
  return movePromotion(input.actor, input.id, promotionActions.APPROVE, "promotion.approved", "approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function returnPromotionCase(input: { actor: AuthUser; id: string; reason: string }) {
  return movePromotion(input.actor, input.id, promotionActions.RETURN, "promotion.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function cancelPromotionCase(input: { actor: AuthUser; id: string }) {
  return movePromotion(input.actor, input.id, promotionActions.CANCEL, "promotion.cancelled", "cancelled", {
    cancelled_at: new Date().toISOString(),
  });
}

export async function updatePromotionVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  const current = await getPromotionCase(input.id);
  const state = transitionPromotionState(current.status, promotionActions.OVERRIDE_VISIBILITY);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("promotion_cases")
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
    .select(promotionSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPromotion(input.actor, data, "promotion.visibility_changed", current.status, state, {
    from: current.visibility,
    to: data.visibility,
  });
  await notifyPromotionChanged(toPromotionNotification(data, "visibility_changed"));
  return data;
}

async function getPromotionCase(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("promotion_cases").select(promotionSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function movePromotion(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyPromotionChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const current = await getPromotionCase(id);
  const state = transitionPromotionState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("promotion_cases")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(promotionSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPromotion(actor, data, auditAction, current.status, state, { reason });
  await notifyPromotionChanged(toPromotionNotification(data, notificationAction));
  return data;
}

async function auditPromotion(
  actor: AuthUser,
  promotionCase: { id: string; employee_id: string; source_evaluation_id?: string | null; proposed_level?: string | null },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: promotionCase.employee_id,
    action,
    entityType: "promotion_case",
    entityId: promotionCase.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      sourceEvaluationId: promotionCase.source_evaluation_id ?? null,
      proposedLevel: promotionCase.proposed_level ?? null,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toPromotionNotification(
  promotionCase: { id: string; employee_id: string; manager_id?: string | null; hrbp_id?: string | null; status: string; owner_role: string; next_action: string | null; proposed_level?: string | null },
  action: Parameters<typeof notifyPromotionChanged>[0]["action"],
) {
  return {
    promotionCaseId: promotionCase.id,
    employeeId: promotionCase.employee_id,
    managerId: promotionCase.manager_id ?? null,
    hrbpId: promotionCase.hrbp_id ?? null,
    status: promotionCase.status,
    owner: promotionCase.owner_role,
    nextAction: promotionCase.next_action,
    proposedLevel: promotionCase.proposed_level ?? null,
    action,
  };
}
