import {
  getProcessState,
  processActions,
  processStatuses,
  transitionProcessState,
} from "@bimebazar/process-engine-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import type { AuthUser } from "../auth/auth.types.js";

const processSelect = `
  id,name,description,process_type,status,owner_role,next_action,config,eligibility_filter,
  form_template_id,form_template_version_id,starts_at,ends_at,created_by,updated_by,created_at,updated_at,
  process_participants(id,employee_id,manager_id,status)
`;

type ProcessConfig = {
  formTemplateId?: string | null;
  formTemplateVersionId?: string | null;
  eligibilityFilter?: {
    businessUnitIds?: string[];
    departmentIds?: string[];
    teamIds?: string[];
    levels?: string[];
    includeEmployees?: string[];
    excludeEmployees?: string[];
  };
  steps: Array<Record<string, unknown>>;
  visibility?: Record<string, unknown>;
};

export async function listProcesses(input: { processType?: string; status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("performance_processes").select(processSelect).order("created_at", { ascending: false });
  if (input.processType) query = query.eq("process_type", input.processType);
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProcess(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("performance_processes").select(processSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createProcess(input: {
  actor: AuthUser;
  name: string;
  description?: string;
  processType: string;
  startsAt?: string | null;
  endsAt?: string | null;
  config: ProcessConfig;
}) {
  const admin = createSupabaseAdminClient();
  const state = getProcessState(processStatuses.DRAFT);
  const { data, error } = await admin
    .from("performance_processes")
    .insert({
      name: input.name,
      description: input.description ?? null,
      process_type: input.processType,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      config: input.config,
      eligibility_filter: input.config.eligibilityFilter ?? {},
      form_template_id: input.config.formTemplateId ?? null,
      form_template_version_id: input.config.formTemplateVersionId ?? null,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(processSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditProcess(input.actor, data.id, "process.created", null, state, { processType: input.processType });
  return data;
}

export async function updateProcess(input: {
  actor: AuthUser;
  id: string;
  patch: Partial<{ name: string; description: string; processType: string; startsAt: string | null; endsAt: string | null; config: ProcessConfig }>;
}) {
  const admin = createSupabaseAdminClient();
  const current = await getProcess(input.id);
  if (![processStatuses.DRAFT, processStatuses.CONFIGURED].includes(current.status)) {
    throw new Error("Only draft or configured processes can be updated");
  }
  const state = transitionProcessState(current.status, processActions.UPDATE_CONFIG);
  const dbPatch: Record<string, unknown> = {
    status: state.status,
    owner_role: state.owner,
    next_action: state.nextAction,
    updated_by: input.actor.id,
    updated_at: new Date().toISOString(),
  };
  if ("name" in input.patch) dbPatch.name = input.patch.name;
  if ("description" in input.patch) dbPatch.description = input.patch.description ?? null;
  if ("processType" in input.patch) dbPatch.process_type = input.patch.processType;
  if ("startsAt" in input.patch) dbPatch.starts_at = input.patch.startsAt ?? null;
  if ("endsAt" in input.patch) dbPatch.ends_at = input.patch.endsAt ?? null;
  if (input.patch.config) {
    dbPatch.config = input.patch.config;
    dbPatch.eligibility_filter = input.patch.config.eligibilityFilter ?? {};
    dbPatch.form_template_id = input.patch.config.formTemplateId ?? null;
    dbPatch.form_template_version_id = input.patch.config.formTemplateVersionId ?? null;
  }
  const { data, error } = await admin.from("performance_processes").update(dbPatch).eq("id", input.id).select(processSelect).single();
  if (error) throw new Error(error.message);

  await auditProcess(input.actor, input.id, "process.updated", current.status, state, {});
  return data;
}

export async function configureProcess(input: { actor: AuthUser; id: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getProcess(input.id);
  const participants = await resolveEligibleParticipants(current.eligibility_filter ?? {});
  if (participants.length === 0) {
    throw new Error("Processes cannot start when org filters produce zero eligible employees");
  }
  const state = transitionProcessState(current.status, processActions.CONFIGURE);

  await admin.from("process_participants").delete().eq("process_id", input.id);
  const { error: participantError } = await admin.from("process_participants").insert(
    participants.map((participant) => ({
      process_id: input.id,
      employee_id: participant.id,
      manager_id: participant.manager_id,
      status: "eligible",
      metadata: { level: participant.level, teamId: participant.team_id },
    })),
  );
  if (participantError) throw new Error(participantError.message);

  const { data, error } = await admin
    .from("performance_processes")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(processSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditProcess(input.actor, input.id, "process.configured", current.status, state, { participantCount: participants.length });
  return data;
}

export async function moveProcess(input: { actor: AuthUser; id: string; action: keyof typeof actionMap; reason?: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getProcess(input.id);
  const processAction = actionMap[input.action];
  const state = transitionProcessState(current.status, processAction);
  const { data, error } = await admin
    .from("performance_processes")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(processSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditProcess(input.actor, input.id, `process.${input.action}`, current.status, state, { reason: input.reason });
  return data;
}

const actionMap = {
  schedule: processActions.SCHEDULE,
  start: processActions.START,
  pause: processActions.PAUSE,
  resume: processActions.RESUME,
  complete: processActions.COMPLETE,
  cancel: processActions.CANCEL,
} as const;

async function resolveEligibleParticipants(filter: Record<string, string[]>) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("profiles")
    .select("id,manager_id,team_id,department_id,business_unit_id,level")
    .eq("account_status", "active");

  if (filter.businessUnitIds?.length) query = query.in("business_unit_id", filter.businessUnitIds);
  if (filter.departmentIds?.length) query = query.in("department_id", filter.departmentIds);
  if (filter.teamIds?.length) query = query.in("team_id", filter.teamIds);
  if (filter.levels?.length) query = query.in("level", filter.levels);
  if (filter.includeEmployees?.length) query = query.in("id", filter.includeEmployees);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const excluded = new Set(filter.excludeEmployees ?? []);
  return (data ?? []).filter((profile) => !excluded.has(profile.id));
}

async function auditProcess(
  actor: AuthUser,
  processId: string,
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown>,
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    action,
    entityType: "performance_process",
    entityId: processId,
    fromStatus,
    toStatus: state.status,
    metadata: {
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}
