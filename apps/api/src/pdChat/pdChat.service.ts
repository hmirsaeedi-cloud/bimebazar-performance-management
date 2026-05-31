import {
  appendChatMessage,
  pdChatActions,
  pdChatStatuses,
  getPdChatState,
  transitionPdChatState,
} from "@bimebazar/pd-chat-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyPdChatChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const pdChatSelect = `
  id,process_id,employee_id,manager_id,evaluation_id,status,owner_role,next_action,topic,messages,visibility,
  submitted_at,approved_at,returned_at,visibility_changed_at,archived_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

export async function listPdChats(input: { processId?: string; employeeId?: string; managerId?: string; status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("pd_chat_logs").select(pdChatSelect).order("updated_at", { ascending: false });
  if (input.processId) query = query.eq("process_id", input.processId);
  if (input.employeeId) query = query.eq("employee_id", input.employeeId);
  if (input.managerId) query = query.eq("manager_id", input.managerId);
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPdChat(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("pd_chat_logs").select(pdChatSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createPdChat(input: {
  actor: AuthUser;
  processId?: string | null;
  employeeId: string;
  managerId?: string | null;
  evaluationId?: string | null;
  topic: string;
  message: string;
}) {
  const admin = createSupabaseAdminClient();
  const state = getPdChatState(pdChatStatuses.DRAFT);
  const now = new Date().toISOString();
  const messages = appendChatMessage([], {
    id: crypto.randomUUID(),
    authorId: input.actor.id,
    authorRole: input.actor.role,
    body: input.message,
    createdAt: now,
  });
  const { data, error } = await admin
    .from("pd_chat_logs")
    .insert({
      process_id: input.processId ?? null,
      employee_id: input.employeeId,
      manager_id: input.managerId ?? null,
      evaluation_id: input.evaluationId ?? null,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      topic: input.topic,
      messages,
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(pdChatSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPdChat(input.actor, data, "pd_chat.created", null, state, { messageCount: messages.length });
  await notifyPdChatChanged(toPdChatNotification(data, "created"));
  return data;
}

export async function updatePdChat(input: { actor: AuthUser; id: string; message: string }) {
  const current = await getPdChat(input.id);
  const state = transitionPdChatState(current.status, pdChatActions.UPDATE);
  const now = new Date().toISOString();
  const messages = appendChatMessage(current.messages, {
    id: crypto.randomUUID(),
    authorId: input.actor.id,
    authorRole: input.actor.role,
    body: input.message,
    createdAt: now,
  });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pd_chat_logs")
    .update({
      messages,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(pdChatSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPdChat(input.actor, data, "pd_chat.updated", current.status, state, { messageCount: messages.length });
  await notifyPdChatChanged(toPdChatNotification(data, "updated"));
  return data;
}

export async function submitPdChat(input: { actor: AuthUser; id: string }) {
  return movePdChat(input.actor, input.id, pdChatActions.SUBMIT, "pd_chat.submitted", "submitted", { submitted_at: new Date().toISOString() });
}

export async function approvePdChat(input: { actor: AuthUser; id: string }) {
  return movePdChat(input.actor, input.id, pdChatActions.APPROVE, "pd_chat.approved", "approved", { approved_at: new Date().toISOString() });
}

export async function returnPdChat(input: { actor: AuthUser; id: string; reason: string }) {
  return movePdChat(input.actor, input.id, pdChatActions.RETURN, "pd_chat.returned", "returned", {
    reason: input.reason,
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
  });
}

export async function updatePdChatVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  return movePdChat(input.actor, input.id, pdChatActions.OVERRIDE_VISIBILITY, "pd_chat.visibility_changed", "visibility_changed", {
    visibility: input.visibility,
    visibility_changed_at: new Date().toISOString(),
  });
}

export async function archivePdChat(input: { actor: AuthUser; id: string }) {
  return movePdChat(input.actor, input.id, pdChatActions.ARCHIVE, "pd_chat.archived", "archived", { archived_at: new Date().toISOString() });
}

async function movePdChat(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: "submitted" | "approved" | "returned" | "visibility_changed" | "archived",
  patch: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  const current = await getPdChat(id);
  const state = transitionPdChatState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const { data, error } = await admin
    .from("pd_chat_logs")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(pdChatSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPdChat(actor, data, auditAction, current.status, state, { reason, visibility: data.visibility });
  await notifyPdChatChanged(toPdChatNotification(data, notificationAction));
  return data;
}

async function auditPdChat(actor: AuthUser, chat: { id: string; employee_id: string; process_id?: string | null; evaluation_id?: string | null }, action: string, fromStatus: string | null, state: { status: string; owner: string; nextAction: string | null }, metadata: Record<string, unknown>) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: chat.employee_id,
    action,
    entityType: "pd_chat_log",
    entityId: chat.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      processId: chat.process_id ?? null,
      evaluationId: chat.evaluation_id ?? null,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toPdChatNotification(chat: { id: string; process_id?: string | null; employee_id: string; manager_id?: string | null; status: string; owner_role: string; next_action: string | null }, action: Parameters<typeof notifyPdChatChanged>[0]["action"]) {
  return {
    chatId: chat.id,
    processId: chat.process_id ?? null,
    employeeId: chat.employee_id,
    managerId: chat.manager_id ?? null,
    status: chat.status,
    owner: chat.owner_role,
    nextAction: chat.next_action,
    action,
  };
}
