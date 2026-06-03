import {
  canReleaseAnonymousResponses,
  canResolveAnonymousZeroResponseRequest,
  feedbackActions,
  feedbackStatuses,
  getAnonymityGuardState,
  getFeedbackState,
  normalizeFeedbackQuestion,
  transitionFeedbackState,
} from "@bimebazar/feedback-workflow";
import {
  assertKudosRecipientsActive,
  getKudosFeedState,
  kudosFeedActions,
  kudosFeedStatuses,
  normalizeKudosMessage,
  transitionKudosFeedState,
} from "@bimebazar/kudos-feed-workflow";
import { randomUUID } from "node:crypto";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyFeedbackChanged, notifyKudosFeedChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const requestSelect = `
  id,requester_user_id,subject_user_id,status,owner_role,next_action,title,question,is_anonymous,visibility,
  due_at,extended_until,response_count,min_response_count,anonymity_status,anonymity_checked_at,responses_released_at,
  min_response_guard_reason,closed_reason,created_by,updated_by,submitted_at,visibility_changed_at,closed_at,created_at,updated_at
`;

const kudosSelect = `
  id,author_user_id,recipient_user_ids,status,owner_role,next_action,title,message,tags,visibility,
  submitted_at,approved_at,published_at,returned_at,visibility_changed_at,archived_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

export async function listActiveFeedbackRecipients() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,display_name,email,role_code,account_status")
    .eq("account_status", "active")
    .order("display_name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listFeedbackRequests(input: {
  actor: AuthUser;
  status?: string;
  requesterUserId?: string;
  recipientUserId?: string;
  subjectUserId?: string;
  anonymityStatus?: string;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("feedback_requests").select(requestSelect).order("updated_at", { ascending: false });
  if (!input.actor.roles.includes("HR_ADMIN") && !input.actor.roles.includes("HRBP")) {
    query = query.or(`requester_user_id.eq.${input.actor.id},subject_user_id.eq.${input.actor.id}`);
  }
  if (input.status) query = query.eq("status", input.status);
  if (input.anonymityStatus) query = query.eq("anonymity_status", input.anonymityStatus);
  if (input.requesterUserId) query = query.eq("requester_user_id", input.requesterUserId);
  if (input.subjectUserId) query = query.eq("subject_user_id", input.subjectUserId);
  if (input.recipientUserId) {
    const { data: recipientRows, error } = await admin
      .from("feedback_request_recipients")
      .select("feedback_request_id")
      .eq("recipient_user_id", input.recipientUserId);
    if (error) throw new Error(error.message);
    query = query.in("id", (recipientRows ?? []).map((row) => row.feedback_request_id));
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listKudosFeed(input: {
  actor: AuthUser;
  status?: string;
  recipientUserId?: string;
  authorUserId?: string;
  tag?: string;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("kudos_feed_items").select(kudosSelect).order("updated_at", { ascending: false });
  if (!input.actor.roles.includes("HR_ADMIN") && !input.actor.roles.includes("HRBP")) {
    query = query.or(`author_user_id.eq.${input.actor.id},recipient_user_ids.cs.{${input.actor.id}},status.eq.published`);
  }
  if (input.status) query = query.eq("status", input.status);
  if (input.authorUserId) query = query.eq("author_user_id", input.authorUserId);
  if (input.recipientUserId) query = query.contains("recipient_user_ids", [input.recipientUserId]);
  if (input.tag) query = query.contains("tags", [input.tag]);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createFeedbackRequest(input: {
  actor: AuthUser;
  subjectUserId?: string | null;
  recipientUserIds: string[];
  title: string;
  question: string;
  isAnonymous?: boolean;
  minResponseCount?: number;
  dueAt?: string | null;
}) {
  await assertRecipientsActive(input.recipientUserIds);
  const admin = createSupabaseAdminClient();
  const state = getFeedbackState(feedbackStatuses.DRAFT);
  const guard = getAnonymityGuardState({
    isAnonymous: input.isAnonymous ?? false,
    responseCount: 0,
    minResponseCount: input.isAnonymous ? input.minResponseCount ?? 3 : 1,
  });
  const { data, error } = await admin
    .from("feedback_requests")
    .insert({
      requester_user_id: input.actor.id,
      subject_user_id: input.subjectUserId ?? input.actor.id,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      title: input.title.trim(),
      question: normalizeFeedbackQuestion(input.question),
      is_anonymous: input.isAnonymous ?? false,
      min_response_count: input.isAnonymous ? input.minResponseCount ?? 3 : 1,
      anonymity_status: guard.anonymityStatus,
      anonymity_checked_at: new Date().toISOString(),
      min_response_guard_reason: guard.guardReason,
      due_at: input.dueAt ?? null,
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(requestSelect)
    .single();
  if (error) throw new Error(error.message);
  await insertRecipients(data.id, input.recipientUserIds);
  await auditFeedback(input.actor, data, "feedback.created", null, state);
  await notifyFeedbackChanged(toFeedbackNotification(data, "created"));
  return data;
}

export async function createKudos(input: {
  actor: AuthUser;
  recipientUserIds: string[];
  title: string;
  message: string;
  tags?: string[];
  visibility?: Record<string, unknown>;
}) {
  assertKudosRecipientsActive(input.recipientUserIds);
  await assertRecipientsActive(input.recipientUserIds);
  const admin = createSupabaseAdminClient();
  const state = getKudosFeedState(kudosFeedStatuses.DRAFT);
  const { data, error } = await admin
    .from("kudos_feed_items")
    .insert({
      author_user_id: input.actor.id,
      recipient_user_ids: [...new Set(input.recipientUserIds)],
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      title: input.title.trim(),
      message: normalizeKudosMessage(input.message),
      tags: input.tags ?? [],
      visibility: input.visibility ?? { feedCanView: true, recipientCanView: true, managerCanView: true, hrbpCanView: true },
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(kudosSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditKudos(input.actor, data, "feedback.kudos.created", null, state);
  await notifyKudosFeedChanged(toKudosNotification(data, "created"));
  return data;
}

export async function updateKudos(input: {
  actor: AuthUser;
  id: string;
  recipientUserIds?: string[];
  title?: string;
  message?: string;
  tags?: string[];
  visibility?: Record<string, unknown>;
}) {
  const current = await getKudos(input.id);
  const state = transitionKudosFeedState(current.status, kudosFeedActions.UPDATE);
  const patch: Record<string, unknown> = {
    status: state.status,
    owner_role: state.owner,
    next_action: state.nextAction,
    updated_by: input.actor.id,
    updated_at: new Date().toISOString(),
  };
  if (input.recipientUserIds) {
    assertKudosRecipientsActive(input.recipientUserIds);
    await assertRecipientsActive(input.recipientUserIds);
    patch.recipient_user_ids = [...new Set(input.recipientUserIds)];
  }
  if (input.title) patch.title = input.title.trim();
  if (input.message) patch.message = normalizeKudosMessage(input.message);
  if (input.tags) patch.tags = input.tags;
  if (input.visibility) patch.visibility = input.visibility;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("kudos_feed_items").update(patch).eq("id", input.id).select(kudosSelect).single();
  if (error) throw new Error(error.message);
  await auditKudos(input.actor, data, "feedback.kudos.updated", current.status, state, { changedFields: Object.keys(input).filter((key) => !["actor", "id"].includes(key)) });
  if (input.visibility) {
    await auditKudos(input.actor, data, "feedback.kudos.visibility_changed", current.status, state, { from: current.visibility, to: data.visibility });
  }
  await notifyKudosFeedChanged(toKudosNotification(data, "updated"));
  return data;
}

export async function submitKudos(input: { actor: AuthUser; id: string }) {
  return moveKudos(input.actor, input.id, kudosFeedActions.SUBMIT, "feedback.kudos.submitted", "submitted", {
    submitted_at: new Date().toISOString(),
  });
}

export async function approveKudos(input: { actor: AuthUser; id: string }) {
  return moveKudos(input.actor, input.id, kudosFeedActions.APPROVE, "feedback.kudos.approved", "approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function publishKudos(input: { actor: AuthUser; id: string }) {
  return moveKudos(input.actor, input.id, kudosFeedActions.PUBLISH, "feedback.kudos.published", "published", {
    published_at: new Date().toISOString(),
  });
}

export async function returnKudos(input: { actor: AuthUser; id: string; reason: string }) {
  return moveKudos(input.actor, input.id, kudosFeedActions.RETURN, "feedback.kudos.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function updateKudosVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  return moveKudos(input.actor, input.id, kudosFeedActions.OVERRIDE_VISIBILITY, "feedback.kudos.visibility_changed", "visibility_changed", {
    visibility: input.visibility,
    visibility_changed_at: new Date().toISOString(),
  });
}

export async function archiveKudos(input: { actor: AuthUser; id: string }) {
  return moveKudos(input.actor, input.id, kudosFeedActions.ARCHIVE, "feedback.kudos.archived", "archived", {
    archived_at: new Date().toISOString(),
  });
}

export async function updateFeedbackRequest(input: {
  actor: AuthUser;
  id: string;
  title?: string;
  question?: string;
  dueAt?: string | null;
}) {
  const current = await getFeedbackRequest(input.id);
  const state = transitionFeedbackState(current.status, feedbackActions.UPDATE);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("feedback_requests")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      title: input.title?.trim() ?? current.title,
      question: input.question ? normalizeFeedbackQuestion(input.question) : current.question,
      due_at: input.dueAt ?? current.due_at,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(requestSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditFeedback(input.actor, data, "feedback.updated", current.status, state);
  await notifyFeedbackChanged(toFeedbackNotification(data, "updated"));
  return data;
}

export async function submitFeedbackRequest(input: { actor: AuthUser; id: string }) {
  return moveFeedback(input.actor, input.id, feedbackActions.SUBMIT_REQUEST, "feedback.submitted", "submitted", {
    submitted_at: new Date().toISOString(),
  });
}

export async function submitFeedbackResponse(input: { actor: AuthUser; id: string; responseText: string }) {
  const current = await getFeedbackRequest(input.id);
  const nextResponseCount = Number(current.response_count ?? 0) + 1;
  const guard = getAnonymityGuardState({
    isAnonymous: current.is_anonymous,
    responseCount: nextResponseCount,
    minResponseCount: current.min_response_count,
  });
  const state = guard.canRelease
    ? transitionFeedbackState(current.status, feedbackActions.SUBMIT_RESPONSE)
    : getFeedbackState(current.status);
  const admin = createSupabaseAdminClient();
  const { data: response, error: responseError } = await admin
    .from("feedback_responses")
    .insert({
      feedback_request_id: input.id,
      recipient_user_id: input.actor.id,
      response_text: input.responseText.trim(),
      is_anonymous: current.is_anonymous,
    })
    .select("id,feedback_request_id,recipient_user_id,response_text,is_anonymous,created_at")
    .single();
  if (responseError) throw new Error(responseError.message);
  await admin
    .from("feedback_request_recipients")
    .update({ status: "responded", responded_at: new Date().toISOString() })
    .eq("feedback_request_id", input.id)
    .eq("recipient_user_id", input.actor.id);
  const { data, error } = await admin
    .from("feedback_requests")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      response_count: nextResponseCount,
      anonymity_status: current.is_anonymous ? guard.anonymityStatus : "not_anonymous",
      anonymity_checked_at: new Date().toISOString(),
      min_response_guard_reason: guard.guardReason,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(requestSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditFeedback(input.actor, data, "feedback.response_submitted", current.status, state, {
    responseId: response.id,
    anonymityStatus: guard.anonymityStatus,
    minResponseCount: current.min_response_count,
    canRelease: guard.canRelease,
  });
  await notifyFeedbackChanged(toFeedbackNotification(data, "response_submitted"));
  return response;
}

export async function reviewFeedbackAnonymity(input: { actor: AuthUser; id: string }) {
  const current = await getFeedbackRequest(input.id);
  const state = getFeedbackState(current.status);
  const guard = getAnonymityGuardState({
    isAnonymous: current.is_anonymous,
    responseCount: current.response_count,
    minResponseCount: current.min_response_count,
  });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("feedback_requests")
    .update({
      anonymity_status: current.responses_released_at ? "released" : guard.anonymityStatus,
      anonymity_checked_at: new Date().toISOString(),
      min_response_guard_reason: guard.guardReason,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(requestSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditFeedback(input.actor, data, "feedback.anonymity_checked", current.status, state, {
    anonymityStatus: data.anonymity_status,
    minResponseCount: data.min_response_count,
    canRelease: guard.canRelease,
  });
  await notifyFeedbackChanged(toFeedbackNotification(data, "anonymity_checked"));
  return data;
}

export async function releaseFeedbackAnonymity(input: { actor: AuthUser; id: string; reason: string }) {
  const current = await getFeedbackRequest(input.id);
  if (!canReleaseAnonymousResponses({ isAnonymous: current.is_anonymous, responseCount: current.response_count, minResponseCount: current.min_response_count })) {
    throw new Error("Anonymous feedback cannot be released until the minimum response count is met.");
  }
  const state = getFeedbackState(current.status);
  const batchId = randomUUID();
  const admin = createSupabaseAdminClient();
  const { error: releaseError } = await admin
    .from("feedback_responses")
    .update({ released_at: new Date().toISOString(), anonymity_release_batch_id: batchId })
    .eq("feedback_request_id", input.id);
  if (releaseError) throw new Error(releaseError.message);
  const { data, error } = await admin
    .from("feedback_requests")
    .update({
      anonymity_status: current.is_anonymous ? "released" : "not_anonymous",
      responses_released_at: new Date().toISOString(),
      min_response_guard_reason: input.reason,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(requestSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditFeedback(input.actor, data, "feedback.anonymity_released", current.status, state, {
    reason: input.reason,
    releaseBatchId: batchId,
    minResponseCount: data.min_response_count,
  });
  await auditFeedback(input.actor, data, "feedback.visibility_changed", current.status, state, {
    reason: input.reason,
    releaseBatchId: batchId,
    from: current.anonymity_status,
    to: data.anonymity_status,
  });
  await notifyFeedbackChanged(toFeedbackNotification(data, "anonymity_released"));
  return data;
}

export async function extendFeedbackRequest(input: { actor: AuthUser; id: string; extendedUntil: string }) {
  const current = await getFeedbackRequest(input.id);
  if (!canResolveAnonymousZeroResponseRequest({ isAnonymous: current.is_anonymous, responseCount: current.response_count })) {
    throw new Error("Only anonymous feedback requests with zero responses can be extended through this basic scaffold.");
  }
  return moveFeedback(input.actor, input.id, feedbackActions.EXTEND, "feedback.extended", "extended", {
    extended_until: input.extendedUntil,
  });
}

export async function closeFeedbackRequest(input: { actor: AuthUser; id: string; reason?: string }) {
  const current = await getFeedbackRequest(input.id);
  if (current.is_anonymous && Number(current.response_count ?? 0) === 0 && !canResolveAnonymousZeroResponseRequest({ isAnonymous: current.is_anonymous, responseCount: current.response_count })) {
    throw new Error("Anonymous zero-response close rule failed.");
  }
  return moveFeedback(input.actor, input.id, feedbackActions.CLOSE, "feedback.closed", "closed", {
    closed_at: new Date().toISOString(),
    closed_reason: input.reason ?? null,
    anonymity_status: current.is_anonymous && Number(current.response_count ?? 0) === 0 ? "closed_zero" : current.anonymity_status,
  });
}

export async function updateFeedbackVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  return moveFeedback(input.actor, input.id, feedbackActions.OVERRIDE_VISIBILITY, "feedback.visibility_changed", "visibility_changed", {
    visibility: input.visibility,
    visibility_changed_at: new Date().toISOString(),
  });
}

async function getFeedbackRequest(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("feedback_requests").select(requestSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getKudos(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("kudos_feed_items").select(kudosSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function moveKudos(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyKudosFeedChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const current = await getKudos(id);
  const state = transitionKudosFeedState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("kudos_feed_items")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(kudosSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditKudos(actor, data, auditAction, current.status, state, { reason, visibility: data.visibility });
  await notifyKudosFeedChanged(toKudosNotification(data, notificationAction));
  return data;
}

async function moveFeedback(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyFeedbackChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const current = await getFeedbackRequest(id);
  const state = transitionFeedbackState(current.status, workflowAction);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("feedback_requests")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...patch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(requestSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditFeedback(actor, data, auditAction, current.status, state, patch);
  await notifyFeedbackChanged(toFeedbackNotification(data, notificationAction));
  return data;
}

async function assertRecipientsActive(recipientUserIds: string[]) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .in("id", recipientUserIds)
    .eq("account_status", "active");
  if (error) throw new Error(error.message);
  if ((data ?? []).length !== new Set(recipientUserIds).size) {
    throw new Error("Feedback recipients must be active users.");
  }
}

async function insertRecipients(requestId: string, recipientUserIds: string[]) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("feedback_request_recipients").insert(
    [...new Set(recipientUserIds)].map((recipientUserId) => ({
      feedback_request_id: requestId,
      recipient_user_id: recipientUserId,
    })),
  );
  if (error) throw new Error(error.message);
}

async function auditFeedback(
  actor: AuthUser,
  request: { id: string; requester_user_id: string; subject_user_id?: string | null; is_anonymous?: boolean; response_count?: number },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: request.subject_user_id ?? request.requester_user_id,
    action,
    entityType: "feedback_request",
    entityId: request.id,
    fromStatus,
    toStatus: state.status,
    metadata: {
      owner: state.owner,
      nextAction: state.nextAction,
      isAnonymous: request.is_anonymous ?? false,
      responseCount: request.response_count ?? 0,
      ...metadata,
    },
  });
}

async function auditKudos(
  actor: AuthUser,
  kudos: { id: string; author_user_id: string; recipient_user_ids?: string[]; tags?: string[] },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: kudos.recipient_user_ids?.[0] ?? kudos.author_user_id,
    action,
    entityType: "kudos_feed_item",
    entityId: kudos.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      authorUserId: kudos.author_user_id,
      recipientUserIds: kudos.recipient_user_ids ?? [],
      tags: kudos.tags ?? [],
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toFeedbackNotification(
  request: { id: string; requester_user_id: string; subject_user_id?: string | null; status: string; owner_role: string; next_action: string | null; is_anonymous?: boolean; response_count?: number },
  action: Parameters<typeof notifyFeedbackChanged>[0]["action"],
) {
  return {
    feedbackRequestId: request.id,
    requesterUserId: request.requester_user_id,
    subjectUserId: request.subject_user_id ?? null,
    status: request.status,
    owner: request.owner_role,
    nextAction: request.next_action,
    isAnonymous: request.is_anonymous ?? false,
    responseCount: request.response_count ?? 0,
    action,
  };
}

function toKudosNotification(
  kudos: { id: string; author_user_id: string; recipient_user_ids?: string[]; status: string; owner_role: string; next_action: string | null },
  action: Parameters<typeof notifyKudosFeedChanged>[0]["action"],
) {
  return {
    kudosId: kudos.id,
    authorUserId: kudos.author_user_id,
    recipientUserIds: kudos.recipient_user_ids ?? [],
    status: kudos.status,
    owner: kudos.owner_role,
    nextAction: kudos.next_action,
    action,
  };
}
