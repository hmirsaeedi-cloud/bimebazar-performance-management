import {
  formBuilderActions,
  formBuilderStatuses,
  getFormBuilderState,
  transitionFormBuilderState,
} from "@bimebazar/form-builder-workflow";
import {
  formVersionActions,
  formVersionStatuses,
  getFormVersionState,
  summarizeFormSchema,
  transitionFormVersionState,
} from "@bimebazar/form-versioning-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyFormTemplateChanged } from "../notifications/notification.service.js";
import { formTemplatePresets, type FormPresetKey } from "./form.presets.js";

const templateSelect = `
  id,name,description,module,status,owner_role,current_version_id,
  template_key,template_category,is_system_template,source_template_id,
  created_by,updated_by,created_at,updated_at,
  form_template_versions(id,parent_version_id,version_number,status,version_status,version_owner_role,version_next_action,schema,change_summary,visibility_policy,created_at,published_at,submitted_at,approved_at,returned_at,archived_at,visibility_changed_at,last_return_reason)
`;

const versionSelect = `
  id,template_id,parent_version_id,version_number,status,version_status,version_owner_role,version_next_action,
  schema,change_summary,visibility_policy,submitted_at,approved_at,returned_at,archived_at,visibility_changed_at,
  last_return_reason,created_by,published_by,created_at,published_at
`;

interface FormTemplateInput {
  actor: AuthUser;
  name: string;
  description?: string;
  module: string;
  schema: unknown;
  templateKey?: string | null;
  templateCategory?: "system_default" | "custom";
  isSystemTemplate?: boolean;
  sourceTemplateId?: string | null;
}

export async function listFormTemplates(input: { status?: string; module?: string; search?: string; templateCategory?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("form_templates").select(templateSelect).order("updated_at", { ascending: false });

  if (input.status) query = query.eq("status", input.status);
  if (input.module) query = query.eq("module", input.module);
  if (input.templateCategory) query = query.eq("template_category", input.templateCategory);
  if (input.search) query = query.ilike("name", `%${input.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function listFormTemplatePresets() {
  return Object.values(formTemplatePresets).map((preset) => ({
    key: preset.key,
    name: preset.name,
    description: preset.description,
    module: preset.module,
    questionCount: countQuestions(preset.schema),
  }));
}

export async function getFormTemplate(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("form_templates").select(templateSelect).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listFormVersionEdits(input: { templateId: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("form_template_versions")
    .select(versionSelect)
    .eq("template_id", input.templateId)
    .order("version_number", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createFormTemplate(input: FormTemplateInput) {
  const admin = createSupabaseAdminClient();
  const state = getFormBuilderState(formBuilderStatuses.DRAFT);

  const { data: template, error: templateError } = await admin
    .from("form_templates")
    .insert({
      name: input.name,
      description: input.description ?? null,
      module: input.module,
      status: state.status,
      owner_role: state.owner,
      template_key: input.templateKey ?? null,
      template_category: input.templateCategory ?? "custom",
      is_system_template: input.isSystemTemplate ?? false,
      source_template_id: input.sourceTemplateId ?? null,
      created_by: input.actor.id,
      updated_by: input.actor.id,
    })
    .select("id")
    .single();
  if (templateError || !template) throw new Error(templateError?.message ?? "Could not create form template");

  const { data: version, error: versionError } = await admin
    .from("form_template_versions")
    .insert({
      template_id: template.id,
      version_number: 1,
      status: state.status,
      schema: input.schema,
      created_by: input.actor.id,
    })
    .select("id")
    .single();
  if (versionError || !version) throw new Error(versionError?.message ?? "Could not create form version");

  await admin
    .from("form_templates")
    .update({ current_version_id: version.id, updated_at: new Date().toISOString() })
    .eq("id", template.id);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "form_template.created",
    entityType: "form_template",
    entityId: template.id,
    fromStatus: null,
    toStatus: state.status,
    metadata: {
      owner: state.owner,
      nextAction: state.nextAction,
      versionId: version.id,
      questionCount: countQuestions(input.schema),
      templateCategory: input.templateCategory ?? "custom",
      sourceTemplateId: input.sourceTemplateId ?? null,
    },
  });
  await notifyFormTemplateChanged({
    templateId: template.id,
    status: state.status,
    action: "created",
    questionCount: countQuestions(input.schema),
  });

  return getFormTemplate(template.id);
}

export async function seedDefaultFormTemplates(input: { actor: AuthUser }) {
  const seeded = [];
  for (const preset of Object.values(formTemplatePresets)) {
    seeded.push(await upsertSystemPreset({ actor: input.actor, presetKey: preset.key }));
  }
  return seeded;
}

export async function cloneFormTemplatePreset(input: {
  actor: AuthUser;
  presetKey: string;
  name?: string;
  description?: string;
}) {
  const preset = formTemplatePresets[input.presetKey as FormPresetKey];
  if (!preset) throw new Error(`Unknown form template preset: ${input.presetKey}`);
  const systemTemplate = await upsertSystemPreset({ actor: input.actor, presetKey: preset.key });
  return createFormTemplate({
    actor: input.actor,
    name: input.name ?? `${preset.name} copy`,
    description: input.description ?? preset.description,
    module: preset.module,
    schema: preset.schema,
    templateCategory: "custom",
    sourceTemplateId: systemTemplate.id,
  });
}

async function upsertSystemPreset(input: { actor: AuthUser; presetKey: FormPresetKey }) {
  const preset = formTemplatePresets[input.presetKey];
  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("form_templates")
    .select(templateSelect)
    .eq("template_key", preset.key)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing;

  const template = await createFormTemplate({
    actor: input.actor,
    name: preset.name,
    description: preset.description,
    module: preset.module,
    schema: preset.schema,
    templateKey: preset.key,
    templateCategory: "system_default",
    isSystemTemplate: true,
  });
  const publishedTemplate = await publishFormTemplate({ actor: input.actor, id: template.id });

  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "form_template.system_seeded",
    entityType: "form_template",
    entityId: publishedTemplate.id,
    fromStatus: null,
    toStatus: publishedTemplate.status,
    metadata: {
      owner: publishedTemplate.owner_role,
      nextAction: "return_to_draft",
      templateKey: preset.key,
      questionCount: countQuestions(preset.schema),
    },
  });
  return publishedTemplate;
}

export async function updateFormTemplate(input: {
  actor: AuthUser;
  id: string;
  patch: { name?: string; description?: string; module?: string; schema?: unknown };
}) {
  const admin = createSupabaseAdminClient();
  const current = await getFormTemplate(input.id);
  if (current.status !== formBuilderStatuses.DRAFT) {
    throw new Error("Only draft form templates can be updated");
  }

  const state = transitionFormBuilderState(current.status, formBuilderActions.UPDATE_DRAFT);
  const templatePatch: Record<string, unknown> = {
    updated_by: input.actor.id,
    updated_at: new Date().toISOString(),
    owner_role: state.owner,
  };
  for (const field of ["name", "description", "module"] as const) {
    if (field in input.patch) templatePatch[field] = input.patch[field] ?? null;
  }

  const { error: templateError } = await admin.from("form_templates").update(templatePatch).eq("id", input.id);
  if (templateError) throw new Error(templateError.message);

  if (input.patch.schema) {
    const { error: versionError } = await admin
      .from("form_template_versions")
      .update({ schema: input.patch.schema })
      .eq("id", current.current_version_id);
    if (versionError) throw new Error(versionError.message);
  }

  const visibilityChanges = input.patch.schema
    ? diffVisibilityRules(getCurrentVersionSchema(current), input.patch.schema)
    : [];

  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "form_template.updated",
    entityType: "form_template",
    entityId: input.id,
    fromStatus: current.status,
    toStatus: state.status,
    metadata: {
      owner: state.owner,
      nextAction: state.nextAction,
      questionCount: input.patch.schema ? countQuestions(input.patch.schema) : undefined,
      visibilityChanges,
    },
  });
  if (visibilityChanges.length > 0) {
    await writeAuditEvent({
      actorUserId: input.actor.id,
      action: "form_template.visibility_changed",
      entityType: "form_template",
      entityId: input.id,
      fromStatus: current.status,
      toStatus: state.status,
      metadata: {
        owner: state.owner,
        nextAction: state.nextAction,
        visibilityChanges,
      },
    });
  }
  await notifyFormTemplateChanged({
    templateId: input.id,
    status: state.status,
    action: "updated",
    questionCount: input.patch.schema ? countQuestions(input.patch.schema) : undefined,
  });

  return getFormTemplate(input.id);
}

export async function createFormVersionEdit(input: {
  actor: AuthUser;
  templateId: string;
  schema?: unknown;
  changeSummary?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const template = await getFormTemplate(input.templateId);
  const currentVersion = getCurrentVersion(template);
  const state = getFormVersionState(formVersionStatuses.DRAFT_EDIT);
  const nextVersionNumber = getNextVersionNumber(template);
  const schema = input.schema ?? currentVersion?.schema ?? { title: template.name, sections: [] };
  const { data, error } = await admin
    .from("form_template_versions")
    .insert({
      template_id: input.templateId,
      parent_version_id: currentVersion?.id ?? null,
      version_number: nextVersionNumber,
      status: "draft",
      version_status: state.status,
      version_owner_role: state.owner,
      version_next_action: state.nextAction,
      schema,
      change_summary: {
        ...summarizeFormSchema(schema),
        ...(input.changeSummary ?? {}),
      },
      visibility_policy: defaultVersionVisibility(),
      created_by: input.actor.id,
    })
    .select(versionSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditFormVersion(input.actor, data, "form_version.created", null, state, {
    parentVersionId: currentVersion?.id ?? null,
    visibilityChanges: diffVisibilityRules(currentVersion?.schema, schema),
  });
  return data;
}

export async function updateFormVersionEdit(input: {
  actor: AuthUser;
  templateId: string;
  versionId: string;
  schema?: unknown;
  changeSummary?: Record<string, unknown>;
}) {
  const current = await getFormVersion(input.versionId);
  assertVersionBelongsToTemplate(current, input.templateId);
  const state = transitionFormVersionState(current.version_status, formVersionActions.UPDATE);
  const schema = input.schema ?? current.schema;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("form_template_versions")
    .update({
      schema,
      version_status: state.status,
      version_owner_role: state.owner,
      version_next_action: state.nextAction,
      change_summary: {
        ...(current.change_summary ?? {}),
        ...summarizeFormSchema(schema),
        ...(input.changeSummary ?? {}),
      },
    })
    .eq("id", input.versionId)
    .select(versionSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditFormVersion(input.actor, data, "form_version.updated", current.version_status, state, {
    visibilityChanges: diffVisibilityRules(current.schema, schema),
  });
  const visibilityChanges = diffVisibilityRules(current.schema, schema);
  if (visibilityChanges.length > 0) {
    await auditFormVersion(input.actor, data, "form_version.visibility_changed", current.version_status, state, { visibilityChanges });
  }
  return data;
}

export async function submitFormVersionEdit(input: { actor: AuthUser; templateId: string; versionId: string }) {
  return moveFormVersion(input.actor, input.templateId, input.versionId, formVersionActions.SUBMIT, "form_version.submitted", {
    submitted_at: new Date().toISOString(),
  });
}

export async function approveFormVersionEdit(input: { actor: AuthUser; templateId: string; versionId: string }) {
  return moveFormVersion(input.actor, input.templateId, input.versionId, formVersionActions.APPROVE, "form_version.approved", {
    approved_at: new Date().toISOString(),
  });
}

export async function returnFormVersionEdit(input: { actor: AuthUser; templateId: string; versionId: string; reason: string }) {
  return moveFormVersion(input.actor, input.templateId, input.versionId, formVersionActions.RETURN, "form_version.returned", {
    returned_at: new Date().toISOString(),
    last_return_reason: input.reason,
    reason: input.reason,
  });
}

export async function archiveFormVersionEdit(input: { actor: AuthUser; templateId: string; versionId: string }) {
  return moveFormVersion(input.actor, input.templateId, input.versionId, formVersionActions.ARCHIVE, "form_version.archived", {
    archived_at: new Date().toISOString(),
    status: "archived",
  });
}

export async function publishFormVersionEdit(input: { actor: AuthUser; templateId: string; versionId: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getFormVersion(input.versionId);
  assertVersionBelongsToTemplate(current, input.templateId);
  const state = transitionFormVersionState(current.version_status, formVersionActions.PUBLISH);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("form_template_versions")
    .update({
      status: "published",
      version_status: state.status,
      version_owner_role: state.owner,
      version_next_action: state.nextAction,
      published_by: input.actor.id,
      published_at: now,
    })
    .eq("id", input.versionId)
    .select(versionSelect)
    .single();
  if (error) throw new Error(error.message);
  const { error: templateError } = await admin
    .from("form_templates")
    .update({
      status: "published",
      owner_role: "HRBP",
      current_version_id: input.versionId,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.templateId);
  if (templateError) throw new Error(templateError.message);
  await auditFormVersion(input.actor, data, "form_version.published", current.version_status, state, {
    previousCurrentVersionId: current.parent_version_id,
  });
  await notifyFormTemplateChanged({
    templateId: input.templateId,
    status: "published",
    action: "published",
    questionCount: countQuestions(current.schema),
  });
  return getFormTemplate(input.templateId);
}

export async function updateFormVersionVisibility(input: {
  actor: AuthUser;
  templateId: string;
  versionId: string;
  visibilityPolicy: Record<string, unknown>;
}) {
  const current = await getFormVersion(input.versionId);
  assertVersionBelongsToTemplate(current, input.templateId);
  const state = transitionFormVersionState(current.version_status, formVersionActions.OVERRIDE_VISIBILITY);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("form_template_versions")
    .update({
      version_status: state.status,
      version_owner_role: state.owner,
      version_next_action: state.nextAction,
      visibility_policy: input.visibilityPolicy,
      visibility_changed_at: new Date().toISOString(),
    })
    .eq("id", input.versionId)
    .select(versionSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditFormVersion(input.actor, data, "form_version.visibility_changed", current.version_status, state, {
    from: current.visibility_policy,
    to: input.visibilityPolicy,
  });
  return data;
}

export async function publishFormTemplate(input: { actor: AuthUser; id: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getFormTemplate(input.id);
  const nextState = transitionFormBuilderState(current.status, formBuilderActions.PUBLISH);
  const now = new Date().toISOString();

  const { error: versionError } = await admin
    .from("form_template_versions")
    .update({ status: nextState.status, published_by: input.actor.id, published_at: now })
    .eq("id", current.current_version_id);
  if (versionError) throw new Error(versionError.message);

  const { error: templateError } = await admin
    .from("form_templates")
    .update({
      status: nextState.status,
      owner_role: nextState.owner,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.id);
  if (templateError) throw new Error(templateError.message);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "form_template.published",
    entityType: "form_template",
    entityId: input.id,
    fromStatus: current.status,
    toStatus: nextState.status,
    metadata: {
      owner: nextState.owner,
      nextAction: nextState.nextAction,
      currentVersionId: current.current_version_id,
    },
  });
  await notifyFormTemplateChanged({
    templateId: input.id,
    status: nextState.status,
    action: "published",
    questionCount: countQuestions(getCurrentVersionSchema(current)),
  });

  return getFormTemplate(input.id);
}

export async function returnFormTemplateToDraft(input: { actor: AuthUser; id: string; reason: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getFormTemplate(input.id);
  const nextState = transitionFormBuilderState(current.status, formBuilderActions.RETURN_TO_DRAFT);
  const currentVersion = getCurrentVersion(current);
  const nextVersionNumber = getNextVersionNumber(current);
  const now = new Date().toISOString();

  const { data: version, error: versionError } = await admin
    .from("form_template_versions")
    .insert({
      template_id: input.id,
      version_number: nextVersionNumber,
      status: nextState.status,
      schema: currentVersion?.schema ?? { title: current.name, sections: [] },
      created_by: input.actor.id,
    })
    .select("id")
    .single();
  if (versionError || !version) throw new Error(versionError?.message ?? "Could not create returned draft version");

  const { error: templateError } = await admin
    .from("form_templates")
    .update({
      status: nextState.status,
      owner_role: nextState.owner,
      current_version_id: version.id,
      updated_by: input.actor.id,
      updated_at: now,
    })
    .eq("id", input.id);
  if (templateError) throw new Error(templateError.message);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "form_template.returned",
    entityType: "form_template",
    entityId: input.id,
    fromStatus: current.status,
    toStatus: nextState.status,
    reason: input.reason,
    metadata: {
      owner: nextState.owner,
      nextAction: nextState.nextAction,
      previousVersionId: current.current_version_id,
      versionId: version.id,
      versionNumber: nextVersionNumber,
      questionCount: countQuestions(currentVersion?.schema),
    },
  });
  await notifyFormTemplateChanged({
    templateId: input.id,
    status: nextState.status,
    action: "returned",
    questionCount: countQuestions(currentVersion?.schema),
  });

  return getFormTemplate(input.id);
}

export async function archiveFormTemplate(input: { actor: AuthUser; id: string; reason: string }) {
  const admin = createSupabaseAdminClient();
  const current = await getFormTemplate(input.id);
  const nextState = transitionFormBuilderState(current.status, formBuilderActions.ARCHIVE);

  const { error: templateError } = await admin
    .from("form_templates")
    .update({
      status: nextState.status,
      owner_role: nextState.owner,
      updated_by: input.actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (templateError) throw new Error(templateError.message);

  await admin.from("form_template_versions").update({ status: nextState.status }).eq("template_id", input.id);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    action: "form_template.archived",
    entityType: "form_template",
    entityId: input.id,
    fromStatus: current.status,
    toStatus: nextState.status,
    reason: input.reason,
    metadata: {
      owner: nextState.owner,
      nextAction: nextState.nextAction,
    },
  });
  await notifyFormTemplateChanged({
    templateId: input.id,
    status: nextState.status,
    action: "archived",
    questionCount: countQuestions(getCurrentVersionSchema(current)),
  });

  return getFormTemplate(input.id);
}

function countQuestions(schema: unknown) {
  if (!schema || typeof schema !== "object" || !("sections" in schema)) return 0;
  const sections = (schema as { sections?: Array<{ questions?: unknown[] }> }).sections;
  return sections?.reduce((sum, section) => sum + (section.questions?.length ?? 0), 0) ?? 0;
}

function getCurrentVersion(template: Record<string, unknown>) {
  const versions = template.form_template_versions as
    | Array<{ id: string; version_number: number; schema: unknown }>
    | undefined;
  return versions?.find((version) => version.id === template.current_version_id) ?? versions?.[0] ?? null;
}

function getCurrentVersionSchema(template: Record<string, unknown>) {
  return getCurrentVersion(template)?.schema;
}

function getNextVersionNumber(template: Record<string, unknown>) {
  const versions = template.form_template_versions as Array<{ version_number: number }> | undefined;
  return Math.max(0, ...(versions ?? []).map((version) => version.version_number)) + 1;
}

function extractVisibilityRules(schema: unknown) {
  const rules = new Map<string, unknown>();
  if (!schema || typeof schema !== "object" || !("sections" in schema)) return rules;
  const sections = (schema as { sections?: Array<{ questions?: Array<{ id?: string; visibility?: unknown }> }> }).sections ?? [];
  for (const section of sections) {
    for (const question of section.questions ?? []) {
      if (question.id && question.visibility) rules.set(question.id, question.visibility);
    }
  }
  return rules;
}

function diffVisibilityRules(previousSchema: unknown, nextSchema: unknown) {
  const previous = extractVisibilityRules(previousSchema);
  const next = extractVisibilityRules(nextSchema);
  const changedQuestionIds = new Set([...previous.keys(), ...next.keys()]);
  return [...changedQuestionIds]
    .filter((questionId) => JSON.stringify(previous.get(questionId) ?? null) !== JSON.stringify(next.get(questionId) ?? null))
    .map((questionId) => ({
      questionId,
      previous: previous.get(questionId) ?? null,
      next: next.get(questionId) ?? null,
    }));
}

async function getFormVersion(versionId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("form_template_versions").select(versionSelect).eq("id", versionId).single();
  if (error) throw new Error(error.message);
  return data;
}

function assertVersionBelongsToTemplate(version: { template_id: string }, templateId: string) {
  if (version.template_id !== templateId) throw new Error("Form version does not belong to this template");
}

async function moveFormVersion(
  actor: AuthUser,
  templateId: string,
  versionId: string,
  action: string,
  auditAction: string,
  patch: Record<string, unknown>,
) {
  const current = await getFormVersion(versionId);
  assertVersionBelongsToTemplate(current, templateId);
  const state = transitionFormVersionState(current.version_status, action);
  const { reason, ...dbPatch } = patch;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("form_template_versions")
    .update({
      version_status: state.status,
      version_owner_role: state.owner,
      version_next_action: state.nextAction,
      ...dbPatch,
    })
    .eq("id", versionId)
    .select(versionSelect)
    .single();
  if (error) throw new Error(error.message);
  await auditFormVersion(actor, data, auditAction, current.version_status, state, {
    reason: typeof reason === "string" ? reason : undefined,
  });
  return data;
}

async function auditFormVersion(
  actor: AuthUser,
  version: { id: string; template_id: string; version_number: number; parent_version_id?: string | null },
  action: string,
  fromStatus: string | null,
  state: { status: string; owner: string; nextAction: string | null },
  metadata: Record<string, unknown> = {},
) {
  await writeAuditEvent({
    actorUserId: actor.id,
    action,
    entityType: "form_template_version",
    entityId: version.id,
    fromStatus,
    toStatus: state.status,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    metadata: {
      templateId: version.template_id,
      versionNumber: version.version_number,
      parentVersionId: version.parent_version_id ?? null,
      owner: state.owner,
      nextAction: state.nextAction,
      ...metadata,
    },
  });
}

function defaultVersionVisibility() {
  return {
    visibleToEmployees: false,
    visibleToManagers: false,
    visibleToHrbp: true,
    visibleToHrAdmin: true,
  };
}
