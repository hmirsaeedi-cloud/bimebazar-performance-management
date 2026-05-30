import {
  formBuilderActions,
  formBuilderStatuses,
  getFormBuilderState,
  transitionFormBuilderState,
} from "@bimebazar/form-builder-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";
import type { AuthUser } from "../auth/auth.types.js";

const templateSelect = `
  id,name,description,module,status,owner_role,current_version_id,
  created_by,updated_by,created_at,updated_at,
  form_template_versions(id,version_number,status,schema,created_at,published_at)
`;

interface FormTemplateInput {
  actor: AuthUser;
  name: string;
  description?: string;
  module: string;
  schema: unknown;
}

export async function listFormTemplates(input: { status?: string; module?: string; search?: string }) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("form_templates").select(templateSelect).order("updated_at", { ascending: false });

  if (input.status) query = query.eq("status", input.status);
  if (input.module) query = query.eq("module", input.module);
  if (input.search) query = query.ilike("name", `%${input.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
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
    },
  });

  return getFormTemplate(template.id);
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
    },
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

  return getFormTemplate(input.id);
}

function countQuestions(schema: unknown) {
  if (!schema || typeof schema !== "object" || !("sections" in schema)) return 0;
  const sections = (schema as { sections?: Array<{ questions?: unknown[] }> }).sections;
  return sections?.reduce((sum, section) => sum + (section.questions?.length ?? 0), 0) ?? 0;
}
