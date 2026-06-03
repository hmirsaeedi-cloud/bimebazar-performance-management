import {
  buildCascadePath,
  calculateGoalProgress,
  getGoalState,
  goalActions,
  goalStatuses,
  transitionGoalState,
} from "@bimebazar/goals-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyGoalChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const goalSelect = `
  id,parent_goal_id,cascade_path,owner_user_id,created_by_user_id,status,owner_role,next_action,title,description,
  cycle,goal_type,key_results,progress_percent,visibility,submitted_at,approved_at,activated_at,returned_at,
  visibility_changed_at,completed_at,archived_at,last_return_reason,created_by,updated_by,created_at,updated_at
`;

export async function listGoals(input: { ownerUserId?: string; parentGoalId?: string; status?: string; cycle?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("goals").select(goalSelect).order("updated_at", { ascending: false });
  if (input.ownerUserId) query = query.eq("owner_user_id", input.ownerUserId);
  if (input.parentGoalId) query = query.eq("parent_goal_id", input.parentGoalId);
  if (input.status) query = query.eq("status", input.status);
  if (input.cycle) query = query.eq("cycle", input.cycle);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createGoal(input: {
  actor: AuthUser;
  parentGoalId?: string | null;
  ownerUserId: string;
  title: string;
  description?: string | null;
  cycle: string;
  goalType: string;
  keyResults: Array<Record<string, unknown>>;
  visibility: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const state = getGoalState(goalStatuses.DRAFT);
  const parent = input.parentGoalId ? await getGoal(input.parentGoalId) : null;
  const parentPath = parent?.cascade_path ?? [];
  const progress = calculateGoalProgress(input.keyResults);
  const { data, error } = await admin
    .from("goals")
    .insert({
      parent_goal_id: input.parentGoalId ?? null,
      cascade_path: parentPath,
      owner_user_id: input.ownerUserId,
      created_by_user_id: input.actor.id,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      title: input.title,
      description: input.description ?? null,
      cycle: input.cycle,
      goal_type: input.goalType,
      key_results: input.keyResults,
      progress_percent: progress,
      visibility: input.visibility,
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(goalSelect)
    .single();
  if (error) throw new Error(error.message);
  await setGoalCascadePath(data.id, parentPath);
  const hydrated = await getGoal(data.id);
  await auditGoal(input.actor, hydrated, "goals.created", null, state, { progressPercent: progress });
  await notifyGoalChanged(toGoalNotification(hydrated, "created"));
  return hydrated;
}

export async function updateGoal(input: { actor: AuthUser; id: string; patch: Record<string, unknown> }) {
  const current = await getGoal(input.id);
  const state = transitionGoalState(current.status, goalActions.UPDATE);
  const keyResults = (input.patch.keyResults as Array<Record<string, unknown>> | undefined) ?? current.key_results;
  const progress = calculateGoalProgress(keyResults);
  const dbPatch: Record<string, unknown> = {
    status: state.status,
    owner_role: state.owner,
    next_action: state.nextAction,
    progress_percent: progress,
    updated_by: input.actor.id,
    updated_at: new Date().toISOString(),
  };
  if ("title" in input.patch) dbPatch.title = input.patch.title;
  if ("description" in input.patch) dbPatch.description = input.patch.description ?? null;
  if ("cycle" in input.patch) dbPatch.cycle = input.patch.cycle;
  if ("goalType" in input.patch) dbPatch.goal_type = input.patch.goalType;
  if ("keyResults" in input.patch) dbPatch.key_results = keyResults;
  if ("visibility" in input.patch) dbPatch.visibility = input.patch.visibility;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("goals").update(dbPatch).eq("id", input.id).select(goalSelect).single();
  if (error) throw new Error(error.message);
  await auditGoal(input.actor, data, "goals.updated", current.status, state, { progressPercent: progress, changedFields: Object.keys(input.patch) });
  await notifyGoalChanged(toGoalNotification(data, "updated"));
  return data;
}

export async function submitGoal(input: { actor: AuthUser; id: string }) {
  return moveGoal(input.actor, input.id, goalActions.SUBMIT, "goals.submitted", "submitted", { submitted_at: new Date().toISOString() });
}

export async function approveGoal(input: { actor: AuthUser; id: string }) {
  return moveGoal(input.actor, input.id, goalActions.APPROVE, "goals.approved", "approved", { approved_at: new Date().toISOString() });
}

export async function activateGoal(input: { actor: AuthUser; id: string }) {
  return moveGoal(input.actor, input.id, goalActions.ACTIVATE, "goals.activated", "activated", { activated_at: new Date().toISOString() });
}

export async function returnGoal(input: { actor: AuthUser; id: string; reason: string }) {
  return moveGoal(input.actor, input.id, goalActions.RETURN, "goals.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function updateGoalVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  return moveGoal(input.actor, input.id, goalActions.OVERRIDE_VISIBILITY, "goals.visibility_changed", "visibility_changed", {
    visibility: input.visibility,
    visibility_changed_at: new Date().toISOString(),
  });
}

export async function completeGoal(input: { actor: AuthUser; id: string }) {
  return moveGoal(input.actor, input.id, goalActions.COMPLETE, "goals.completed", "completed", { completed_at: new Date().toISOString() });
}

export async function archiveGoal(input: { actor: AuthUser; id: string }) {
  return moveGoal(input.actor, input.id, goalActions.ARCHIVE, "goals.archived", "archived", { archived_at: new Date().toISOString() });
}

async function getGoal(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("goals").select(goalSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function setGoalCascadePath(id: string, parentPath: string[]) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("goals").update({ cascade_path: buildCascadePath(parentPath, id) }).eq("id", id);
  if (error) throw new Error(error.message);
}

async function moveGoal(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyGoalChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  const current = await getGoal(id);
  const state = transitionGoalState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const { data, error } = await admin
    .from("goals")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(goalSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditGoal(actor, data, auditAction, current.status, state, { reason, progressPercent: data.progress_percent });
  await notifyGoalChanged(toGoalNotification(data, notificationAction));
  return data;
}

async function auditGoal(actor: AuthUser, goal: { id: string; owner_user_id: string; parent_goal_id?: string | null; cascade_path?: string[]; goal_type: string; cycle: string }, action: string, fromStatus: string | null, state: { status: string; owner: string; nextAction: string | null }, metadata: Record<string, unknown>) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: goal.owner_user_id,
    action,
    entityType: "goal",
    entityId: goal.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      parentGoalId: goal.parent_goal_id ?? null,
      cascadePath: goal.cascade_path ?? [],
      goalType: goal.goal_type,
      cycle: goal.cycle,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toGoalNotification(goal: { id: string; owner_user_id: string; status: string; owner_role: string; next_action: string | null; progress_percent: number }, action: Parameters<typeof notifyGoalChanged>[0]["action"]) {
  return {
    goalId: goal.id,
    ownerUserId: goal.owner_user_id,
    status: goal.status,
    owner: goal.owner_role,
    nextAction: goal.next_action,
    progressPercent: goal.progress_percent,
    action,
  };
}
