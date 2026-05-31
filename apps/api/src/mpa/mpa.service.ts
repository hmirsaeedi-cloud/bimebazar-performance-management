import {
  getMpaAttachmentState,
  mpaAttachmentActions,
  mpaAttachmentStatuses,
  transitionMpaAttachmentState,
} from "@bimebazar/mpa-attachment-workflow";
import { mpaActions, mpaStatuses, getMpaState, transitionMpaState } from "@bimebazar/mpa-workflow";
import { htmlToPlainText } from "@bimebazar/rich-text-utils";
import { writeAuditEvent } from "../audit/audit.service.js";
import { notifyMpaAttachmentChanged, notifyMpaChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import type { AuthUser } from "../auth/auth.types.js";

const mpaSelect = `
  id,employee_id,manager_id,hrbp_id,cycle_id,title,content,status,owner_role,next_action,
  content_format,content_plain_text,approval_visibility,last_return_reason,
  submitted_at,employee_approved_at,manager_approved_at,activated_at,archived_at,
  created_by,updated_by,created_at,updated_at,
  mpa_cycles(id,name,starts_on,ends_on,status)
`;

const mpaAttachmentSelect = `
  id,mpa_id,process_id,employee_id,cycle_id,evaluation_type,evaluation_id,status,owner_role,next_action,
  match_strategy,attached_by,attached_at,metadata,created_at,updated_at
`;

export async function listMpaCycles() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("mpa_cycles").select("*").order("starts_on", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createMpaCycle(input: { actor: AuthUser; name: string; startsOn: string; endsOn: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("mpa_cycles")
    .insert({
      name: input.name,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      status: "active",
      created_by: input.actor.id,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "mpa_cycle.created",
    entityType: "mpa_cycle",
    entityId: data.id,
    fromStatus: null,
    toStatus: data.status,
    metadata: { startsOn: input.startsOn, endsOn: input.endsOn },
  });

  return data;
}

export async function listMpas(input: { actor: AuthUser; employeeId?: string; cycleId?: string; status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("mpas").select(mpaSelect).order("updated_at", { ascending: false });

  if (input.employeeId) query = query.eq("employee_id", input.employeeId);
  if (input.cycleId) query = query.eq("cycle_id", input.cycleId);
  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMpa(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("mpas").select(mpaSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createMpa(input: {
  actor: AuthUser;
  employeeId: string;
  managerId?: string | null;
  hrbpId?: string | null;
  cycleId: string;
  title: string;
  content: unknown;
  approvalVisibility?: unknown;
}) {
  const admin = createSupabaseAdminClient();
  const state = getMpaState(mpaStatuses.DRAFT);
  const managerId = input.managerId ?? input.actor.id;
  const contentFormat = getContentFormat(input.content);
  const contentPlainText = getContentPlainText(input.content);
  await assertNoOpenMpa({ employeeId: input.employeeId, cycleId: input.cycleId });

  const { data, error } = await admin
    .from("mpas")
    .insert({
      employee_id: input.employeeId,
      manager_id: managerId,
      hrbp_id: input.hrbpId ?? null,
      cycle_id: input.cycleId,
      title: input.title,
      content: input.content,
      content_format: contentFormat,
      content_plain_text: contentPlainText,
      approval_visibility: input.approvalVisibility ?? defaultApprovalVisibility(),
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(mpaSelect)
    .single();
  if (error) throw friendlyMpaError(error);

  await auditMpaTransition({
    actor: input.actor,
    mpa: data,
    action: "mpa.created",
    fromStatus: null,
    toState: state,
    metadata: { duplicateGuard: "one_non_archived_mpa_per_employee_cycle", contentFormat },
  });
  await writeMpaContentRevision({ actor: input.actor, mpa: data, revisionNumber: 1 });
  await notifyMpaChanged(toNotificationPayload(data, "created"));

  return data;
}

export async function updateMpa(input: { actor: AuthUser; id: string; patch: { title?: string; content?: unknown; approvalVisibility?: unknown } }) {
  const admin = createSupabaseAdminClient();
  const current = await getMpa(input.id);
  if (![mpaStatuses.DRAFT, mpaStatuses.RETURNED].includes(current.status)) {
    throw new Error("Only draft or returned MPAs can be updated");
  }

  const state = transitionMpaState(current.status, mpaActions.UPDATE_DRAFT);
  const patch: Record<string, unknown> = {
    owner_role: state.owner,
    next_action: state.nextAction,
    updated_by: input.actor.id,
    updated_at: new Date().toISOString(),
  };
  if ("title" in input.patch) patch.title = input.patch.title;
  if ("content" in input.patch) {
    patch.content = input.patch.content;
    patch.content_format = getContentFormat(input.patch.content);
    patch.content_plain_text = getContentPlainText(input.patch.content);
  }
  if ("approvalVisibility" in input.patch) patch.approval_visibility = input.patch.approvalVisibility;

  const { data, error } = await admin.from("mpas").update(patch).eq("id", input.id).select(mpaSelect).single();
  if (error) throw new Error(error.message);

  await auditMpaTransition({
    actor: input.actor,
    mpa: data,
    action: "mpa.updated",
    fromStatus: current.status,
    toState: state,
    metadata: "content" in input.patch ? { contentFormat: data.content_format } : undefined,
  });
  if ("content" in input.patch) {
    await writeMpaContentRevision({ actor: input.actor, mpa: data });
  }
  if ("approvalVisibility" in input.patch && JSON.stringify(current.approval_visibility) !== JSON.stringify(data.approval_visibility)) {
    await auditMpaTransition({
      actor: input.actor,
      mpa: data,
      action: "mpa.visibility_changed",
      fromStatus: current.status,
      toState: state,
      metadata: { from: current.approval_visibility, to: data.approval_visibility },
    });
    await notifyMpaChanged(toNotificationPayload(data, "visibility_changed"));
  }
  await notifyMpaChanged(toNotificationPayload(data, "updated"));

  return data;
}

export async function moveMpa(input: { actor: AuthUser; id: string; action: keyof typeof actionMap; reason?: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getMpa(input.id);
  const workflowAction = actionMap[input.action];
  const nextState = transitionMpaState(current.status, workflowAction);
  const timestampPatch = timestampForAction(input.action);
  const visibilityPatch = visibilityForAction(input.action, current.approval_visibility);

  const { data, error } = await admin
    .from("mpas")
    .update({
      status: nextState.status,
      owner_role: nextState.owner,
      next_action: nextState.nextAction,
      ...timestampPatch,
      ...visibilityPatch,
      ...(input.action === "return" ? { last_return_reason: input.reason ?? null } : {}),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(mpaSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditMpaTransition({
    actor: input.actor,
    mpa: data,
    action: `mpa.${input.action}`,
    fromStatus: current.status,
    toState: nextState,
    reason: input.reason,
  });
  if (visibilityPatch.approval_visibility) {
    await auditMpaTransition({
      actor: input.actor,
      mpa: data,
      action: "mpa.visibility_changed",
      fromStatus: current.status,
      toState: nextState,
      metadata: { from: current.approval_visibility, to: data.approval_visibility },
    });
    await notifyMpaChanged(toNotificationPayload(data, "visibility_changed"));
  }
  await notifyMpaChanged(toNotificationPayload(data, notificationActionForMove(input.action)));

  return data;
}

export async function autoAttachMpaToEvaluation(input: {
  actor: AuthUser;
  employeeId: string;
  processId?: string | null;
  cycleId?: string | null;
  evaluationType: "downward_evaluation" | "self_assessment";
  evaluationId: string;
}) {
  const admin = createSupabaseAdminClient();
  const matchedMpa = await findAttachableMpa({
    employeeId: input.employeeId,
    cycleId: input.cycleId ?? null,
  });
  const initialState = getMpaAttachmentState(mpaAttachmentStatuses.MATCHED);
  const state = matchedMpa
    ? transitionMpaAttachmentState(initialState.status, mpaAttachmentActions.AUTO_ATTACH)
    : transitionMpaAttachmentState(initialState.status, mpaAttachmentActions.MARK_MISSING);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("mpa_evaluation_attachments")
    .upsert({
      mpa_id: matchedMpa?.id ?? null,
      process_id: input.processId ?? null,
      employee_id: input.employeeId,
      cycle_id: matchedMpa?.cycle_id ?? input.cycleId ?? null,
      evaluation_type: input.evaluationType,
      evaluation_id: input.evaluationId,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      match_strategy: input.cycleId ? "employee_cycle_non_archived" : "employee_latest_non_archived",
      attached_by: matchedMpa ? input.actor.id : null,
      attached_at: matchedMpa ? now : null,
      metadata: {
        source: "auto_attach",
        requestedCycleId: input.cycleId ?? null,
        matchedMpaStatus: matchedMpa?.status ?? null,
      },
      updated_at: now,
    }, { onConflict: "evaluation_type,evaluation_id" })
    .select(mpaAttachmentSelect)
    .single();
  if (error) throw new Error(error.message);

  await updateEvaluationAttachedMpa({
    evaluationType: input.evaluationType,
    evaluationId: input.evaluationId,
    mpaId: matchedMpa?.id ?? null,
  });
  await auditMpaAttachment({
    actor: input.actor,
    attachment: data,
    action: matchedMpa ? "mpa.auto_attached_to_evaluation" : "mpa.auto_attach_missing",
    fromStatus: initialState.status,
    toState: state,
  });
  await notifyMpaAttachmentChanged(toAttachmentNotification(data, matchedMpa ? "attached" : "missing_mpa"));
  return data;
}

const actionMap = {
  submit: mpaActions.SUBMIT,
  return: mpaActions.RETURN,
  employee_approve: mpaActions.EMPLOYEE_APPROVE,
  manager_approve: mpaActions.MANAGER_APPROVE,
  activate: mpaActions.HRBP_ACTIVATE,
  archive: mpaActions.ARCHIVE,
} as const;

function timestampForAction(action: keyof typeof actionMap) {
  const now = new Date().toISOString();
  const mapping: Record<keyof typeof actionMap, Record<string, string>> = {
    submit: { submitted_at: now },
    return: {},
    employee_approve: { employee_approved_at: now },
    manager_approve: { manager_approved_at: now },
    activate: { activated_at: now },
    archive: { archived_at: now },
  };
  return mapping[action];
}

async function auditMpaTransition(input: {
  actor: AuthUser;
  mpa: { id: string; employee_id: string; cycle_id: string };
  action: string;
  fromStatus: string | null;
  toState: { status: string; owner: string; nextAction: string | null };
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: input.mpa.employee_id,
    action: input.action,
    entityType: "mpa",
    entityId: input.mpa.id,
    fromStatus: input.fromStatus,
    toStatus: input.toState.status,
    reason: input.reason,
    metadata: {
      owner: input.toState.owner,
      nextAction: input.toState.nextAction,
      cycleId: input.mpa.cycle_id,
      ...(input.metadata ?? {}),
    },
  });
}

async function assertNoOpenMpa(input: { employeeId: string; cycleId: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("mpas")
    .select("id,status")
    .eq("employee_id", input.employeeId)
    .eq("cycle_id", input.cycleId)
    .neq("status", mpaStatuses.ARCHIVED)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) {
    throw new Error("This employee already has a non-archived MPA for this cycle. Archive the old MPA before creating a replacement.");
  }
}

async function findAttachableMpa(input: { employeeId: string; cycleId?: string | null }) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("mpas")
    .select("id,employee_id,cycle_id,status,updated_at")
    .eq("employee_id", input.employeeId)
    .neq("status", mpaStatuses.ARCHIVED)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(1);
  if (input.cycleId) query = query.eq("cycle_id", input.cycleId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

async function updateEvaluationAttachedMpa(input: { evaluationType: "downward_evaluation" | "self_assessment"; evaluationId: string; mpaId: string | null }) {
  const admin = createSupabaseAdminClient();
  const table = input.evaluationType === "downward_evaluation" ? "process_downward_evaluations" : "process_self_assessments";
  const { error } = await admin
    .from(table)
    .update({ attached_mpa_id: input.mpaId, updated_at: new Date().toISOString() })
    .eq("id", input.evaluationId);
  if (error) throw new Error(error.message);
}

async function auditMpaAttachment(input: {
  actor: AuthUser;
  attachment: {
    id: string;
    mpa_id?: string | null;
    process_id?: string | null;
    employee_id: string;
    evaluation_type: string;
    evaluation_id: string;
    cycle_id?: string | null;
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
    entityType: "mpa_evaluation_attachment",
    entityId: input.attachment.id,
    fromStatus: input.fromStatus,
    toStatus: input.toState.status,
    metadata: {
      mpaId: input.attachment.mpa_id ?? null,
      processId: input.attachment.process_id ?? null,
      cycleId: input.attachment.cycle_id ?? null,
      evaluationType: input.attachment.evaluation_type,
      evaluationId: input.attachment.evaluation_id,
      matchStrategy: input.attachment.match_strategy,
      owner: input.toState.owner,
      nextAction: input.toState.nextAction,
    },
  });
}

function toAttachmentNotification(
  attachment: {
    id: string;
    mpa_id?: string | null;
    process_id?: string | null;
    employee_id: string;
    evaluation_type: "downward_evaluation" | "self_assessment";
    evaluation_id: string;
    status: string;
    owner_role: string;
    next_action: string | null;
  },
  action: Parameters<typeof notifyMpaAttachmentChanged>[0]["action"],
) {
  return {
    attachmentId: attachment.id,
    mpaId: attachment.mpa_id,
    processId: attachment.process_id,
    employeeId: attachment.employee_id,
    evaluationType: attachment.evaluation_type,
    evaluationId: attachment.evaluation_id,
    status: attachment.status,
    owner: attachment.owner_role,
    nextAction: attachment.next_action,
    action,
  };
}

async function writeMpaContentRevision(input: {
  actor: AuthUser;
  mpa: { id: string; content: unknown; content_format?: string | null; content_plain_text?: string | null };
  revisionNumber?: number;
}) {
  const admin = createSupabaseAdminClient();
  const revisionNumber = input.revisionNumber ?? await nextRevisionNumber(input.mpa.id);
  const { error } = await admin.from("mpa_content_revisions").insert({
    mpa_id: input.mpa.id,
    revision_number: revisionNumber,
    content: input.mpa.content,
    content_format: input.mpa.content_format ?? getContentFormat(input.mpa.content),
    content_plain_text: input.mpa.content_plain_text ?? getContentPlainText(input.mpa.content),
    created_by: input.actor.id,
  });
  if (error) throw new Error(error.message);
}

async function nextRevisionNumber(mpaId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("mpa_content_revisions")
    .select("revision_number")
    .eq("mpa_id", mpaId)
    .order("revision_number", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return Number(data?.[0]?.revision_number ?? 0) + 1;
}

function getContentFormat(content: unknown) {
  return hasRichText(content) ? "rich_text" : "structured";
}

function getContentPlainText(content: unknown) {
  if (!hasRichText(content)) return null;
  const richText = (content as { richText: { plainText?: string; html?: string } }).richText;
  return richText.plainText ?? htmlToPlainText(richText.html ?? "");
}

function hasRichText(content: unknown): content is { richText: { plainText?: string; html?: string } } {
  return typeof content === "object" && content !== null && "richText" in content;
}

function defaultApprovalVisibility() {
  return {
    employeeCanViewManagerContent: false,
    employeeCanViewHrbpNotes: false,
  };
}

function visibilityForAction(action: keyof typeof actionMap, currentVisibility: unknown) {
  if (action !== "activate") return {};
  return {
    approval_visibility: {
      ...defaultApprovalVisibility(),
      ...(typeof currentVisibility === "object" && currentVisibility ? currentVisibility : {}),
      employeeCanViewManagerContent: true,
    },
  };
}

function friendlyMpaError(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    return new Error("This employee already has a non-archived MPA for this cycle. Archive the old MPA before creating a replacement.");
  }
  return new Error(error.message ?? "MPA request failed");
}

function notificationActionForMove(action: keyof typeof actionMap) {
  const mapping = {
    submit: "submitted",
    return: "returned",
    employee_approve: "employee_approved",
    manager_approve: "manager_approved",
    activate: "activated",
    archive: "archived",
  } as const;
  return mapping[action];
}

function toNotificationPayload(
  mpa: { id: string; employee_id: string; cycle_id: string; status: string; owner_role: string; next_action: string | null },
  action: Parameters<typeof notifyMpaChanged>[0]["action"],
) {
  return {
    mpaId: mpa.id,
    employeeId: mpa.employee_id,
    cycleId: mpa.cycle_id,
    status: mpa.status,
    owner: mpa.owner_role,
    nextAction: mpa.next_action,
    action,
  };
}
