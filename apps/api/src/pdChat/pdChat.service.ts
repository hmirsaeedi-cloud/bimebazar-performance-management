import {
  appendChatMessage,
  getPdChatAttachmentState,
  pdChatActions,
  pdChatAttachmentActions,
  pdChatAttachmentStatuses,
  pdChatStatuses,
  getPdChatState,
  transitionPdChatAttachmentState,
  transitionPdChatState,
} from "@bimebazar/pd-chat-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyPdChatAttachmentChanged, notifyPdChatChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const pdChatSelect = `
  id,process_id,employee_id,manager_id,evaluation_id,status,owner_role,next_action,topic,messages,visibility,
  attached_evaluation_type,attached_evaluation_id,attached_at,
  submitted_at,approved_at,returned_at,visibility_changed_at,archived_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

const pdChatAttachmentSelect = `
  id,pd_chat_log_id,process_id,employee_id,manager_id,evaluation_type,evaluation_id,status,owner_role,next_action,
  match_strategy,attached_by,attached_at,metadata,created_at,updated_at
`;

export async function listPdChats(input: { processId?: string; employeeId?: string; managerId?: string; evaluationId?: string; status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("pd_chat_logs").select(pdChatSelect).order("updated_at", { ascending: false });
  if (input.processId) query = query.eq("process_id", input.processId);
  if (input.employeeId) query = query.eq("employee_id", input.employeeId);
  if (input.managerId) query = query.eq("manager_id", input.managerId);
  if (input.evaluationId) query = query.or(`evaluation_id.eq.${input.evaluationId},attached_evaluation_id.eq.${input.evaluationId}`);
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

export async function autoAttachPdChatToEvaluation(input: {
  actor: AuthUser;
  processId?: string | null;
  employeeId: string;
  managerId?: string | null;
  evaluationType: "end_cycle_evaluation" | "mid_cycle_evaluation" | "downward_evaluation";
  evaluationId: string;
}) {
  const admin = createSupabaseAdminClient();
  const matchedChat = await findAttachablePdChat({
    employeeId: input.employeeId,
    processId: input.processId ?? null,
    evaluationId: input.evaluationId,
  });
  const initialState = getPdChatAttachmentState(pdChatAttachmentStatuses.MATCHED);
  const state = matchedChat
    ? transitionPdChatAttachmentState(initialState.status, pdChatAttachmentActions.AUTO_ATTACH)
    : transitionPdChatAttachmentState(initialState.status, pdChatAttachmentActions.MARK_MISSING);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("pd_chat_evaluation_attachments")
    .upsert({
      pd_chat_log_id: matchedChat?.id ?? null,
      process_id: input.processId ?? matchedChat?.process_id ?? null,
      employee_id: input.employeeId,
      manager_id: input.managerId ?? matchedChat?.manager_id ?? null,
      evaluation_type: input.evaluationType,
      evaluation_id: input.evaluationId,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      match_strategy: input.processId ? "employee_process_latest_visible" : "employee_latest_visible",
      attached_by: matchedChat ? input.actor.id : null,
      attached_at: matchedChat ? now : null,
      metadata: {
        source: "auto_attach",
        matchedChatStatus: matchedChat?.status ?? null,
        matchedChatTopic: matchedChat?.topic ?? null,
      },
      updated_at: now,
    }, { onConflict: "evaluation_type,evaluation_id" })
    .select(pdChatAttachmentSelect)
    .single();
  if (error) throw new Error(error.message);

  await updateEvaluationAttachedPdChat({
    evaluationType: input.evaluationType,
    evaluationId: input.evaluationId,
    chatId: matchedChat?.id ?? null,
  });
  if (matchedChat) {
    await markPdChatAttached({
      chatId: matchedChat.id,
      evaluationType: input.evaluationType,
      evaluationId: input.evaluationId,
      actorId: input.actor.id,
      attachedAt: now,
    });
  }
  await auditPdChatAttachment({
    actor: input.actor,
    attachment: data,
    action: matchedChat ? "pd_chat.auto_attached_to_evaluation" : "pd_chat.auto_attach_missing",
    fromStatus: initialState.status,
    toState: state,
  });
  await notifyPdChatAttachmentChanged(toPdChatAttachmentNotification(data, matchedChat ? "attached" : "missing_chat"));
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

async function findAttachablePdChat(input: { employeeId: string; processId?: string | null; evaluationId: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("pd_chat_logs")
    .select("id,process_id,employee_id,manager_id,evaluation_id,status,topic,visibility,updated_at")
    .eq("employee_id", input.employeeId)
    .neq("status", pdChatStatuses.ARCHIVED)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (input.processId) {
    query = query.or(`process_id.eq.${input.processId},evaluation_id.eq.${input.evaluationId},attached_evaluation_id.eq.${input.evaluationId}`);
  } else {
    query = query.or(`evaluation_id.eq.${input.evaluationId},attached_evaluation_id.eq.${input.evaluationId},process_id.is.null`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

async function updateEvaluationAttachedPdChat(input: { evaluationType: "end_cycle_evaluation" | "mid_cycle_evaluation" | "downward_evaluation"; evaluationId: string; chatId: string | null }) {
  const admin = createSupabaseAdminClient();
  const table = {
    end_cycle_evaluation: "end_cycle_evaluations",
    mid_cycle_evaluation: "mid_cycle_evaluations",
    downward_evaluation: "process_downward_evaluations",
  }[input.evaluationType];
  const { error } = await admin
    .from(table)
    .update({ attached_pd_chat_id: input.chatId, updated_at: new Date().toISOString() })
    .eq("id", input.evaluationId);
  if (error) throw new Error(error.message);
}

async function markPdChatAttached(input: { chatId: string; evaluationType: string; evaluationId: string; actorId: string; attachedAt: string }) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("pd_chat_logs")
    .update({
      evaluation_id: input.evaluationId,
      attached_evaluation_type: input.evaluationType,
      attached_evaluation_id: input.evaluationId,
      attached_at: input.attachedAt,
      updated_by: input.actorId,
      updated_at: input.attachedAt,
    })
    .eq("id", input.chatId);
  if (error) throw new Error(error.message);
}

async function auditPdChatAttachment(input: {
  actor: AuthUser;
  attachment: {
    id: string;
    pd_chat_log_id?: string | null;
    process_id?: string | null;
    employee_id: string;
    manager_id?: string | null;
    evaluation_type: string;
    evaluation_id: string;
    match_strategy?: string | null;
  };
  action: string;
  fromStatus: string | null;
  toState: { status: string; owner: string; nextAction: string | null };
}) {
  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: input.attachment.employee_id,
    action: input.action,
    entityType: "pd_chat_evaluation_attachment",
    entityId: input.attachment.id,
    fromStatus: input.fromStatus,
    toStatus: input.toState.status,
    metadata: {
      chatId: input.attachment.pd_chat_log_id ?? null,
      processId: input.attachment.process_id ?? null,
      managerId: input.attachment.manager_id ?? null,
      evaluationType: input.attachment.evaluation_type,
      evaluationId: input.attachment.evaluation_id,
      matchStrategy: input.attachment.match_strategy,
      owner: input.toState.owner,
      nextAction: input.toState.nextAction,
    },
  });
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

function toPdChatAttachmentNotification(attachment: {
  id: string;
  pd_chat_log_id?: string | null;
  process_id?: string | null;
  employee_id: string;
  manager_id?: string | null;
  evaluation_type: "end_cycle_evaluation" | "mid_cycle_evaluation" | "downward_evaluation";
  evaluation_id: string;
  status: string;
  owner_role: string;
  next_action: string | null;
}, action: Parameters<typeof notifyPdChatAttachmentChanged>[0]["action"]) {
  return {
    attachmentId: attachment.id,
    chatId: attachment.pd_chat_log_id ?? null,
    processId: attachment.process_id ?? null,
    employeeId: attachment.employee_id,
    managerId: attachment.manager_id ?? null,
    evaluationType: attachment.evaluation_type,
    evaluationId: attachment.evaluation_id,
    status: attachment.status,
    owner: attachment.owner_role,
    nextAction: attachment.next_action,
    action,
  };
}
