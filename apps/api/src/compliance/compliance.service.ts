import {
  auditExportActions,
  auditExportStatuses,
  getAuditExportState,
  transitionAuditExportState,
} from "@bimebazar/audit-log-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyComplianceAuditChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const auditSelect = `
  id,immutable_sequence,actor_user_id,target_user_id,action,entity_type,entity_id,from_status,to_status,reason,
  metadata,prev_event_hash,event_hash,integrity_version,created_at
`;

const exportSelect = `
  id,status,owner_role,next_action,filters,row_count,export_format,export_payload,payload_hash,
  generated_at,verified_at,expired_at,requested_by,updated_by,created_at,updated_at
`;

export async function listAuditEvents(input: {
  actorUserId?: string;
  targetUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("audit_events").select(auditSelect).order("created_at", { ascending: false }).limit(input.limit);
  if (input.actorUserId) query = query.eq("actor_user_id", input.actorUserId);
  if (input.targetUserId) query = query.eq("target_user_id", input.targetUserId);
  if (input.action) query = query.eq("action", input.action);
  if (input.entityType) query = query.eq("entity_type", input.entityType);
  if (input.entityId) query = query.eq("entity_id", input.entityId);
  if (input.dateFrom) query = query.gte("created_at", input.dateFrom);
  if (input.dateTo) query = query.lte("created_at", input.dateTo);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function verifyAuditLogIntegrity(actor: AuthUser) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("audit_events")
    .select("id,immutable_sequence,prev_event_hash,event_hash,integrity_version,created_at")
    .order("immutable_sequence", { ascending: true, nullsFirst: true })
    .limit(5000);
  if (error) throw new Error(error.message);
  const events = data ?? [];
  const missingHashCount = events.filter((event) => !event.event_hash).length;
  const chainedEvents = events.filter((event) => event.prev_event_hash);
  const chainBreakCount = chainedEvents.filter((event, index) => index > 0 && event.prev_event_hash !== chainedEvents[index - 1]?.event_hash).length;
  const result = {
    checkedAt: new Date().toISOString(),
    checkedBy: actor.id,
    totalEventsChecked: events.length,
    missingHashCount,
    chainedEvents: chainedEvents.length,
    chainBreakCount,
    immutable: missingHashCount === 0 && chainBreakCount === 0,
  };
  await writeAuditEvent({
    actorUserId: actor.id,
    action: "compliance.audit_integrity_verified",
    entityType: "audit_events",
    entityId: "audit_events",
    toStatus: result.immutable ? "verified" : "attention_needed",
    metadata: result,
  });
  await notifyComplianceAuditChanged({ action: "verified", status: result.immutable ? "verified" : "attention_needed", owner: "HR_ADMIN", nextAction: null });
  return result;
}

export async function listAuditExports(input: { status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("audit_export_requests").select(exportSelect).order("updated_at", { ascending: false });
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAuditExport(input: { actor: AuthUser; format: "csv" | "json"; filters: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient();
  const requestedState = getAuditExportState(auditExportStatuses.REQUESTED);
  const events = await listAuditEvents({ ...(input.filters as any), limit: 500 });
  const generatedState = transitionAuditExportState(requestedState.status, auditExportActions.GENERATE);
  const payload = input.format === "json" ? JSON.stringify(events, null, 2) : toCsv(events);
  const payloadHash = await sha256(payload);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("audit_export_requests")
    .insert({
      status: generatedState.status,
      owner_role: generatedState.owner,
      next_action: generatedState.nextAction,
      filters: input.filters,
      row_count: events.length,
      export_format: input.format,
      export_payload: payload,
      payload_hash: payloadHash,
      generated_at: now,
      requested_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(exportSelect)
    .single();
  if (error) throw new Error(error.message);
  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "compliance.audit_export_generated",
    entityType: "audit_export_request",
    entityId: data.id,
    fromStatus: requestedState.status,
    toStatus: generatedState.status,
    metadata: { owner: generatedState.owner, nextAction: generatedState.nextAction, rowCount: events.length, format: input.format, payloadHash },
  });
  await notifyComplianceAuditChanged({ exportId: data.id, action: "exported", status: data.status, owner: data.owner_role, nextAction: data.next_action });
  return data;
}

export async function verifyAuditExport(input: { actor: AuthUser; id: string }) {
  const admin = createSupabaseAdminClient();
  const { data: current, error: getError } = await admin.from("audit_export_requests").select(exportSelect).eq("id", input.id).single();
  if (getError) throw new Error(getError.message);
  const state = transitionAuditExportState(current.status, auditExportActions.VERIFY);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("audit_export_requests")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      verified_at: now,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(exportSelect)
    .single();
  if (error) throw new Error(error.message);
  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "compliance.audit_export_verified",
    entityType: "audit_export_request",
    entityId: data.id,
    fromStatus: current.status,
    toStatus: state.status,
    metadata: { owner: state.owner, nextAction: state.nextAction, payloadHash: data.payload_hash },
  });
  await notifyComplianceAuditChanged({ exportId: data.id, action: "export_verified", status: data.status, owner: data.owner_role, nextAction: data.next_action });
  return data;
}

function toCsv(events: any[]) {
  const headers = ["id", "created_at", "action", "entity_type", "entity_id", "actor_user_id", "target_user_id", "from_status", "to_status", "event_hash"];
  const lines = [headers.join(",")];
  for (const event of events) {
    lines.push(headers.map((key) => csvCell(event[key])).join(","));
  }
  return lines.join("\n");
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
