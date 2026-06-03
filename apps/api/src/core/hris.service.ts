import {
  buildHrisSyncPreview,
  getHrisIntegrationState,
  hrisIntegrationActions,
  hrisIntegrationStatuses,
  transitionHrisIntegrationState,
} from "@bimebazar/hris-integration-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyHrisIntegrationChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const hrisSelect = `
  id,provider,name,base_url,auth_type,sync_mode,schedule,status,owner_role,next_action,field_mapping,visibility,
  last_preview,last_sync_summary,submitted_at,approved_at,activated_at,sync_started_at,sync_completed_at,sync_failed_at,
  returned_at,visibility_changed_at,archived_at,last_return_reason,last_error,created_by,updated_by,created_at,updated_at
`;

export async function listHrisIntegrations(input: { status?: string; provider?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("hris_integrations").select(hrisSelect).order("updated_at", { ascending: false });
  if (input.status) query = query.eq("status", input.status);
  if (input.provider) query = query.eq("provider", input.provider);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getHrisIntegration(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("hris_integrations").select(hrisSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createHrisIntegration(input: {
  actor: AuthUser;
  provider: string;
  name: string;
  baseUrl: string;
  authType: string;
  syncMode: string;
  schedule?: string | null;
  fieldMapping: Record<string, unknown>;
  visibility: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const state = getHrisIntegrationState(hrisIntegrationStatuses.DRAFT);
  const { data, error } = await admin
    .from("hris_integrations")
    .insert({
      provider: input.provider,
      name: input.name,
      base_url: input.baseUrl,
      auth_type: input.authType,
      sync_mode: input.syncMode,
      schedule: input.schedule ?? null,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      field_mapping: input.fieldMapping,
      visibility: input.visibility,
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(hrisSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditHris(input.actor, data, "core.hris.created", null, state);
  await notifyHris(data, state, "created");
  return data;
}

export async function updateHrisIntegration(input: {
  actor: AuthUser;
  id: string;
  patch: {
    name?: string;
    baseUrl?: string;
    authType?: string;
    syncMode?: string;
    schedule?: string | null;
    fieldMapping?: Record<string, unknown>;
  };
}) {
  const current = await getHrisIntegration(input.id);
  const state = transitionHrisIntegrationState(current.status, hrisIntegrationActions.UPDATE);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("hris_integrations")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      name: input.patch.name ?? current.name,
      base_url: input.patch.baseUrl ?? current.base_url,
      auth_type: input.patch.authType ?? current.auth_type,
      sync_mode: input.patch.syncMode ?? current.sync_mode,
      schedule: "schedule" in input.patch ? input.patch.schedule : current.schedule,
      field_mapping: input.patch.fieldMapping ?? current.field_mapping,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(hrisSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditHris(input.actor, data, "core.hris.updated", current.status, state);
  await notifyHris(data, state, "updated");
  return data;
}

export async function previewHrisSync(input: { actor: AuthUser; id: string; records: Record<string, unknown>[] }) {
  const current = await getHrisIntegration(input.id);
  const preview = buildHrisSyncPreview(input.records);
  const state = getHrisIntegrationState(current.status);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("hris_integrations")
    .update({
      last_preview: preview,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(hrisSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditHris(input.actor, data, "core.hris.previewed", current.status, state, { preview });
  return preview;
}

export async function submitHrisIntegration(input: { actor: AuthUser; id: string }) {
  return moveHris(input.actor, input.id, hrisIntegrationActions.SUBMIT, "core.hris.submitted", {
    submitted_at: new Date().toISOString(),
  });
}

export async function approveHrisIntegration(input: { actor: AuthUser; id: string }) {
  return moveHris(input.actor, input.id, hrisIntegrationActions.APPROVE, "core.hris.approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function activateHrisIntegration(input: { actor: AuthUser; id: string }) {
  return moveHris(input.actor, input.id, hrisIntegrationActions.ACTIVATE, "core.hris.activated", {
    activated_at: new Date().toISOString(),
  });
}

export async function startHrisSync(input: { actor: AuthUser; id: string }) {
  return moveHris(input.actor, input.id, hrisIntegrationActions.START_SYNC, "core.hris.sync_started", {
    sync_started_at: new Date().toISOString(),
    last_error: null,
  });
}

export async function completeHrisSync(input: {
  actor: AuthUser;
  id: string;
  totalRecords: number;
  changedRecords: number;
  failedRecords: number;
  sample: Record<string, unknown>[];
}) {
  return moveHris(input.actor, input.id, hrisIntegrationActions.COMPLETE_SYNC, "core.hris.sync_completed", {
    sync_completed_at: new Date().toISOString(),
    last_sync_summary: {
      totalRecords: input.totalRecords,
      changedRecords: input.changedRecords,
      failedRecords: input.failedRecords,
      sample: input.sample,
    },
  });
}

export async function failHrisSync(input: { actor: AuthUser; id: string; reason: string }) {
  return moveHris(input.actor, input.id, hrisIntegrationActions.FAIL_SYNC, "core.hris.sync_failed", {
    sync_failed_at: new Date().toISOString(),
    last_error: input.reason,
    reason: input.reason,
  });
}

export async function returnHrisIntegration(input: { actor: AuthUser; id: string; reason: string }) {
  return moveHris(input.actor, input.id, hrisIntegrationActions.RETURN, "core.hris.returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function updateHrisVisibility(input: {
  actor: AuthUser;
  id: string;
  visibility: Record<string, unknown>;
  reason: string;
}) {
  const current = await getHrisIntegration(input.id);
  const state = transitionHrisIntegrationState(current.status, hrisIntegrationActions.OVERRIDE_VISIBILITY);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("hris_integrations")
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
    .select(hrisSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditHris(input.actor, data, "core.hris.visibility_changed", current.status, state, {
    reason: input.reason,
    from: current.visibility,
    to: input.visibility,
  });
  await notifyHris(data, state, "visibility_changed");
  return data;
}

export async function archiveHrisIntegration(input: { actor: AuthUser; id: string }) {
  return moveHris(input.actor, input.id, hrisIntegrationActions.ARCHIVE, "core.hris.archived", {
    archived_at: new Date().toISOString(),
  });
}

async function moveHris(
  actor: AuthUser,
  id: string,
  action: string,
  auditAction: string,
  patch: Record<string, unknown>,
) {
  const current = await getHrisIntegration(id);
  const state = transitionHrisIntegrationState(current.status, action);
  const { reason, ...dbPatch } = patch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("hris_integrations")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
      ...dbPatch,
    })
    .eq("id", id)
    .select(hrisSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditHris(actor, data, auditAction, current.status, state, {
    reason: typeof reason === "string" ? reason : undefined,
    syncSummary: dbPatch.last_sync_summary,
  });
  await notifyHris(data, state, hrisActionNameFromAudit(auditAction));
  return data;
}

async function auditHris(
  actor: AuthUser,
  integration: { id: string; provider: string },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    action,
    entityType: "hris_integration",
    entityId: integration.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      provider: integration.provider,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

async function notifyHris(
  integration: {
    id: string;
    provider: string;
    status: string;
    last_sync_summary?: { totalRecords?: number; changedRecords?: number } | null;
  },
  state: { owner: string; nextAction: string | null },
  action: "created" | "updated" | "submitted" | "approved" | "activated" | "returned" | "visibility_changed" | "sync_started" | "sync_completed" | "sync_failed" | "archived",
) {
  await notifyHrisIntegrationChanged({
    integrationId: integration.id,
    provider: integration.provider,
    status: integration.status,
    owner: state.owner,
    nextAction: state.nextAction,
    action,
    totalRecords: integration.last_sync_summary?.totalRecords,
    changedRecords: integration.last_sync_summary?.changedRecords,
  });
}

function hrisActionNameFromAudit(
  auditAction: string,
): "created" | "updated" | "submitted" | "approved" | "activated" | "returned" | "visibility_changed" | "sync_started" | "sync_completed" | "sync_failed" | "archived" {
  if (auditAction.endsWith(".submitted")) return "submitted";
  if (auditAction.endsWith(".approved")) return "approved";
  if (auditAction.endsWith(".activated")) return "activated";
  if (auditAction.endsWith(".returned")) return "returned";
  if (auditAction.endsWith(".visibility_changed")) return "visibility_changed";
  if (auditAction.endsWith(".sync_started")) return "sync_started";
  if (auditAction.endsWith(".sync_completed")) return "sync_completed";
  if (auditAction.endsWith(".sync_failed")) return "sync_failed";
  if (auditAction.endsWith(".archived")) return "archived";
  return "updated";
}
