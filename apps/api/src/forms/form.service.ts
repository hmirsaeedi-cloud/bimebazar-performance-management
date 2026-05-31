import {
  formBuilderActions,
  formBuilderStatuses,
  getFormBuilderState,
  transitionFormBuilderState,
} from "@bimebazar/form-builder-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyFormTemplateChanged } from "../notifications/notification.service.js";
import { formTemplatePresets, type FormPresetKey } from "./form.presets.js";

const templateSelect = `
  id,name,description,module,status,owner_role,current_version_id,
  template_key,template_category,is_system_template,source_template_id,
  created_by,updated_by,created_at,updated_at,
  form_template_versions(id,version_number,status,schema,created_at,published_at)
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
