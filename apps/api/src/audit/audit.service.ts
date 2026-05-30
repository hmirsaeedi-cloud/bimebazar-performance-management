interface AuditEventInput {
  actorUserId?: string | null;
  targetUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAuditEvent(input: AuditEventInput) {
  const { createSupabaseAdminClient } = await import("../supabase/client.js");
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("audit_events").insert({
    actor_user_id: input.actorUserId ?? null,
    target_user_id: input.targetUserId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("audit.write_failed", error.message);
  }
}
