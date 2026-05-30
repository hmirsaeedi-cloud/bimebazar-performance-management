import { mpaActions, mpaStatuses, getMpaState, transitionMpaState } from "@bimebazar/mpa-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import type { AuthUser } from "../auth/auth.types.js";

const mpaSelect = `
  id,employee_id,manager_id,hrbp_id,cycle_id,title,content,status,owner_role,next_action,
  submitted_at,employee_approved_at,manager_approved_at,activated_at,archived_at,
  created_by,updated_by,created_at,updated_at,
  mpa_cycles(id,name,starts_on,ends_on,status)
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
}) {
  const admin = createSupabaseAdminClient();
  const state = getMpaState(mpaStatuses.DRAFT);
  const managerId = input.managerId ?? input.actor.id;

  const { data, error } = await admin
    .from("mpas")
    .insert({
      employee_id: input.employeeId,
      manager_id: managerId,
      hrbp_id: input.hrbpId ?? null,
      cycle_id: input.cycleId,
      title: input.title,
      content: input.content,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(mpaSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditMpaTransition({
    actor: input.actor,
    mpa: data,
    action: "mpa.created",
    fromStatus: null,
    toState: state,
  });

  return data;
}

export async function updateMpa(input: { actor: AuthUser; id: string; patch: { title?: string; content?: unknown } }) {
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
  if ("content" in input.patch) patch.content = input.patch.content;

  const { data, error } = await admin.from("mpas").update(patch).eq("id", input.id).select(mpaSelect).single();
  if (error) throw new Error(error.message);

  await auditMpaTransition({
    actor: input.actor,
    mpa: data,
    action: "mpa.updated",
    fromStatus: current.status,
    toState: state,
  });

  return data;
}

export async function moveMpa(input: { actor: AuthUser; id: string; action: keyof typeof actionMap; reason?: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getMpa(input.id);
  const workflowAction = actionMap[input.action];
  const nextState = transitionMpaState(current.status, workflowAction);
  const timestampPatch = timestampForAction(input.action);

  const { data, error } = await admin
    .from("mpas")
    .update({
      status: nextState.status,
      owner_role: nextState.owner,
      next_action: nextState.nextAction,
      ...timestampPatch,
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
    },
  });
}
