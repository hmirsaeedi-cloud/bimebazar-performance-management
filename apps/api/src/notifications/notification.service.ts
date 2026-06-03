import {
  emailNotificationActions,
  emailNotificationStatuses,
  getEmailNotificationState,
  normalizeEmailNotificationPayload,
  transitionEmailNotificationState,
} from "@bimebazar/email-notification-workflow";
import {
  getNotificationState,
  notificationActions,
  notificationStatuses,
  normalizeNotificationPayload,
  transitionNotificationState,
} from "@bimebazar/notification-workflow";
import {
  normalizeNotificationPreferences,
  notificationPreferenceActions,
  transitionNotificationPreferenceState,
} from "@bimebazar/notification-preference-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const notificationSelect = `
  id,recipient_user_id,actor_user_id,status,owner_role,next_action,channel,priority,title,body,
  entity_type,entity_id,action_url,metadata,read_at,archived_at,created_by,updated_by,created_at,updated_at
`;

const emailNotificationSelect = `
  id,recipient_user_id,actor_user_id,to_email,cc_emails,bcc_emails,status,owner_role,next_action,recipient_visible,
  priority,template_key,subject,body_text,body_html,provider,provider_message_id,entity_type,entity_id,action_url,metadata,
  submitted_at,approved_at,queued_at,sent_at,failed_at,returned_at,cancelled_at,visibility_changed_at,last_error,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

const notificationPreferenceSelect = `
  id,user_id,status,owner_role,next_action,in_app_enabled,email_enabled,push_enabled,sms_enabled,digest_frequency,
  quiet_hours,visibility,metadata,submitted_at,approved_at,returned_at,overridden_at,visibility_changed_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

export async function listNotifications(input: {
  actor: AuthUser;
  recipientUserId?: string;
  status?: string;
  priority?: string;
  entityType?: string;
  limit?: number;
}) {
  const admin = createSupabaseAdminClient();
  const canReadAll = input.actor.roles.includes("HR_ADMIN");
  let query = admin
    .from("notifications")
    .select(notificationSelect)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 100);

  if (canReadAll && input.recipientUserId) {
    query = query.eq("recipient_user_id", input.recipientUserId);
  }
  if (!canReadAll) {
    query = query.eq("recipient_user_id", input.actor.id);
  }
  if (input.status) query = query.eq("status", input.status);
  if (input.priority) query = query.eq("priority", input.priority);
  if (input.entityType) query = query.eq("entity_type", input.entityType);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createInAppNotification(input: {
  actor: AuthUser;
  recipientUserId: string;
  title: string;
  body: string;
  priority?: "low" | "normal" | "high" | "critical";
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const state = getNotificationState(notificationStatuses.UNREAD);
  const payload = normalizeNotificationPayload(input);
  const { data, error } = await admin
    .from("notifications")
    .insert({
      recipient_user_id: input.recipientUserId,
      actor_user_id: input.actor.id,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      channel: payload.channel,
      priority: payload.priority,
      title: payload.title,
      body: payload.body,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      action_url: input.actionUrl ?? null,
      metadata: {
        ...payload.metadata,
        owner: state.owner,
        nextAction: state.nextAction,
      },
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(notificationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditNotification(input.actor, data, "notification.created", null, state, { priority: data.priority });
  return data;
}

export async function updateNotification(input: {
  actor: AuthUser;
  id: string;
  title?: string;
  body?: string;
  priority?: "low" | "normal" | "high" | "critical";
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const current = await getNotification(input.id);
  const state = transitionNotificationState(current.status, notificationActions.UPDATE);
  const payload = normalizeNotificationPayload({
    title: input.title ?? current.title,
    body: input.body ?? current.body,
    priority: input.priority ?? current.priority,
    metadata: input.metadata ?? current.metadata,
  });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      title: payload.title,
      body: payload.body,
      priority: payload.priority,
      action_url: input.actionUrl ?? current.action_url,
      metadata: {
        ...payload.metadata,
        owner: state.owner,
        nextAction: state.nextAction,
      },
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(notificationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditNotification(input.actor, data, "notification.updated", current.status, state, { priority: data.priority });
  return data;
}

export async function markNotificationRead(input: { actor: AuthUser; id: string }) {
  return moveNotification(input.actor, input.id, notificationActions.MARK_READ, "notification.marked_read", {
    read_at: new Date().toISOString(),
  });
}

export async function archiveNotification(input: { actor: AuthUser; id: string }) {
  return moveNotification(input.actor, input.id, notificationActions.ARCHIVE, "notification.archived", {
    archived_at: new Date().toISOString(),
  });
}

export async function listEmailNotifications(input: {
  actor: AuthUser;
  recipientUserId?: string;
  status?: string;
  priority?: string;
  entityType?: string;
  limit?: number;
}) {
  const admin = createSupabaseAdminClient();
  const canReadQueue = input.actor.roles.includes("HR_ADMIN") || input.actor.roles.includes("HRBP");
  let query = admin
    .from("email_notifications")
    .select(emailNotificationSelect)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 100);

  if (!canReadQueue) {
    query = query.eq("recipient_user_id", input.actor.id).eq("recipient_visible", true);
  } else if (input.recipientUserId) {
    query = query.eq("recipient_user_id", input.recipientUserId);
  }
  if (input.status) query = query.eq("status", input.status);
  if (input.priority) query = query.eq("priority", input.priority);
  if (input.entityType) query = query.eq("entity_type", input.entityType);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createEmailNotification(input: {
  actor: AuthUser;
  recipientUserId: string;
  toEmail: string;
  ccEmails?: string[];
  bccEmails?: string[];
  priority?: "low" | "normal" | "high" | "critical";
  templateKey?: string | null;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const state = getEmailNotificationState(emailNotificationStatuses.DRAFT);
  const payload = normalizeEmailNotificationPayload(input);
  const { data, error } = await admin
    .from("email_notifications")
    .insert({
      recipient_user_id: input.recipientUserId,
      actor_user_id: input.actor.id,
      to_email: payload.toEmail,
      cc_emails: input.ccEmails ?? [],
      bcc_emails: input.bccEmails ?? [],
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      recipient_visible: state.recipientVisible,
      priority: input.priority ?? "normal",
      template_key: input.templateKey ?? null,
      subject: payload.subject,
      body_text: payload.bodyText,
      body_html: payload.bodyHtml,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      action_url: input.actionUrl ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        owner: state.owner,
        nextAction: state.nextAction,
      },
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(emailNotificationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEmailNotification(input.actor, data, "notification.email.created", null, state);
  await notifyEmailNotificationChanged(toEmailNotificationHook(data, "created"));
  return data;
}

export async function updateEmailNotification(input: { actor: AuthUser; id: string; patch: Record<string, unknown> }) {
  const current = await getEmailNotification(input.id);
  const state = transitionEmailNotificationState(current.status, emailNotificationActions.UPDATE);
  const payload = normalizeEmailNotificationPayload({
    toEmail: current.to_email,
    subject: input.patch.subject ?? current.subject,
    bodyText: input.patch.bodyText ?? current.body_text,
    bodyHtml: input.patch.bodyHtml ?? current.body_html,
  });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("email_notifications")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      recipient_visible: state.recipientVisible,
      cc_emails: input.patch.ccEmails ?? current.cc_emails,
      bcc_emails: input.patch.bccEmails ?? current.bcc_emails,
      priority: input.patch.priority ?? current.priority,
      template_key: input.patch.templateKey ?? current.template_key,
      subject: payload.subject,
      body_text: payload.bodyText,
      body_html: payload.bodyHtml,
      entity_type: input.patch.entityType ?? current.entity_type,
      entity_id: input.patch.entityId ?? current.entity_id,
      action_url: input.patch.actionUrl ?? current.action_url,
      metadata: {
        ...(current.metadata ?? {}),
        ...((input.patch.metadata as Record<string, unknown> | undefined) ?? {}),
        owner: state.owner,
        nextAction: state.nextAction,
      },
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(emailNotificationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEmailNotification(input.actor, data, "notification.email.updated", current.status, state);
  await notifyEmailNotificationChanged(toEmailNotificationHook(data, "updated"));
  return data;
}

export async function submitEmailNotification(input: { actor: AuthUser; id: string }) {
  return moveEmailNotification(input.actor, input.id, emailNotificationActions.SUBMIT, "notification.email.submitted", "submitted", {
    submitted_at: new Date().toISOString(),
  });
}

export async function approveEmailNotification(input: { actor: AuthUser; id: string }) {
  return moveEmailNotification(input.actor, input.id, emailNotificationActions.APPROVE, "notification.email.approved", "approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function queueEmailNotification(input: { actor: AuthUser; id: string }) {
  return moveEmailNotification(input.actor, input.id, emailNotificationActions.QUEUE, "notification.email.queued", "queued", {
    queued_at: new Date().toISOString(),
  });
}

export async function markEmailNotificationSent(input: {
  actor: AuthUser;
  id: string;
  provider?: string | null;
  providerMessageId?: string | null;
}) {
  return moveEmailNotification(input.actor, input.id, emailNotificationActions.MARK_SENT, "notification.email.sent", "sent", {
    sent_at: new Date().toISOString(),
    provider: input.provider ?? null,
    provider_message_id: input.providerMessageId ?? null,
  });
}

export async function failEmailNotification(input: { actor: AuthUser; id: string; error: string; provider?: string | null }) {
  return moveEmailNotification(input.actor, input.id, emailNotificationActions.FAIL, "notification.email.failed", "failed", {
    failed_at: new Date().toISOString(),
    provider: input.provider ?? null,
    last_error: input.error,
    reason: input.error,
  });
}

export async function returnEmailNotification(input: { actor: AuthUser; id: string; reason: string }) {
  return moveEmailNotification(input.actor, input.id, emailNotificationActions.RETURN, "notification.email.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function cancelEmailNotification(input: { actor: AuthUser; id: string }) {
  return moveEmailNotification(input.actor, input.id, emailNotificationActions.CANCEL, "notification.email.cancelled", "cancelled", {
    cancelled_at: new Date().toISOString(),
  });
}

export async function updateEmailNotificationVisibility(input: { actor: AuthUser; id: string; recipientVisible: boolean }) {
  const current = await getEmailNotification(input.id);
  const state = transitionEmailNotificationState(current.status, emailNotificationActions.OVERRIDE_VISIBILITY);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("email_notifications")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      recipient_visible: input.recipientVisible,
      visibility_changed_at: new Date().toISOString(),
      metadata: {
        ...(current.metadata ?? {}),
        owner: state.owner,
        nextAction: state.nextAction,
      },
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(emailNotificationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEmailNotification(input.actor, data, "notification.email.visibility_changed", current.status, state, {
    fromRecipientVisible: current.recipient_visible,
    toRecipientVisible: data.recipient_visible,
  });
  await notifyEmailNotificationChanged(toEmailNotificationHook(data, "visibility_changed"));
  return data;
}

export async function listNotificationPreferences(input: {
  actor: AuthUser;
  userId?: string;
  status?: string;
  limit?: number;
}) {
  const admin = createSupabaseAdminClient();
  const canReadAll = input.actor.roles.includes("HR_ADMIN") || input.actor.roles.includes("HRBP");
  let query = admin
    .from("notification_preferences")
    .select(notificationPreferenceSelect)
    .order("updated_at", { ascending: false })
    .limit(input.limit ?? 100);

  if (canReadAll && input.userId) {
    query = query.eq("user_id", input.userId);
  }
  if (!canReadAll) {
    query = query.eq("user_id", input.actor.id);
  }
  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateNotificationPreference(input: {
  actor: AuthUser;
  id: string;
  patch: Record<string, unknown>;
}) {
  const current = await getNotificationPreference(input.id);
  const state = transitionNotificationPreferenceState(current.status, notificationPreferenceActions.UPDATE);
  const preferences = normalizeNotificationPreferences({
    inAppEnabled: input.patch.inAppEnabled ?? current.in_app_enabled,
    emailEnabled: input.patch.emailEnabled ?? current.email_enabled,
    pushEnabled: input.patch.pushEnabled ?? current.push_enabled,
    smsEnabled: input.patch.smsEnabled ?? current.sms_enabled,
    digestFrequency: input.patch.digestFrequency ?? current.digest_frequency,
    quietHours: { ...(current.quiet_hours ?? {}), ...((input.patch.quietHours as Record<string, unknown> | undefined) ?? {}) },
    visibility: { ...(current.visibility ?? {}), ...((input.patch.visibility as Record<string, unknown> | undefined) ?? {}) },
  });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notification_preferences")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      in_app_enabled: preferences.inAppEnabled,
      email_enabled: preferences.emailEnabled,
      push_enabled: preferences.pushEnabled,
      sms_enabled: preferences.smsEnabled,
      digest_frequency: preferences.digestFrequency,
      quiet_hours: preferences.quietHours,
      visibility: preferences.visibility,
      metadata: {
        ...(current.metadata ?? {}),
        ...((input.patch.metadata as Record<string, unknown> | undefined) ?? {}),
        owner: state.owner,
        nextAction: state.nextAction,
      },
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(notificationPreferenceSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditNotificationPreference(input.actor, data, "notification.preference.updated", current.status, state, {
    changedFields: Object.keys(input.patch),
  });
  await notifyNotificationPreferenceChanged(toNotificationPreferenceHook(data, "updated"));
  return data;
}

export async function submitNotificationPreference(input: { actor: AuthUser; id: string }) {
  return moveNotificationPreference(input.actor, input.id, notificationPreferenceActions.SUBMIT, "notification.preference.submitted", "submitted", {
    submitted_at: new Date().toISOString(),
  });
}

export async function approveNotificationPreference(input: { actor: AuthUser; id: string }) {
  return moveNotificationPreference(input.actor, input.id, notificationPreferenceActions.APPROVE, "notification.preference.approved", "approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function returnNotificationPreference(input: { actor: AuthUser; id: string; reason: string }) {
  return moveNotificationPreference(input.actor, input.id, notificationPreferenceActions.RETURN, "notification.preference.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function overrideNotificationPreference(input: {
  actor: AuthUser;
  id: string;
  patch: Record<string, unknown>;
  reason: string;
}) {
  const current = await getNotificationPreference(input.id);
  const state = transitionNotificationPreferenceState(current.status, notificationPreferenceActions.OVERRIDE);
  const preferences = normalizeNotificationPreferences({
    inAppEnabled: input.patch.inAppEnabled ?? current.in_app_enabled,
    emailEnabled: input.patch.emailEnabled ?? current.email_enabled,
    pushEnabled: input.patch.pushEnabled ?? current.push_enabled,
    smsEnabled: input.patch.smsEnabled ?? current.sms_enabled,
    digestFrequency: input.patch.digestFrequency ?? current.digest_frequency,
    quietHours: { ...(current.quiet_hours ?? {}), ...((input.patch.quietHours as Record<string, unknown> | undefined) ?? {}) },
    visibility: { ...(current.visibility ?? {}), ...((input.patch.visibility as Record<string, unknown> | undefined) ?? {}) },
  });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notification_preferences")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      in_app_enabled: preferences.inAppEnabled,
      email_enabled: preferences.emailEnabled,
      push_enabled: preferences.pushEnabled,
      sms_enabled: preferences.smsEnabled,
      digest_frequency: preferences.digestFrequency,
      quiet_hours: preferences.quietHours,
      visibility: preferences.visibility,
      overridden_at: new Date().toISOString(),
      metadata: {
        ...(current.metadata ?? {}),
        owner: state.owner,
        nextAction: state.nextAction,
      },
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(notificationPreferenceSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditNotificationPreference(input.actor, data, "notification.preference.overridden", current.status, state, {
    reason: input.reason,
    changedFields: Object.keys(input.patch).filter((key) => key !== "reason"),
  });
  await notifyNotificationPreferenceChanged(toNotificationPreferenceHook(data, "overridden"));
  return data;
}

export async function updateNotificationPreferenceVisibility(input: {
  actor: AuthUser;
  id: string;
  visibility: Record<string, unknown>;
}) {
  const current = await getNotificationPreference(input.id);
  const state = transitionNotificationPreferenceState(current.status, notificationPreferenceActions.VISIBILITY_CHANGE);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notification_preferences")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      visibility: input.visibility,
      visibility_changed_at: new Date().toISOString(),
      metadata: {
        ...(current.metadata ?? {}),
        owner: state.owner,
        nextAction: state.nextAction,
      },
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(notificationPreferenceSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditNotificationPreference(input.actor, data, "notification.preference.visibility_changed", current.status, state, {
    from: current.visibility,
    to: data.visibility,
  });
  await notifyNotificationPreferenceChanged(toNotificationPreferenceHook(data, "visibility_changed"));
  return data;
}

async function getNotification(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("notifications").select(notificationSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getEmailNotification(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("email_notifications").select(emailNotificationSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getNotificationPreference(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("notification_preferences").select(notificationPreferenceSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function moveNotification(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  patch: Record<string, unknown>,
) {
  const current = await getNotification(id);
  const state = transitionNotificationState(current.status, workflowAction);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      metadata: {
        ...(current.metadata ?? {}),
        owner: state.owner,
        nextAction: state.nextAction,
      },
      ...patch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(notificationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditNotification(actor, data, auditAction, current.status, state, { priority: data.priority });
  return data;
}

async function moveEmailNotification(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyEmailNotificationChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const current = await getEmailNotification(id);
  const state = transitionEmailNotificationState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("email_notifications")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      recipient_visible: state.recipientVisible,
      metadata: {
        ...(current.metadata ?? {}),
        owner: state.owner,
        nextAction: state.nextAction,
      },
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(emailNotificationSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditEmailNotification(actor, data, auditAction, current.status, state, { reason });
  await notifyEmailNotificationChanged(toEmailNotificationHook(data, notificationAction));
  return data;
}

async function moveNotificationPreference(
  actor: AuthUser,
  id: string,
  workflowAction: string,
  auditAction: string,
  notificationAction: Parameters<typeof notifyNotificationPreferenceChanged>[0]["action"],
  patch: Record<string, unknown>,
) {
  const current = await getNotificationPreference(id);
  const state = transitionNotificationPreferenceState(current.status, workflowAction);
  const { reason, ...dbPatch } = patch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notification_preferences")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      metadata: {
        ...(current.metadata ?? {}),
        owner: state.owner,
        nextAction: state.nextAction,
      },
      ...dbPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(notificationPreferenceSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditNotificationPreference(actor, data, auditAction, current.status, state, { reason });
  await notifyNotificationPreferenceChanged(toNotificationPreferenceHook(data, notificationAction));
  return data;
}

async function auditNotification(
  actor: AuthUser,
  notification: { id: string; recipient_user_id: string; entity_type?: string | null; entity_id?: string | null },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown>,
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: notification.recipient_user_id,
    action,
    entityType: "notification",
    entityId: notification.id,
    fromStatus,
    toStatus: state.status,
    metadata: {
      linkedEntityType: notification.entity_type ?? null,
      linkedEntityId: notification.entity_id ?? null,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

async function auditEmailNotification(
  actor: AuthUser,
  emailNotification: {
    id: string;
    recipient_user_id: string;
    to_email: string;
    entity_type?: string | null;
    entity_id?: string | null;
    recipient_visible?: boolean;
  },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null; recipientVisible: boolean },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: emailNotification.recipient_user_id,
    action,
    entityType: "email_notification",
    entityId: emailNotification.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      toEmail: emailNotification.to_email,
      linkedEntityType: emailNotification.entity_type ?? null,
      linkedEntityId: emailNotification.entity_id ?? null,
      owner: state.owner,
      nextAction: state.nextAction,
      recipientVisible: emailNotification.recipient_visible ?? state.recipientVisible,
      ...metadata,
    },
  });
}

async function auditNotificationPreference(
  actor: AuthUser,
  preference: {
    id: string;
    user_id: string;
    in_app_enabled: boolean;
    email_enabled: boolean;
    push_enabled: boolean;
    sms_enabled: boolean;
    digest_frequency: string;
  },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: preference.user_id,
    action,
    entityType: "notification_preference",
    entityId: preference.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      owner: state.owner,
      nextAction: state.nextAction,
      inAppEnabled: preference.in_app_enabled,
      emailEnabled: preference.email_enabled,
      pushEnabled: preference.push_enabled,
      smsEnabled: preference.sms_enabled,
      digestFrequency: preference.digest_frequency,
      ...metadata,
    },
  });
}

export async function notifyUserCreated(input: { userId: string; temporaryPassword: string }) {
  // In S1 this is a hook. S5/S6 notification work can replace it with in-app and email delivery.
  console.info("notification.user_created", {
    userId: input.userId,
    temporaryPasswordIssued: input.temporaryPassword.length > 0,
  });
}

export async function notifyPipChanged(input: {
  pipCaseId: string;
  employeeId: string;
  managerId?: string | null;
  hrbpId?: string | null;
  status: string;
  owner: string;
  nextAction: string | null;
  employeeVisible: boolean;
  action:
    | "created"
    | "updated"
    | "submitted"
    | "approved"
    | "visibility_activated"
    | "started"
    | "completed"
    | "returned"
    | "cancelled"
    | "visibility_changed";
}) {
  console.info("notification.pip_changed", input);
}

export async function notifyEmailNotificationChanged(input: {
  emailNotificationId: string;
  recipientUserId: string;
  toEmail: string;
  status: string;
  owner: string;
  nextAction: string | null;
  recipientVisible: boolean;
  action:
    | "created"
    | "updated"
    | "submitted"
    | "approved"
    | "queued"
    | "sent"
    | "failed"
    | "returned"
    | "cancelled"
    | "visibility_changed";
}) {
  console.info("notification.email_changed", input);
}

export async function notifyNotificationPreferenceChanged(input: {
  preferenceId: string;
  userId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  digestFrequency: string;
  action: "updated" | "submitted" | "approved" | "returned" | "overridden" | "visibility_changed";
}) {
  console.info("notification.preference_changed", input);
}

function toEmailNotificationHook(
  item: {
    id: string;
    recipient_user_id: string;
    to_email: string;
    status: string;
    owner_role: string;
    next_action: string | null;
    recipient_visible: boolean;
  },
  action: Parameters<typeof notifyEmailNotificationChanged>[0]["action"],
) {
  return {
    emailNotificationId: item.id,
    recipientUserId: item.recipient_user_id,
    toEmail: item.to_email,
    status: item.status,
    owner: item.owner_role,
    nextAction: item.next_action,
    recipientVisible: item.recipient_visible,
    action,
  };
}

function toNotificationPreferenceHook(
  item: {
    id: string;
    user_id: string;
    status: string;
    owner_role: string;
    next_action: string | null;
    digest_frequency: string;
  },
  action: Parameters<typeof notifyNotificationPreferenceChanged>[0]["action"],
) {
  return {
    preferenceId: item.id,
    userId: item.user_id,
    status: item.status,
    owner: item.owner_role,
    nextAction: item.next_action,
    digestFrequency: item.digest_frequency,
    action,
  };
}

export async function notifyManagerRoleChanged(input: {
  userId: string;
  status: "active" | "revoked";
  directReportCount: number;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.manager_role_changed", input);
}

export async function notifyCalendarPreferenceChanged(input: {
  userId: string;
  preferredCalendar: "jalali" | "gregorian";
  preferredLocale: "fa-IR" | "en-US";
  status: string;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.calendar_preference_changed", input);
}

export async function notifyLanguagePreferenceChanged(input: {
  userId: string;
  preferredLanguage: "fa" | "en";
  textDirection: "rtl" | "ltr";
  status: string;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.language_preference_changed", input);
}

export async function notifyFormTemplateChanged(input: {
  templateId: string;
  status: "draft" | "published" | "archived";
  action: "created" | "updated" | "published" | "returned" | "archived";
  questionCount?: number;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.form_template_changed", input);
}

export async function notifyEmployeeImportCompleted(input: {
  importRunId: string;
  status: string;
  totalRows: number;
  createdCount: number;
  errorCount: number;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.employee_import_completed", input);
}

export async function notifyProcessChanged(input: {
  processId: string;
  status: string;
  action: "created" | "updated" | "configured" | "scheduled" | "started" | "paused" | "resumed" | "completed" | "cancelled";
  participantCount?: number;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.process_changed", input);
}

export async function notifyEmployeeExportReady(input: {
  exportReportId: string;
  status: string;
  rowCount: number;
  fileName?: string | null;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.employee_export_ready", input);
}

export async function notifyMpaChanged(input: {
  mpaId: string;
  employeeId: string;
  cycleId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "returned" | "employee_approved" | "manager_approved" | "activated" | "archived" | "visibility_changed";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.mpa_changed", input);
}

export async function notifyMpaHistoryChanged(input: {
  versionId: string;
  mpaId: string;
  employeeId: string;
  cycleId: string;
  versionNumber: number;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "captured" | "reviewed" | "restored" | "returned" | "archived" | "visibility_changed";
}) {
  console.info("notification.mpa_history_changed", input);
}

export async function notifySelfAssessmentChanged(input: {
  selfAssessmentId: string;
  processId: string;
  employeeId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "returned" | "approved" | "completed" | "visibility_changed";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.self_assessment_changed", input);
}

export async function notifyDownwardEvaluationChanged(input: {
  downwardEvaluationId: string;
  processId: string;
  employeeId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "returned" | "next_level_approved" | "hrbp_approved" | "completed" | "visibility_changed";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.downward_evaluation_changed", input);
}

export async function notifyMpaAttachmentChanged(input: {
  attachmentId: string;
  mpaId?: string | null;
  processId?: string | null;
  employeeId: string;
  evaluationType: "downward_evaluation" | "self_assessment";
  evaluationId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "attached" | "missing_mpa" | "detached" | "override_attached";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.mpa_attachment_changed", input);
}

export async function notifyEvaluationChanged(input: {
  evaluationId: string;
  processId?: string | null;
  employeeId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "next_level_approved" | "head_approved" | "hrbp_approved" | "approved" | "returned" | "completed" | "visibility_changed";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.evaluation_changed", input);
}

export async function notifyEvaluationComparisonChanged(input: {
  comparisonId: string;
  employeeId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  scoreVisible: boolean;
  action: "created" | "updated" | "submitted" | "approved" | "returned" | "visibility_changed" | "completed";
}) {
  // S9 notifications can replace this hook with in-app and email delivery.
  console.info("notification.evaluation_comparison_changed", input);
}

export async function notifyPerformanceBandFlagChanged(input: {
  flagId: string;
  evaluationId: string;
  employeeId: string;
  flagType: "pip" | "promotion" | "none";
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "approved" | "returned" | "converted" | "dismissed" | "visibility_changed";
}) {
  // S7 notifications can replace this hook with in-app and email delivery.
  console.info("notification.performance_band_flag_changed", input);
}

export async function notifyMidCycleEvaluationChanged(input: {
  evaluationId: string;
  processId?: string | null;
  employeeId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "manager_approved" | "hrbp_approved" | "returned" | "completed" | "visibility_changed";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.mid_cycle_evaluation_changed", input);
}

export async function notifyPdChatChanged(input: {
  chatId: string;
  processId?: string | null;
  employeeId: string;
  managerId?: string | null;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "approved" | "returned" | "visibility_changed" | "archived";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.pd_chat_changed", input);
}

export async function notifyPdChatAttachmentChanged(input: {
  attachmentId: string;
  chatId?: string | null;
  processId?: string | null;
  employeeId: string;
  managerId?: string | null;
  evaluationType: "end_cycle_evaluation" | "mid_cycle_evaluation" | "downward_evaluation";
  evaluationId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "attached" | "missing_chat" | "detached" | "override_attached";
}) {
  // S7 notifications can replace this hook with in-app and email delivery.
  console.info("notification.pd_chat_attachment_changed", input);
}

export async function notifyPdChatScheduleChanged(input: {
  scheduleId: string;
  employeeId: string;
  managerId?: string | null;
  status: string;
  owner: string;
  nextAction: string | null;
  nextOccurrenceAt?: string | null;
  action:
    | "created"
    | "updated"
    | "submitted"
    | "approved"
    | "activated"
    | "paused"
    | "resumed"
    | "returned"
    | "visibility_changed"
    | "occurrence_generated"
    | "archived";
}) {
  // S10 notifications can replace this hook with calendar/email delivery.
  console.info("notification.pd_chat_schedule_changed", input);
}

export async function notifyComplianceAuditChanged(input: {
  exportId?: string | null;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "verified" | "exported" | "export_verified";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.compliance_audit_changed", input);
}

export async function notifyDashboardChanged(input: {
  userId: string;
  view: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "override";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.dashboard_changed", input);
}

export async function notifyTeamHealthChanged(input: {
  scoreId: string;
  teamId?: string | null;
  managerId?: string | null;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "calculated" | "submitted" | "approved" | "activated" | "returned" | "visibility_changed" | "archived";
  score: number;
  band: string;
}) {
  // S10 notifications can replace this hook with in-app and email delivery.
  console.info("notification.team_health_changed", input);
}

export async function notifyReportChanged(input: {
  reportId: string;
  reportKey: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "generated" | "submitted" | "approved" | "returned" | "visibility_changed" | "exported" | "archived";
}) {
  // S7 notifications can replace this hook with in-app and email delivery.
  console.info("notification.report_changed", input);
}

export async function notifyFeedbackChanged(input: {
  feedbackRequestId: string;
  requesterUserId: string;
  subjectUserId?: string | null;
  status: string;
  owner: string;
  nextAction: string | null;
  isAnonymous: boolean;
  responseCount: number;
  action: "created" | "updated" | "submitted" | "response_submitted" | "extended" | "closed" | "visibility_changed" | "anonymity_checked" | "anonymity_released";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.feedback_changed", input);
}

export async function notifyKudosFeedChanged(input: {
  kudosId: string;
  authorUserId: string;
  recipientUserIds: string[];
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "approved" | "published" | "returned" | "visibility_changed" | "archived";
}) {
  // S10 notifications can replace this hook with realtime feed delivery.
  console.info("notification.kudos_feed_changed", input);
}

export async function notifyGoalChanged(input: {
  goalId: string;
  ownerUserId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  progressPercent: number;
  action: "created" | "updated" | "submitted" | "approved" | "activated" | "returned" | "visibility_changed" | "completed" | "archived";
}) {
  // S9 notifications can replace this hook with in-app and email delivery.
  console.info("notification.goal_changed", input);
}

export async function notifyFormConditionalLogicChanged(input: {
  conditionalLogicId: string;
  formTemplateId: string;
  formTemplateVersionId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "approved" | "activated" | "returned" | "visibility_changed" | "archived";
  ruleCount: number;
}) {
  // S9 notifications can replace this hook with in-app and email delivery.
  console.info("notification.form_conditional_logic_changed", input);
}

export async function notifyProfileOrgChartChanged(input: {
  orgChartId: string;
  rootProfileId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "refreshed" | "submitted" | "approved" | "activated" | "returned" | "visibility_changed" | "archived";
  nodeCount: number;
}) {
  // S9 notifications can replace this hook with in-app and email delivery.
  console.info("notification.profile_org_chart_changed", input);
}

export async function notifyHrisIntegrationChanged(input: {
  integrationId: string;
  provider: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "approved" | "activated" | "returned" | "visibility_changed" | "sync_started" | "sync_completed" | "sync_failed" | "archived";
  totalRecords?: number;
  changedRecords?: number;
}) {
  // S10 notifications can replace this hook with in-app and email delivery.
  console.info("notification.hris_integration_changed", input);
}

export async function notifyProcessFormInstanceChanged(input: {
  formInstanceId?: string;
  processId: string;
  employeeId?: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "approved" | "returned" | "closed" | "visibility_changed" | "admin_moved";
  instanceCount?: number;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.process_form_instance_changed", input);
}

export async function notifyIndividualSurveyChanged(input: {
  surveyProcessId: string;
  responseId?: string;
  employeeId?: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "started" | "submitted" | "approved" | "returned" | "completed" | "cancelled" | "visibility_changed";
  eligibleEmployeeCount?: number;
}) {
  // S6 notifications can replace this hook with in-app and email delivery.
  console.info("notification.individual_survey_changed", input);
}

export async function notifyPulseSurveyChanged(input: {
  pulseSurveyId: string;
  responseId?: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action:
    | "created"
    | "updated"
    | "started"
    | "submitted"
    | "approved"
    | "returned"
    | "released"
    | "completed"
    | "cancelled"
    | "visibility_changed";
  eligibleEmployeeCount?: number;
  responseCount?: number;
  minResponses?: number;
  canRelease?: boolean;
}) {
  // S10 notifications can replace this hook with in-app and email delivery.
  console.info("notification.pulse_survey_changed", input);
}

export async function notifyPromotionChanged(input: {
  promotionCaseId: string;
  employeeId: string;
  managerId?: string | null;
  hrbpId?: string | null;
  status: string;
  owner: string;
  nextAction: string | null;
  proposedLevel?: string | null;
  action: "created" | "updated" | "submitted" | "manager_approved" | "hrbp_approved" | "approved" | "returned" | "cancelled" | "visibility_changed";
}) {
  // S6 notifications can replace this hook with in-app and email delivery.
  console.info("notification.promotion_changed", input);
}
