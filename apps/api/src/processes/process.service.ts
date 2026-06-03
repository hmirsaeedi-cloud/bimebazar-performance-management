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
  aggregatePulseAnswers,
  assertPulseSurveyHasEligibleRecipients,
  evaluateAnonymityGuard,
  getPulseSurveyState,
  lockPulseSurveyFormVersion,
  pulseSurveyActions,
  pulseSurveyStatuses,
  transitionPulseSurveyState,
} from "@bimebazar/pulse-survey-workflow";
import {
  assertSurveyHasEligibleRecipients,
  getIndividualSurveyState,
  individualSurveyActions,
  individualSurveyStatuses,
  lockSurveyFormVersion,
  transitionIndividualSurveyState,
} from "@bimebazar/individual-survey-process-workflow";
import {
  adminMoveFormInstanceState,
  assertLockedFormVersion,
  formInstanceActions,
  formInstanceStatuses,
  getFormInstanceState,
  transitionFormInstanceState,
} from "@bimebazar/process-form-instance-workflow";
import {
  getSelfAssessmentState,
  selfAssessmentActions,
  selfAssessmentStatuses,
  transitionSelfAssessmentState,
} from "@bimebazar/self-assessment-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import { notifyDownwardEvaluationChanged, notifyIndividualSurveyChanged, notifyProcessChanged, notifyProcessFormInstanceChanged, notifyPulseSurveyChanged, notifySelfAssessmentChanged } from "../notifications/notification.service.js";
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

const formInstanceSelect = `
  id,process_id,participant_id,employee_id,manager_id,form_template_id,form_template_version_id,
  locked_form_version_number,locked_form_schema,status,owner_role,next_action,response_payload,visibility,
  submitted_at,approved_at,returned_at,closed_at,visibility_changed_at,last_return_reason,
  admin_moved_at,admin_moved_by,admin_move_reason,admin_move_from_status,admin_move_to_status,
  created_by,updated_by,created_at,updated_at
`;

const individualSurveySelect = `
  id,process_id,title,description,status,owner_role,next_action,form_template_id,form_template_version_id,
  locked_form_template_version_id,target_employee_ids,eligible_employee_count,survey_settings,visibility,
  started_at,submitted_at,approved_at,returned_at,completed_at,cancelled_at,visibility_changed_at,last_return_reason,
  created_by,updated_by,created_at,updated_at,
  individual_survey_responses(id,survey_process_id,employee_id,status,owner_role,next_action,answers,submitted_at,approved_at,returned_at,last_return_reason,created_at,updated_at)
`;

const individualSurveyResponseSelect = `
  id,survey_process_id,employee_id,status,owner_role,next_action,answers,submitted_at,approved_at,returned_at,last_return_reason,
  created_by,updated_by,created_at,updated_at
`;

const pulseSurveySelect = `
  id,process_id,title,description,status,owner_role,next_action,form_template_id,form_template_version_id,
  locked_form_template_version_id,target_employee_ids,eligible_employee_count,min_responses,response_count,pulse_settings,
  aggregate_results,anonymity_guard,visibility,started_at,submitted_at,approved_at,returned_at,released_at,completed_at,
  cancelled_at,visibility_changed_at,last_return_reason,created_by,updated_by,created_at,updated_at,
  pulse_survey_responses(id,pulse_survey_id,respondent_code,status,owner_role,next_action,submitted_at,created_at,updated_at)
`;

const pulseSurveyResponseSelect = `
  id,pulse_survey_id,respondent_code,status,owner_role,next_action,answers,submitted_at,created_by,updated_by,created_at,updated_at
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

export async function listProcessFormInstances(input: { processId: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("process_form_instances")
    .select(formInstanceSelect)
    .eq("process_id", input.processId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listIndividualSurveys(input: { status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("individual_survey_processes").select(individualSurveySelect).order("updated_at", { ascending: false });
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listPulseSurveys(input: { status?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("pulse_survey_processes").select(pulseSurveySelect).order("updated_at", { ascending: false });
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createIndividualSurvey(input: {
  actor: AuthUser;
  title: string;
  description?: string;
  formTemplateId?: string | null;
  formTemplateVersionId: string;
  targetEmployeeIds: string[];
  surveySettings?: Record<string, unknown>;
  visibility?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  assertSurveyHasEligibleRecipients(input.targetEmployeeIds);
  const locked = lockSurveyFormVersion({ formTemplateVersionId: input.formTemplateVersionId });
  const version = await getFormVersionSnapshot(input.formTemplateVersionId);
  if (input.formTemplateId && version.template_id !== input.formTemplateId) {
    throw new Error("Selected form version does not belong to the selected form template");
  }
  const state = getIndividualSurveyState(individualSurveyStatuses.DRAFT);
  const { data, error } = await admin
    .from("individual_survey_processes")
    .insert({
      title: input.title,
      description: input.description ?? null,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      form_template_id: input.formTemplateId ?? version.template_id,
      form_template_version_id: locked.formTemplateVersionId,
      locked_form_template_version_id: locked.lockedFormTemplateVersionId,
      target_employee_ids: input.targetEmployeeIds,
      eligible_employee_count: input.targetEmployeeIds.length,
      survey_settings: input.surveySettings ?? {},
      visibility: input.visibility ?? {},
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(individualSurveySelect)
    .single();
  if (error) throw new Error(error.message);
  await auditIndividualSurvey(input.actor, data, "process.survey.created", null, state, {
    eligibleEmployeeCount: input.targetEmployeeIds.length,
    lockedFormTemplateVersionId: locked.lockedFormTemplateVersionId,
  });
  await notifyIndividualSurveyChanged(toIndividualSurveyNotification(data, "created"));
  return data;
}

export async function createPulseSurvey(input: {
  actor: AuthUser;
  title: string;
  description?: string;
  formTemplateId?: string | null;
  formTemplateVersionId: string;
  targetEmployeeIds: string[];
  minResponses?: number;
  pulseSettings?: Record<string, unknown>;
  visibility?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  assertPulseSurveyHasEligibleRecipients(input.targetEmployeeIds);
  const locked = lockPulseSurveyFormVersion({ formTemplateVersionId: input.formTemplateVersionId });
  const version = await getFormVersionSnapshot(input.formTemplateVersionId);
  if (input.formTemplateId && version.template_id !== input.formTemplateId) {
    throw new Error("Selected form version does not belong to the selected form template");
  }
  const state = getPulseSurveyState(pulseSurveyStatuses.DRAFT);
  const minResponses = input.minResponses ?? 3;
  const guard = evaluateAnonymityGuard({ responseCount: 0, minResponses });
  const { data, error } = await admin
    .from("pulse_survey_processes")
    .insert({
      title: input.title,
      description: input.description ?? null,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      form_template_id: input.formTemplateId ?? version.template_id,
      form_template_version_id: locked.formTemplateVersionId,
      locked_form_template_version_id: locked.lockedFormTemplateVersionId,
      target_employee_ids: input.targetEmployeeIds,
      eligible_employee_count: input.targetEmployeeIds.length,
      min_responses: minResponses,
      response_count: 0,
      pulse_settings: { anonymous: true, ...(input.pulseSettings ?? {}) },
      aggregate_results: {},
      anonymity_guard: guard,
      visibility: input.visibility ?? {},
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select(pulseSurveySelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPulseSurvey(input.actor, data, "process.pulse.created", null, state, {
    eligibleEmployeeCount: input.targetEmployeeIds.length,
    minResponses,
    lockedFormTemplateVersionId: locked.lockedFormTemplateVersionId,
  });
  await notifyPulseSurveyChanged(toPulseSurveyNotification(data, "created"));
  return data;
}

export async function updatePulseSurvey(input: {
  actor: AuthUser;
  id: string;
  patch: Partial<{
    title: string;
    description: string;
    formTemplateId: string | null;
    formTemplateVersionId: string;
    targetEmployeeIds: string[];
    minResponses: number;
    pulseSettings: Record<string, unknown>;
    visibility: Record<string, unknown>;
  }>;
}) {
  const current = await getPulseSurvey(input.id);
  if (![pulseSurveyStatuses.DRAFT, pulseSurveyStatuses.CONFIGURED, pulseSurveyStatuses.RETURNED, pulseSurveyStatuses.VISIBILITY_CHANGED].includes(current.status)) {
    throw new Error("Only draft, configured, returned, or visibility-changed pulse surveys can be updated");
  }
  const state = transitionPulseSurveyState(current.status, pulseSurveyActions.UPDATE);
  const dbPatch: Record<string, unknown> = {
    status: state.status,
    owner_role: state.owner,
    next_action: state.nextAction,
    updated_by: input.actor.id,
    updated_at: new Date().toISOString(),
  };
  if ("title" in input.patch) dbPatch.title = input.patch.title;
  if ("description" in input.patch) dbPatch.description = input.patch.description ?? null;
  if ("pulseSettings" in input.patch) dbPatch.pulse_settings = { anonymous: true, ...(input.patch.pulseSettings ?? {}) };
  if ("visibility" in input.patch) dbPatch.visibility = input.patch.visibility ?? {};
  if ("minResponses" in input.patch && input.patch.minResponses) {
    dbPatch.min_responses = input.patch.minResponses;
    dbPatch.anonymity_guard = evaluateAnonymityGuard({ responseCount: current.response_count ?? 0, minResponses: input.patch.minResponses });
  }
  if ("targetEmployeeIds" in input.patch) {
    assertPulseSurveyHasEligibleRecipients(input.patch.targetEmployeeIds ?? []);
    dbPatch.target_employee_ids = input.patch.targetEmployeeIds;
    dbPatch.eligible_employee_count = input.patch.targetEmployeeIds?.length ?? 0;
  }
  if ("formTemplateVersionId" in input.patch && input.patch.formTemplateVersionId) {
    const locked = lockPulseSurveyFormVersion({ formTemplateVersionId: input.patch.formTemplateVersionId });
    const version = await getFormVersionSnapshot(input.patch.formTemplateVersionId);
    if (input.patch.formTemplateId && version.template_id !== input.patch.formTemplateId) {
      throw new Error("Selected form version does not belong to the selected form template");
    }
    dbPatch.form_template_id = input.patch.formTemplateId ?? version.template_id;
    dbPatch.form_template_version_id = locked.formTemplateVersionId;
    dbPatch.locked_form_template_version_id = locked.lockedFormTemplateVersionId;
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("pulse_survey_processes").update(dbPatch).eq("id", input.id).select(pulseSurveySelect).single();
  if (error) throw new Error(error.message);
  await auditPulseSurvey(input.actor, data, "process.pulse.updated", current.status, state, {
    visibilityChanged: "visibility" in input.patch,
    changedFields: Object.keys(input.patch),
  });
  if ("visibility" in input.patch) {
    await auditPulseSurvey(input.actor, data, "process.pulse.visibility_changed", current.status, state, { from: current.visibility, to: data.visibility });
  }
  await notifyPulseSurveyChanged(toPulseSurveyNotification(data, "updated"));
  return data;
}

export async function startPulseSurvey(input: { actor: AuthUser; id: string }) {
  const current = await getPulseSurvey(input.id);
  assertPulseSurveyHasEligibleRecipients(current.target_employee_ids);
  const state = transitionPulseSurveyState(current.status, current.status === pulseSurveyStatuses.DRAFT ? pulseSurveyActions.CONFIGURE : pulseSurveyActions.START);
  const startState = state.status === pulseSurveyStatuses.CONFIGURED
    ? transitionPulseSurveyState(state.status, pulseSurveyActions.START)
    : state;
  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pulse_survey_processes")
    .update({ status: startState.status, owner_role: startState.owner, next_action: startState.nextAction, started_at: now, updated_by: input.actor.id, updated_at: now })
    .eq("id", input.id)
    .select(pulseSurveySelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPulseSurvey(input.actor, data, "process.pulse.started", current.status, startState, {
    eligibleEmployeeCount: current.eligible_employee_count,
    lockedFormTemplateVersionId: current.locked_form_template_version_id,
  });
  await notifyPulseSurveyChanged(toPulseSurveyNotification(data, "started"));
  return data;
}

export async function updateIndividualSurvey(input: {
  actor: AuthUser;
  id: string;
  patch: Partial<{
    title: string;
    description: string;
    formTemplateId: string | null;
    formTemplateVersionId: string;
    targetEmployeeIds: string[];
    surveySettings: Record<string, unknown>;
    visibility: Record<string, unknown>;
  }>;
}) {
  const admin = createSupabaseAdminClient();
  const current = await getIndividualSurvey(input.id);
  if (![individualSurveyStatuses.DRAFT, individualSurveyStatuses.CONFIGURED].includes(current.status)) {
    throw new Error("Only draft or configured individual surveys can be updated");
  }
  const state = transitionIndividualSurveyState(current.status, individualSurveyActions.UPDATE);
  const dbPatch: Record<string, unknown> = {
    status: state.status,
    owner_role: state.owner,
    next_action: state.nextAction,
    updated_by: input.actor.id,
    updated_at: new Date().toISOString(),
  };
  if ("title" in input.patch) dbPatch.title = input.patch.title;
  if ("description" in input.patch) dbPatch.description = input.patch.description ?? null;
  if ("surveySettings" in input.patch) dbPatch.survey_settings = input.patch.surveySettings ?? {};
  if ("visibility" in input.patch) dbPatch.visibility = input.patch.visibility ?? {};
  if ("targetEmployeeIds" in input.patch) {
    assertSurveyHasEligibleRecipients(input.patch.targetEmployeeIds ?? []);
    dbPatch.target_employee_ids = input.patch.targetEmployeeIds;
    dbPatch.eligible_employee_count = input.patch.targetEmployeeIds?.length ?? 0;
  }
  if ("formTemplateVersionId" in input.patch && input.patch.formTemplateVersionId) {
    const locked = lockSurveyFormVersion({ formTemplateVersionId: input.patch.formTemplateVersionId });
    const version = await getFormVersionSnapshot(input.patch.formTemplateVersionId);
    if (input.patch.formTemplateId && version.template_id !== input.patch.formTemplateId) {
      throw new Error("Selected form version does not belong to the selected form template");
    }
    dbPatch.form_template_id = input.patch.formTemplateId ?? version.template_id;
    dbPatch.form_template_version_id = locked.formTemplateVersionId;
    dbPatch.locked_form_template_version_id = locked.lockedFormTemplateVersionId;
  }
  const { data, error } = await admin.from("individual_survey_processes").update(dbPatch).eq("id", input.id).select(individualSurveySelect).single();
  if (error) throw new Error(error.message);
  await auditIndividualSurvey(input.actor, data, "process.survey.updated", current.status, state, {
    eligibleEmployeeCount: data.eligible_employee_count,
    visibilityChanged: "visibility" in input.patch,
  });
  if ("visibility" in input.patch) {
    await auditIndividualSurvey(input.actor, data, "process.survey.visibility_changed", current.status, state, {
      from: current.visibility,
      to: data.visibility,
    });
  }
  await notifyIndividualSurveyChanged(toIndividualSurveyNotification(data, "updated"));
  return data;
}

export async function startIndividualSurvey(input: { actor: AuthUser; id: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getIndividualSurvey(input.id);
  assertSurveyHasEligibleRecipients(current.target_employee_ids);
  const state = transitionIndividualSurveyState(current.status, individualSurveyActions.START);
  const now = new Date().toISOString();
  const responseState = { status: "assigned", owner: "EMPLOYEE", nextAction: "submit" };
  const { error: responseError } = await admin
    .from("individual_survey_responses")
    .upsert(
      current.target_employee_ids.map((employeeId: string) => ({
        survey_process_id: input.id,
        employee_id: employeeId,
        status: responseState.status,
        owner_role: responseState.owner,
        next_action: responseState.nextAction,
        created_by: input.actor.id,
        updated_by: input.actor.id,
        updated_at: now,
      })),
      { onConflict: "survey_process_id,employee_id" },
    );
  if (responseError) throw new Error(responseError.message);
  const { data, error } = await admin
    .from("individual_survey_processes")
    .update({ status: state.status, owner_role: state.owner, next_action: state.nextAction, started_at: now, updated_by: input.actor.id, updated_at: now })
    .eq("id", input.id)
    .select(individualSurveySelect)
    .single();
  if (error) throw new Error(error.message);
  await auditIndividualSurvey(input.actor, data, "process.survey.started", current.status, state, {
    eligibleEmployeeCount: current.eligible_employee_count,
    responseCount: current.target_employee_ids.length,
  });
  await notifyIndividualSurveyChanged(toIndividualSurveyNotification(data, "started"));
  return data;
}

export async function syncProcessFormInstances(input: { actor: AuthUser; processId: string }) {
  const admin = createSupabaseAdminClient();
  const process = await getProcess(input.processId);
  assertLockedFormVersion({
    lockedFormTemplateVersionId: process.locked_form_template_version_id,
    lockedFormSchema: process.locked_form_schema,
  });
  const { data: participants, error: participantError } = await admin
    .from("process_participants")
    .select("id,employee_id,manager_id,status")
    .eq("process_id", input.processId)
    .neq("status", "excluded");
  if (participantError) throw new Error(participantError.message);
  if (!participants?.length) {
    throw new Error("Processes cannot start when org filters produce zero eligible employees");
  }
  const state = getFormInstanceState(formInstanceStatuses.ASSIGNED);
  const { data, error } = await admin
    .from("process_form_instances")
    .upsert(
      participants.map((participant) => ({
        process_id: input.processId,
        participant_id: participant.id,
        employee_id: participant.employee_id,
        manager_id: participant.manager_id,
        form_template_id: process.form_template_id,
        form_template_version_id: process.locked_form_template_version_id,
        locked_form_version_number: process.locked_form_version_number,
        locked_form_schema: process.locked_form_schema,
        status: state.status,
        owner_role: state.owner,
        next_action: state.nextAction,
        created_by: input.actor.id,
        updated_by: input.actor.id,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "process_id,employee_id,form_template_version_id" },
    )
    .select(formInstanceSelect);
  if (error) throw new Error(error.message);
  await auditProcess(input.actor, input.processId, "process.form_instances.created", null, state, {
    instanceCount: data?.length ?? 0,
    lockedFormTemplateVersionId: process.locked_form_template_version_id,
    lockedFormVersionNumber: process.locked_form_version_number,
  });
  await notifyProcessFormInstanceChanged({
    processId: input.processId,
    status: state.status,
    owner: state.owner,
    nextAction: state.nextAction,
    action: "created",
    instanceCount: data?.length ?? 0,
  });
  return data ?? [];
}

export async function updateProcessFormInstance(input: { actor: AuthUser; id: string; responsePayload: Record<string, unknown> }) {
  const current = await getProcessFormInstance(input.id);
  const state = transitionFormInstanceState(current.status, formInstanceActions.UPDATE);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("process_form_instances")
    .update({
      response_payload: input.responsePayload,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(formInstanceSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditProcessFormInstance(input.actor, data, "process.form_instance.updated", current.status, state, {
    responseKeys: Object.keys(input.responsePayload),
  });
  await notifyProcessFormInstanceChanged(toFormInstanceNotification(data, "updated"));
  return data;
}

export async function submitProcessFormInstance(input: { actor: AuthUser; id: string; responsePayload: Record<string, unknown> }) {
  const current = await getProcessFormInstance(input.id);
  const state = transitionFormInstanceState(current.status, formInstanceActions.SUBMIT);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("process_form_instances")
    .update({
      response_payload: input.responsePayload,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      submitted_at: new Date().toISOString(),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(formInstanceSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditProcessFormInstance(input.actor, data, "process.form_instance.submitted", current.status, state, {
    responseKeys: Object.keys(input.responsePayload),
  });
  await notifyProcessFormInstanceChanged(toFormInstanceNotification(data, "submitted"));
  return data;
}

export async function approveProcessFormInstance(input: { actor: AuthUser; id: string }) {
  return moveProcessFormInstance(input.actor, input.id, formInstanceActions.APPROVE, "process.form_instance.approved", "approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function returnProcessFormInstance(input: { actor: AuthUser; id: string; reason: string }) {
  return moveProcessFormInstance(input.actor, input.id, formInstanceActions.RETURN, "process.form_instance.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function closeProcessFormInstance(input: { actor: AuthUser; id: string }) {
  return moveProcessFormInstance(input.actor, input.id, formInstanceActions.CLOSE, "process.form_instance.closed", "closed", {
    closed_at: new Date().toISOString(),
  });
}

export async function updateProcessFormInstanceVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  const current = await getProcessFormInstance(input.id);
  const state = transitionFormInstanceState(current.status, formInstanceActions.OVERRIDE_VISIBILITY);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("process_form_instances")
    .update({
      visibility: input.visibility,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      visibility_changed_at: new Date().toISOString(),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(formInstanceSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditProcessFormInstance(input.actor, data, "process.form_instance.visibility_changed", current.status, state, {
    from: current.visibility,
    to: data.visibility,
  });
  await notifyProcessFormInstanceChanged(toFormInstanceNotification(data, "visibility_changed"));
  return data;
}

export async function adminMoveProcessFormInstance(input: { actor: AuthUser; id: string; targetStatus: string; reason: string }) {
  const current = await getProcessFormInstance(input.id);
  const state = adminMoveFormInstanceState(input.targetStatus);
  const now = new Date().toISOString();
  const timestampPatch = timestampForFormInstanceStatus(state.status, now);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("process_form_instances")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      admin_moved_at: now,
      admin_moved_by: input.actor.id,
      admin_move_reason: input.reason,
      admin_move_from_status: current.status,
      admin_move_to_status: state.status,
      last_return_reason: state.status === formInstanceStatuses.RETURNED ? input.reason : current.last_return_reason,
      ...timestampPatch,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(formInstanceSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditProcessFormInstance(input.actor, data, "process.form_instance.admin_moved", current.status, state, {
    reason: input.reason,
    fromStatus: current.status,
    toStatus: state.status,
    lockedFormTemplateVersionId: data.form_template_version_id,
    lockedFormVersionNumber: data.locked_form_version_number,
  });
  await notifyProcessFormInstanceChanged(toFormInstanceNotification(data, "admin_moved"));
  return data;
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

export async function submitIndividualSurveyResponse(input: { actor: AuthUser; id: string; answers: Record<string, unknown>; saveOnly?: boolean }) {
  const admin = createSupabaseAdminClient();
  const current = await getIndividualSurveyResponse(input.id);
  const process = await getIndividualSurvey(current.survey_process_id);
  if (![individualSurveyStatuses.ACTIVE, individualSurveyStatuses.SUBMITTED, individualSurveyStatuses.RETURNED].includes(process.status)) {
    throw new Error("Individual survey responses can be submitted only while the survey is active or returned");
  }
  const isFinalSubmit = !input.saveOnly;
  const responseState = isFinalSubmit
    ? { status: "submitted", owner: "HRBP", nextAction: "approve" }
    : { status: "in_progress", owner: "EMPLOYEE", nextAction: "submit" };
  const processState = isFinalSubmit && process.status !== individualSurveyStatuses.SUBMITTED
    ? transitionIndividualSurveyState(process.status, individualSurveyActions.SUBMIT)
    : getIndividualSurveyState(process.status);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("individual_survey_responses")
    .update({
      answers: input.answers,
      status: responseState.status,
      owner_role: responseState.owner,
      next_action: responseState.nextAction,
      submitted_at: isFinalSubmit ? now : current.submitted_at,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(individualSurveyResponseSelect)
    .single();
  if (error) throw new Error(error.message);

  if (isFinalSubmit) {
    await admin
      .from("individual_survey_processes")
      .update({ status: processState.status, owner_role: processState.owner, next_action: processState.nextAction, submitted_at: now, updated_by: input.actor.id, updated_at: now })
      .eq("id", process.id);
  }
  await auditIndividualSurveyResponse(input.actor, data, isFinalSubmit ? "process.survey.submitted" : "process.survey.updated", current.status, {
    status: responseState.status,
    owner: responseState.owner,
    nextAction: responseState.nextAction,
  }, { answerKeys: Object.keys(input.answers), processId: process.id });
  await notifyIndividualSurveyChanged(toIndividualSurveyResponseNotification(data, isFinalSubmit ? "submitted" : "updated"));
  return data;
}

export async function approveIndividualSurveyResponse(input: { actor: AuthUser; id: string }) {
  return moveIndividualSurveyResponse(input.actor, input.id, "approved", "HRBP", null, "process.survey.approved", "approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function returnIndividualSurveyResponse(input: { actor: AuthUser; id: string; reason: string }) {
  return moveIndividualSurveyResponse(input.actor, input.id, "returned", "EMPLOYEE", "submit", "process.survey.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function completeIndividualSurvey(input: { actor: AuthUser; id: string }) {
  return moveIndividualSurvey(input.actor, input.id, individualSurveyActions.COMPLETE, "process.survey.completed", "completed", {
    completed_at: new Date().toISOString(),
  });
}

export async function cancelIndividualSurvey(input: { actor: AuthUser; id: string; reason?: string }) {
  return moveIndividualSurvey(input.actor, input.id, individualSurveyActions.CANCEL, "process.survey.cancelled", "cancelled", {
    cancelled_at: new Date().toISOString(),
    reason: input.reason,
  });
}

export async function updateIndividualSurveyVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient();
  const current = await getIndividualSurvey(input.id);
  const state = transitionIndividualSurveyState(current.status, individualSurveyActions.OVERRIDE_VISIBILITY);
  const { data, error } = await admin
    .from("individual_survey_processes")
    .update({
      visibility: input.visibility,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      visibility_changed_at: new Date().toISOString(),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(individualSurveySelect)
    .single();
  if (error) throw new Error(error.message);
  await auditIndividualSurvey(input.actor, data, "process.survey.visibility_changed", current.status, state, {
    from: current.visibility,
    to: data.visibility,
  });
  await notifyIndividualSurveyChanged(toIndividualSurveyNotification(data, "visibility_changed"));
  return data;
}

export async function submitPulseSurveyResponse(input: { actor: AuthUser; id: string; respondentCode: string; answers: Record<string, unknown> }) {
  const survey = await getPulseSurvey(input.id);
  if (![pulseSurveyStatuses.ACTIVE, pulseSurveyStatuses.ANONYMITY_REVIEW, pulseSurveyStatuses.RETURNED].includes(survey.status)) {
    throw new Error("Pulse survey responses can be submitted only while the survey is active or returned");
  }
  const responseState = { status: "submitted", owner: "HRBP", nextAction: "approve" };
  const respondentCode = await hashRespondentCode(`${input.id}:${input.respondentCode}`);
  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();
  const { data: response, error: responseError } = await admin
    .from("pulse_survey_responses")
    .upsert({
      pulse_survey_id: input.id,
      respondent_code: respondentCode,
      status: responseState.status,
      owner_role: responseState.owner,
      next_action: responseState.nextAction,
      answers: input.answers,
      submitted_at: now,
      created_by: input.actor.id,
      updated_by: input.actor.id,
      updated_at: now,
    }, { onConflict: "pulse_survey_id,respondent_code" })
    .select(pulseSurveyResponseSelect)
    .single();
  if (responseError) throw new Error(responseError.message);

  const { data: responses, error: responsesError } = await admin
    .from("pulse_survey_responses")
    .select("answers")
    .eq("pulse_survey_id", input.id)
    .eq("status", "submitted");
  if (responsesError) throw new Error(responsesError.message);
  const responseCount = responses?.length ?? 0;
  const guard = evaluateAnonymityGuard({ responseCount, minResponses: survey.min_responses });
  const state = survey.status === pulseSurveyStatuses.ANONYMITY_REVIEW
    ? getPulseSurveyState(survey.status)
    : transitionPulseSurveyState(survey.status, pulseSurveyActions.SUBMIT);
  const aggregateResults = guard.canRelease ? aggregatePulseAnswers(responses ?? []) : {};
  const { data, error } = await admin
    .from("pulse_survey_processes")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      response_count: responseCount,
      aggregate_results: aggregateResults,
      anonymity_guard: guard,
      submitted_at: now,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.id)
    .select(pulseSurveySelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPulseSurvey(input.actor, data, "process.pulse.submitted", survey.status, state, {
    responseCount,
    minResponses: survey.min_responses,
    canRelease: guard.canRelease,
  });
  await auditPulseSurveyResponse(input.actor, response, "process.pulse.response_submitted", null, responseState, {
    answerKeys: Object.keys(input.answers),
  });
  await notifyPulseSurveyChanged(toPulseSurveyNotification(data, "submitted"));
  return { survey: data, response };
}

export async function approvePulseSurvey(input: { actor: AuthUser; id: string }) {
  const current = await getPulseSurvey(input.id);
  const guard = evaluateAnonymityGuard({ responseCount: current.response_count ?? 0, minResponses: current.min_responses });
  if (!guard.canRelease) {
    throw new Error(`Pulse survey cannot be approved for release until ${guard.minResponses} anonymous responses exist`);
  }
  return movePulseSurvey(input.actor, input.id, pulseSurveyActions.APPROVE, "process.pulse.approved", "approved", {
    approved_at: new Date().toISOString(),
    anonymity_guard: guard,
  });
}

export async function releasePulseSurvey(input: { actor: AuthUser; id: string }) {
  const current = await getPulseSurvey(input.id);
  const admin = createSupabaseAdminClient();
  const { data: responses, error: responsesError } = await admin
    .from("pulse_survey_responses")
    .select("answers")
    .eq("pulse_survey_id", input.id)
    .eq("status", "submitted");
  if (responsesError) throw new Error(responsesError.message);
  const guard = evaluateAnonymityGuard({ responseCount: responses?.length ?? 0, minResponses: current.min_responses });
  if (!guard.canRelease) {
    throw new Error(`Pulse survey cannot release aggregates until ${guard.minResponses} anonymous responses exist`);
  }
  return movePulseSurvey(input.actor, input.id, pulseSurveyActions.RELEASE_RESULTS, "process.pulse.released", "released", {
    released_at: new Date().toISOString(),
    aggregate_results: aggregatePulseAnswers(responses ?? []),
    response_count: responses?.length ?? 0,
    anonymity_guard: guard,
  });
}

export async function returnPulseSurvey(input: { actor: AuthUser; id: string; reason: string }) {
  return movePulseSurvey(input.actor, input.id, pulseSurveyActions.RETURN, "process.pulse.returned", "returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function completePulseSurvey(input: { actor: AuthUser; id: string }) {
  return movePulseSurvey(input.actor, input.id, pulseSurveyActions.COMPLETE, "process.pulse.completed", "completed", {
    completed_at: new Date().toISOString(),
  });
}

export async function cancelPulseSurvey(input: { actor: AuthUser; id: string; reason?: string }) {
  return movePulseSurvey(input.actor, input.id, pulseSurveyActions.CANCEL, "process.pulse.cancelled", "cancelled", {
    cancelled_at: new Date().toISOString(),
    reason: input.reason,
  });
}

export async function updatePulseSurveyVisibility(input: { actor: AuthUser; id: string; visibility: Record<string, unknown> }) {
  const current = await getPulseSurvey(input.id);
  const state = transitionPulseSurveyState(current.status, pulseSurveyActions.OVERRIDE_VISIBILITY);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pulse_survey_processes")
    .update({
      visibility: input.visibility,
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      visibility_changed_at: new Date().toISOString(),
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(pulseSurveySelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPulseSurvey(input.actor, data, "process.pulse.visibility_changed", current.status, state, { from: current.visibility, to: data.visibility });
  await notifyPulseSurveyChanged(toPulseSurveyNotification(data, "visibility_changed"));
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

async function getProcessFormInstance(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("process_form_instances").select(formInstanceSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getIndividualSurvey(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("individual_survey_processes").select(individualSurveySelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getIndividualSurveyResponse(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("individual_survey_responses").select(individualSurveyResponseSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getPulseSurvey(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("pulse_survey_processes").select(pulseSurveySelect).eq("id", id).single();
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

async function moveProcessFormInstance(
  actor: AuthUser,
  id: string,
  workflowAction: Parameters<typeof transitionFormInstanceState>[1],
  auditAction: string,
  notificationAction: "approved" | "returned" | "closed",
  extraPatch: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  const current = await getProcessFormInstance(id);
  const state = transitionFormInstanceState(current.status, workflowAction);
  const { reason, ...dbExtraPatch } = extraPatch;
  const { data, error } = await admin
    .from("process_form_instances")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbExtraPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(formInstanceSelect)
    .single();
  if (error) throw new Error(error.message);

  await auditProcessFormInstance(actor, data, auditAction, current.status, state, { reason });
  await notifyProcessFormInstanceChanged(toFormInstanceNotification(data, notificationAction));
  return data;
}

function timestampForFormInstanceStatus(status: string, now: string) {
  const mapping: Record<string, Record<string, string>> = {
    assigned: {},
    in_progress: {},
    submitted: { submitted_at: now },
    approved: { approved_at: now },
    returned: { returned_at: now },
    closed: { closed_at: now },
  };
  return mapping[status] ?? {};
}

async function moveIndividualSurvey(
  actor: AuthUser,
  id: string,
  workflowAction: Parameters<typeof transitionIndividualSurveyState>[1],
  auditAction: string,
  notificationAction: "completed" | "cancelled",
  extraPatch: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  const current = await getIndividualSurvey(id);
  const state = transitionIndividualSurveyState(current.status, workflowAction);
  const { reason, ...dbExtraPatch } = extraPatch;
  const { data, error } = await admin
    .from("individual_survey_processes")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbExtraPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(individualSurveySelect)
    .single();
  if (error) throw new Error(error.message);
  await auditIndividualSurvey(actor, data, auditAction, current.status, state, { reason });
  await notifyIndividualSurveyChanged(toIndividualSurveyNotification(data, notificationAction));
  return data;
}

async function moveIndividualSurveyResponse(
  actor: AuthUser,
  id: string,
  responseStatus: string,
  responseOwner: string,
  responseNextAction: string | null,
  auditAction: string,
  notificationAction: "approved" | "returned",
  extraPatch: Record<string, unknown>,
) {
  const admin = createSupabaseAdminClient();
  const current = await getIndividualSurveyResponse(id);
  const process = await getIndividualSurvey(current.survey_process_id);
  const workflowAction = responseStatus === "approved" ? individualSurveyActions.APPROVE : individualSurveyActions.RETURN;
  const processState =
    (responseStatus === "approved" && process.status === individualSurveyStatuses.APPROVED)
    || (responseStatus === "returned" && process.status === individualSurveyStatuses.RETURNED)
      ? getIndividualSurveyState(process.status)
      : transitionIndividualSurveyState(process.status, workflowAction);
  const { reason, ...dbExtraPatch } = extraPatch;
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("individual_survey_responses")
    .update({
      status: responseStatus,
      owner_role: responseOwner,
      next_action: responseNextAction,
      ...dbExtraPatch,
      updated_by: actor.id,
      updated_at: now,
    })
    .eq("id", id)
    .select(individualSurveyResponseSelect)
    .single();
  if (error) throw new Error(error.message);
  await admin
    .from("individual_survey_processes")
    .update({
      status: processState.status,
      owner_role: processState.owner,
      next_action: processState.nextAction,
      approved_at: responseStatus === "approved" ? now : process.approved_at,
      returned_at: responseStatus === "returned" ? now : process.returned_at,
      last_return_reason: responseStatus === "returned" ? reason : process.last_return_reason,
      updated_by: actor.id,
      updated_at: now,
    })
    .eq("id", process.id);

  await auditIndividualSurveyResponse(actor, data, auditAction, current.status, {
    status: responseStatus,
    owner: responseOwner,
    nextAction: responseNextAction,
  }, { reason, processId: process.id });
  await notifyIndividualSurveyChanged(toIndividualSurveyResponseNotification(data, notificationAction));
  return data;
}

async function movePulseSurvey(
  actor: AuthUser,
  id: string,
  workflowAction: Parameters<typeof transitionPulseSurveyState>[1],
  auditAction: string,
  notificationAction: "approved" | "returned" | "released" | "completed" | "cancelled",
  extraPatch: Record<string, unknown>,
) {
  const current = await getPulseSurvey(id);
  const state = transitionPulseSurveyState(current.status, workflowAction);
  const { reason, ...dbExtraPatch } = extraPatch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pulse_survey_processes")
    .update({
      status: state.status,
      owner_role: state.owner,
      next_action: state.nextAction,
      ...dbExtraPatch,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(pulseSurveySelect)
    .single();
  if (error) throw new Error(error.message);
  await auditPulseSurvey(actor, data, auditAction, current.status, state, { reason });
  await notifyPulseSurveyChanged(toPulseSurveyNotification(data, notificationAction));
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

async function auditProcessFormInstance(
  actor: AuthUser,
  formInstance: { id: string; process_id: string; employee_id: string; form_template_version_id: string; locked_form_version_number?: number | null },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown>,
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: formInstance.employee_id,
    action,
    entityType: "process_form_instance",
    entityId: formInstance.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      processId: formInstance.process_id,
      formTemplateVersionId: formInstance.form_template_version_id,
      lockedFormVersionNumber: formInstance.locked_form_version_number ?? null,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toFormInstanceNotification(
  formInstance: { id: string; process_id: string; employee_id: string; status: string; owner_role: string; next_action: string | null },
  action: Parameters<typeof notifyProcessFormInstanceChanged>[0]["action"],
) {
  return {
    formInstanceId: formInstance.id,
    processId: formInstance.process_id,
    employeeId: formInstance.employee_id,
    status: formInstance.status,
    owner: formInstance.owner_role,
    nextAction: formInstance.next_action,
    action,
    instanceCount: 1,
  };
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

async function auditIndividualSurvey(
  actor: AuthUser,
  survey: { id: string; target_employee_ids?: string[]; form_template_version_id: string; locked_form_template_version_id: string },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown>,
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    action,
    entityType: "individual_survey_process",
    entityId: survey.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      owner: state.owner,
      nextAction: state.nextAction,
      formTemplateVersionId: survey.form_template_version_id,
      lockedFormTemplateVersionId: survey.locked_form_template_version_id,
      targetEmployeeIds: survey.target_employee_ids ?? [],
      ...metadata,
    },
  });
}

async function auditIndividualSurveyResponse(
  actor: AuthUser,
  response: { id: string; survey_process_id: string; employee_id: string },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown>,
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    targetUserId: response.employee_id,
    action,
    entityType: "individual_survey_response",
    entityId: response.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      surveyProcessId: response.survey_process_id,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

async function auditPulseSurvey(
  actor: AuthUser,
  survey: {
    id: string;
    target_employee_ids?: string[];
    form_template_version_id: string;
    locked_form_template_version_id: string;
    eligible_employee_count?: number;
    min_responses?: number;
    response_count?: number;
    anonymity_guard?: Record<string, unknown>;
  },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown>,
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    action,
    entityType: "pulse_survey_process",
    entityId: survey.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      owner: state.owner,
      nextAction: state.nextAction,
      formTemplateVersionId: survey.form_template_version_id,
      lockedFormTemplateVersionId: survey.locked_form_template_version_id,
      eligibleEmployeeCount: survey.eligible_employee_count ?? survey.target_employee_ids?.length ?? 0,
      minResponses: survey.min_responses,
      responseCount: survey.response_count,
      anonymityGuard: survey.anonymity_guard,
      ...metadata,
    },
  });
}

async function auditPulseSurveyResponse(
  actor: AuthUser,
  response: { id: string; pulse_survey_id: string; respondent_code: string },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown>,
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    action,
    entityType: "pulse_survey_response",
    entityId: response.id,
    fromStatus,
    toStatus: state.status,
    metadata: {
      pulseSurveyId: response.pulse_survey_id,
      respondentCodeHash: response.respondent_code,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function toIndividualSurveyNotification(
  survey: { id: string; status: string; owner_role: string; next_action: string | null; eligible_employee_count?: number },
  action: Parameters<typeof notifyIndividualSurveyChanged>[0]["action"],
) {
  return {
    surveyProcessId: survey.id,
    status: survey.status,
    owner: survey.owner_role,
    nextAction: survey.next_action,
    action,
    eligibleEmployeeCount: survey.eligible_employee_count,
  };
}

function toIndividualSurveyResponseNotification(
  response: { id: string; survey_process_id: string; employee_id: string; status: string; owner_role: string; next_action: string | null },
  action: Parameters<typeof notifyIndividualSurveyChanged>[0]["action"],
) {
  return {
    surveyProcessId: response.survey_process_id,
    responseId: response.id,
    employeeId: response.employee_id,
    status: response.status,
    owner: response.owner_role,
    nextAction: response.next_action,
    action,
  };
}

function toPulseSurveyNotification(
  survey: {
    id: string;
    status: string;
    owner_role: string;
    next_action: string | null;
    eligible_employee_count?: number;
    response_count?: number;
    min_responses?: number;
    anonymity_guard?: { canRelease?: boolean } | null;
  },
  action: Parameters<typeof notifyPulseSurveyChanged>[0]["action"],
) {
  return {
    pulseSurveyId: survey.id,
    status: survey.status,
    owner: survey.owner_role,
    nextAction: survey.next_action,
    action,
    eligibleEmployeeCount: survey.eligible_employee_count,
    responseCount: survey.response_count,
    minResponses: survey.min_responses,
    canRelease: survey.anonymity_guard?.canRelease,
  };
}

async function hashRespondentCode(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
