import {
  downwardActions,
  downwardStatuses,
  transitionDownwardState,
} from "@bimebazar/downward-routing-workflow";
import {
  getProcessState,
  processActions,
  processStatuses,
  transitionProcessState,
} from "@bimebazar/process-engine-workflow";
import {
  getSelfAssessmentState,
  selfAssessmentActions,
  selfAssessmentStatuses,
  transitionSelfAssessmentState,
} from "@bimebazar/self-assessment-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import { notifyDownwardEvaluationChanged, notifyProcessChanged, notifySelfAssessmentChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import type { AuthUser } from "../auth/auth.types.js";

const processSelect = `
  id,name,description,process_type,status,owner_role,next_action,config,eligibility_filter,
  form_template_id,form_template_version_id,locked_form_template_version_id,locked_form_version_number,
  locked_form_schema,configured_participant_count,configured_at,started_at,starts_at,ends_at,created_by,updated_by,created_at,updated_at,
  process_participants(id,employee_id,manager_id,status)
`;

const selfAssessmentSelect = `
  id,process_id,participant_id,employee_id,manager_id,form_template_version_id,locked_form_schema,
  status,owner_role,next_action,responses,visibility,submitted_at,returned_at,manager_approved_at,completed_at,
  last_return_reason,created_by,updated_by,created_at,updated_at
`;

const downwardEvaluationSelect = `
  id,process_id,participant_id,employee_id,manager_id,next_level_manager_id,hrbp_id,form_template_version_id,locked_form_schema,
  status,owner_role,next_action,manager_responses,reviewer_responses,visibility,
  manager_submitted_at,next_level_approved_at,hrbp_approved_at,returned_at,completed_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
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
  await validateSelectedFormVersion(input.config);
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
  await notifyProcessChanged({ processId: data.id, status: state.status, action: "created" });
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
    await validateSelectedFormVersion(input.patch.config);
    dbPatch.config = input.patch.config;
    dbPatch.eligibility_filter = input.patch.config.eligibilityFilter ?? {};
    dbPatch.form_template_id = input.patch.config.formTemplateId ?? null;
    dbPatch.form_template_version_id = input.patch.config.formTemplateVersionId ?? null;
  }
  const { data, error } = await admin.from("performance_processes").update(dbPatch).eq("id", input.id).select(processSelect).single();
  if (error) throw new Error(error.message);

  const visibilityChanges = input.patch.config ? diffVisibility(current.config?.visibility, input.patch.config.visibility) : [];
  await auditProcess(input.actor, input.id, "process.updated", current.status, state, { visibilityChanges });
  if (visibilityChanges.length > 0) {
    await auditProcess(input.actor, input.id, "process.visibility_changed", current.status, state, { visibilityChanges });
  }
  await notifyProcessChanged({ processId: input.id, status: state.status, action: "updated" });
  return data;
}

export async function configureProcess(input: { actor: AuthUser; id: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getProcess(input.id);
  if (!current.form_template_version_id) {
    throw new Error("Configure requires a selected form template version");
  }
  const lockedFormVersion = await getFormVersionSnapshot(current.form_template_version_id);
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
      configured_at: new Date().toISOString(),
      configured_participant_count: participants.length,
      locked_form_template_version_id: lockedFormVersion.id,
      locked_form_version_number: lockedFormVersion.version_number,
      locked_form_schema: lockedFormVersion.schema,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(processSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditProcess(input.actor, input.id, "process.configured", current.status, state, { participantCount: participants.length });
  await notifyProcessChanged({ processId: input.id, status: state.status, action: "configured", participantCount: participants.length });
  return data;
}

export async function moveProcess(input: { actor: AuthUser; id: string; action: keyof typeof actionMap; reason?: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getProcess(input.id);
  const processAction = actionMap[input.action];
  if (input.action === "start") {
    await assertProcessCanStart(input.id, current);
  }
  const state = transitionProcessState(current.status, processAction);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("performance_processes")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      started_at: input.action === "start" ? now : current.started_at,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(processSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditProcess(input.actor, input.id, `process.${input.action}`, current.status, state, { reason: input.reason });
  await notifyProcessChanged({
    processId: input.id,
    status: state.status,
    action: processNotificationAction(input.action),
    participantCount: current.process_participants?.length ?? current.configured_participant_count,
  });
  return data;
}

export async function listSelfAssessments(input: { processId: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("process_self_assessments")
    .select(selfAssessmentSelect)
    .eq("process_id", input.processId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listDownwardEvaluations(input: { processId: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("process_downward_evaluations")
    .select(downwardEvaluationSelect)
    .eq("process_id", input.processId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function startSelfAssessment(input: { actor: AuthUser; processId: string; participantId: string }) {
  const admin = createSupabaseAdminClient();
  const process = await getProcess(input.processId);
  if (process.status !== processStatuses.ACTIVE) {
    throw new Error("Self-assessments can start only after the process is active");
  }
  if (!process.locked_form_template_version_id || !process.locked_form_schema) {
    throw new Error("Self-assessments require a locked form version from process configuration");
  }
  const { data: participant, error: participantError } = await admin
    .from("process_participants")
    .select("id,process_id,employee_id,manager_id,status")
    .eq("id", input.participantId)
    .eq("process_id", input.processId)
    .single();
  if (participantError) throw new Error(participantError.message);
  if (!participant || participant.status === "excluded") throw new Error("Participant is not eligible for this process");

  const startState = transitionSelfAssessmentState(selfAssessmentStatuses.ASSIGNED, selfAssessmentActions.START);
  const { data, error } = await admin
    .from("process_self_assessments")
    .upsert({
      process_id: input.processId,
      participant_id: input.participantId,
      employee_id: participant.employee_id,
      manager_id: participant.manager_id,
      form_template_version_id: process.locked_form_template_version_id,
      locked_form_schema: process.locked_form_schema,
      status: startState.status,
      owner_role: startState.owner,
      next_action: startState.nextAction,
      created_by: input.actor.id,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "process_id,employee_id" })
    .select(selfAssessmentSelect)
    .single();
  if (error) throw new Error(error.message);

  await admin.from("process_participants").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", input.participantId);
  await auditSelfAssessment(input.actor, data, "process.self_assessment.created", null, startState, {
    lockedFormTemplateVersionId: process.locked_form_template_version_id,
    lockedFormVersionNumber: process.locked_form_version_number,
  });
  await notifySelfAssessmentChanged(toSelfAssessmentNotification(data, "created"));
  return data;
}

export async function startDownwardEvaluation(input: { actor: AuthUser; processId: string; participantId: string }) {
  const admin = createSupabaseAdminClient();
  const process = await getProcess(input.processId);
  if (process.status !== processStatuses.ACTIVE) {
    throw new Error("Downward evaluations can start only after the process is active");
  }
  if (process.process_type !== "downward_evaluation") {
    throw new Error("This route requires a downward_evaluation process");
  }
  if (!process.locked_form_template_version_id || !process.locked_form_schema) {
    throw new Error("Downward evaluations require a locked form version from process configuration");
  }
  const { data: participant, error: participantError } = await admin
    .from("process_participants")
    .select("id,process_id,employee_id,manager_id,status")
    .eq("id", input.participantId)
    .eq("process_id", input.processId)
    .single();
  if (participantError) throw new Error(participantError.message);
  if (!participant || participant.status === "excluded") throw new Error("Participant is not eligible for this process");
  if (!participant.manager_id) throw new Error("Downward evaluation requires the employee to have a manager");

  const managerProfile = await getRoutingProfile(participant.manager_id);
  const employeeProfile = await getRoutingProfile(participant.employee_id);
  const startState = transitionDownwardState(downwardStatuses.ASSIGNED, downwardActions.START);
  const { data, error } = await admin
    .from("process_downward_evaluations")
    .upsert({
      process_id: input.processId,
      participant_id: input.participantId,
      employee_id: participant.employee_id,
      manager_id: participant.manager_id,
      next_level_manager_id: managerProfile.manager_id ?? null,
      hrbp_id: employeeProfile.hrbp_id ?? null,
      form_template_version_id: process.locked_form_template_version_id,
      locked_form_schema: process.locked_form_schema,
      status: startState.status,
      owner_role: startState.owner,
      next_action: startState.nextAction,
      created_by: input.actor.id,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "process_id,employee_id" })
    .select(downwardEvaluationSelect)
    .single();
  if (error) throw new Error(error.message);

  await admin.from("process_participants").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", input.participantId);
  await auditDownwardEvaluation(input.actor, data, "process.downward_evaluation.created", null, startState, {
    lockedFormTemplateVersionId: process.locked_form_template_version_id,
    lockedFormVersionNumber: process.locked_form_version_number,
    routingChain: {
      managerId: data.manager_id,
      nextLevelManagerId: data.next_level_manager_id,
      hrbpId: data.hrbp_id,
    },
  });
  await notifyDownwardEvaluationChanged(toDownwardNotification(data, "created"));
  return data;
}

export async function submitSelfAssessment(input: { actor: AuthUser; id: string; responses: Record<string, unknown>; saveOnly?: boolean }) {
  const admin = createSupabaseAdminClient();
  const current = await getSelfAssessment(input.id);
  const action = input.saveOnly ? selfAssessmentActions.UPDATE_DRAFT : selfAssessmentActions.SUBMIT;
  const state = transitionSelfAssessmentState(current.status, action);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("process_self_assessments")
    .update({
      responses: input.responses,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      submitted_at: input.saveOnly ? current.submitted_at : now,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(selfAssessmentSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditSelfAssessment(input.actor, data, input.saveOnly ? "process.self_assessment.updated" : "process.self_assessment.submitted", current.status, state, {
    responseKeys: Object.keys(input.responses),
  });
  if (!input.saveOnly) {
    await admin.from("process_participants").update({ status: "completed", updated_at: now }).eq("id", current.participant_id);
  }
  await notifySelfAssessmentChanged(toSelfAssessmentNotification(data, input.saveOnly ? "updated" : "submitted"));
  return data;
}

export async function returnSelfAssessment(input: { actor: AuthUser; id: string; reason: string }) {
  return moveSelfAssessment(input.actor, input.id, selfAssessmentActions.RETURN, "process.self_assessment.returned", "returned", {
    reason: input.reason,
    last_return_reason: input.reason,
    returned_at: new Date().toISOString(),
  });
}

export async function approveSelfAssessment(input: { actor: AuthUser; id: string }) {
  return moveSelfAssessment(input.actor, input.id, selfAssessmentActions.MANAGER_APPROVE, "process.self_assessment.approved", "approved", {
    manager_approved_at: new Date().toISOString(),
  });
}

export async function completeSelfAssessment(input: { actor: AuthUser; id: string }) {
  return moveSelfAssessment(input.actor, input.id, selfAssessmentActions.COMPLETE, "process.self_assessment.completed", "completed", {
    completed_at: new Date().toISOString(),
  });
}

export async function submitDownwardEvaluation(input: {
  actor: AuthUser;
  id: string;
  responses: { managerResponses: Record<string, unknown>; reviewerResponses?: Record<string, unknown> };
  saveOnly?: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const current = await getDownwardEvaluation(input.id);
  const action = input.saveOnly ? downwardActions.UPDATE_DRAFT : downwardActions.SUBMIT;
  const state = transitionDownwardState(current.status, action);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("process_downward_evaluations")
    .update({
      manager_responses: input.responses.managerResponses,
      reviewer_responses: input.responses.reviewerResponses ?? current.reviewer_responses ?? {},
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      manager_submitted_at: input.saveOnly ? current.manager_submitted_at : now,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(downwardEvaluationSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditDownwardEvaluation(input.actor, data, input.saveOnly ? "process.downward_evaluation.updated" : "process.downward_evaluation.submitted", current.status, state, {
    managerResponseKeys: Object.keys(input.responses.managerResponses),
  });
  await notifyDownwardEvaluationChanged(toDownwardNotification(data, input.saveOnly ? "updated" : "submitted"));
  return data;
}

export async function approveDownwardNextLevel(input: { actor: AuthUser; id: string }) {
  return moveDownwardEvaluation(input.actor, input.id, downwardActions.NEXT_LEVEL_APPROVE, "process.downward_evaluation.next_level_approved", "next_level_approved", {
    next_level_approved_at: new Date().toISOString(),
  });
}

export async function approveDownwardHrbp(input: { actor: AuthUser; id: string }) {
  return moveDownwardEvaluation(input.actor, input.id, downwardActions.HRBP_APPROVE, "process.downward_evaluation.hrbp_approved", "hrbp_approved", {
    hrbp_approved_at: new Date().toISOString(),
  });
}

export async function returnDownwardEvaluation(input: { actor: AuthUser; id: string; reason: string }) {
  return moveDownwardEvaluation(input.actor, input.id, downwardActions.RETURN, "process.downward_evaluation.returned", "returned", {
    reason: input.reason,
    last_return_reason: input.reason,
    returned_at: new Date().toISOString(),
  });
}

export async function completeDownwardEvaluation(input: { actor: AuthUser; id: string }) {
  return moveDownwardEvaluation(input.actor, input.id, downwardActions.COMPLETE, "process.downward_evaluation.completed", "completed", {
    completed_at: new Date().toISOString(),
  });
}

export async function updateDownwardEvaluationVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient();
  const current = await getDownwardEvaluation(input.id);
  const state = transitionDownwardState(current.status, downwardActions.OVERRIDE_VISIBILITY);
  const { data, error } = await admin
    .from("process_downward_evaluations")
    .update({
      visibility: input.visibility,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(downwardEvaluationSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditDownwardEvaluation(input.actor, data, "process.downward_evaluation.visibility_changed", current.status, state, {
    from: current.visibility,
    to: data.visibility,
  });
  await notifyDownwardEvaluationChanged(toDownwardNotification(data, "visibility_changed"));
  return data;
}

export async function updateSelfAssessmentVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient();
  const current = await getSelfAssessment(input.id);
  const state = transitionSelfAssessmentState(current.status, selfAssessmentActions.OVERRIDE_VISIBILITY);
  const { data, error } = await admin
    .from("process_self_assessments")
    .update({
      visibility: input.visibility,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(selfAssessmentSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditSelfAssessment(input.actor, data, "process.self_assessment.visibility_changed", current.status, state, {
    from: current.visibility,
    to: data.visibility,
  });
  await notifySelfAssessmentChanged(toSelfAssessmentNotification(data, "visibility_changed"));
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

async function validateSelectedFormVersion(config: ProcessConfig) {
  if (!config.formTemplateVersionId) return;
  const version = await getFormVersionSnapshot(config.formTemplateVersionId);
  if (config.formTemplateId && version.template_id !== config.formTemplateId) {
    throw new Error("Selected form version does not belong to the selected form template");
  }
}

async function getFormVersionSnapshot(versionId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("form_template_versions")
    .select("id,template_id,version_number,status,schema")
    .eq("id", versionId)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Selected form version was not found");
  return data;
}

async function assertProcessCanStart(processId: string, current: Record<string, any>) {
  if (!current.form_template_version_id || !current.locked_form_template_version_id) {
    throw new Error("Processes cannot start until a form version is locked during configuration");
  }
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from("process_participants")
    .select("id", { count: "exact", head: true })
    .eq("process_id", processId)
    .neq("status", "excluded");
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Processes cannot start when org filters produce zero eligible employees");
}

function diffVisibility(previous: unknown, next: unknown) {
  const previousText = JSON.stringify(previous ?? {});
  const nextText = JSON.stringify(next ?? {});
  return previousText === nextText ? [] : [{ previous: previous ?? {}, next: next ?? {} }];
}

function processNotificationAction(action: keyof typeof actionMap) {
  return ({
    schedule: "scheduled",
    start: "started",
    pause: "paused",
    resume: "resumed",
    complete: "completed",
    cancel: "cancelled",
  } as const)[action];
}

async function getSelfAssessment(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("process_self_assessments").select(selfAssessmentSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getDownwardEvaluation(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("process_downward_evaluations").select(downwardEvaluationSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getRoutingProfile(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select("id,manager_id,hrbp_id").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function moveSelfAssessment(
  actor: AuthUser,
  id: string,
  workflowAction: Parameters<typeof transitionSelfAssessmentState>[1],
  auditAction: string,
  notificationAction: "returned" | "approved" | "completed",
  extraPatch: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  const current = await getSelfAssessment(id);
  const state = transitionSelfAssessmentState(current.status, workflowAction);
  const { reason, ...dbExtraPatch } = extraPatch;
  const { data, error } = await admin
    .from("process_self_assessments")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbExtraPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(selfAssessmentSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditSelfAssessment(actor, data, auditAction, current.status, state, { reason });
  await notifySelfAssessmentChanged(toSelfAssessmentNotification(data, notificationAction));
  return data;
}

async function moveDownwardEvaluation(
  actor: AuthUser,
  id: string,
  workflowAction: Parameters<typeof transitionDownwardState>[1],
  auditAction: string,
  notificationAction: "returned" | "next_level_approved" | "hrbp_approved" | "completed",
  extraPatch: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  const current = await getDownwardEvaluation(id);
  const state = transitionDownwardState(current.status, workflowAction);
  const { reason, ...dbExtraPatch } = extraPatch;
  const { data, error } = await admin
    .from("process_downward_evaluations")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbExtraPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(downwardEvaluationSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditDownwardEvaluation(actor, data, auditAction, current.status, state, { reason });
  await notifyDownwardEvaluationChanged(toDownwardNotification(data, notificationAction));
  return data;
}

async function auditSelfAssessment(
  actor: AuthUser,
  selfAssessment: { id: string; process_id: string; employee_id: string },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown>,
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: selfAssessment.employee_id,
    action,
    entityType: "process_self_assessment",
    entityId: selfAssessment.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      processId: selfAssessment.process_id,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toSelfAssessmentNotification(
  selfAssessment: { id: string; process_id: string; employee_id: string; status: string; owner_role: string; next_action: string | null },
  action: Parameters<typeof notifySelfAssessmentChanged>[0]["action"],
) {
  return {
    selfAssessmentId: selfAssessment.id,
    processId: selfAssessment.process_id,
    employeeId: selfAssessment.employee_id,
    status: selfAssessment.status,
    owner: selfAssessment.owner_role,
    nextAction: selfAssessment.next_action,
    action,
  };
}

async function auditDownwardEvaluation(
  actor: AuthUser,
  downwardEvaluation: { id: string; process_id: string; employee_id: string },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown>,
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: downwardEvaluation.employee_id,
    action,
    entityType: "process_downward_evaluation",
    entityId: downwardEvaluation.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      processId: downwardEvaluation.process_id,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toDownwardNotification(
  downwardEvaluation: { id: string; process_id: string; employee_id: string; status: string; owner_role: string; next_action: string | null },
  action: Parameters<typeof notifyDownwardEvaluationChanged>[0]["action"],
) {
  return {
    downwardEvaluationId: downwardEvaluation.id,
    processId: downwardEvaluation.process_id,
    employeeId: downwardEvaluation.employee_id,
    status: downwardEvaluation.status,
    owner: downwardEvaluation.owner_role,
    nextAction: downwardEvaluation.next_action,
    action,
  };
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
