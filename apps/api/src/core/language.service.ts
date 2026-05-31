import {
  getLanguagePreferenceState,
  languagePreferenceActions,
  languagePreferenceStatuses,
  transitionLanguagePreferenceState,
} from "@bimebazar/language-preferences-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyLanguagePreferenceChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const languageSelect = `
  id,email,display_name,preferred_language,text_direction,language_preference_status
`;

export async function getLanguagePreferences(actor: AuthUser) {
  return getLanguagePreferenceByUserId(actor.id);
}

export async function getLanguagePreferenceByUserId(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select(languageSelect).eq("id", userId).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateOwnLanguagePreferences(input: {
  actor: AuthUser;
  preferredLanguage: "fa" | "en";
  textDirection: "rtl" | "ltr";
  reason?: string;
}) {
  const current = await getLanguagePreferenceByUserId(input.actor.id);
  const currentStatus = current.language_preference_status ?? languagePreferenceStatuses.DEFAULTED;
  const nextState = transitionLanguagePreferenceState(currentStatus, languagePreferenceActions.USER_UPDATE);
  return updateLanguagePreferenceRow({
    actor: input.actor,
    targetUserId: input.actor.id,
    fromStatus: currentStatus,
    toState: nextState,
    action: "core.language_preferences.updated",
    reason: input.reason,
    preferredLanguage: input.preferredLanguage,
    textDirection: input.textDirection,
    previous: current,
  });
}

export async function overrideLanguagePreferences(input: {
  actor: AuthUser;
  targetUserId: string;
  preferredLanguage: "fa" | "en";
  textDirection: "rtl" | "ltr";
  reason: string;
}) {
  const current = await getLanguagePreferenceByUserId(input.targetUserId);
  const pending = transitionLanguagePreferenceState(
    current.language_preference_status ?? languagePreferenceStatuses.DEFAULTED,
    languagePreferenceActions.REQUEST_HR_OVERRIDE,
  );
  const nextState = transitionLanguagePreferenceState(pending.status, languagePreferenceActions.APPROVE_HR_OVERRIDE);
  return updateLanguagePreferenceRow({
    actor: input.actor,
    targetUserId: input.targetUserId,
    fromStatus: current.language_preference_status ?? languagePreferenceStatuses.DEFAULTED,
    toState: nextState,
    action: "core.language_preferences.overridden",
    reason: input.reason,
    preferredLanguage: input.preferredLanguage,
    textDirection: input.textDirection,
    previous: current,
  });
}

async function updateLanguagePreferenceRow(input: {
  actor: AuthUser;
  targetUserId: string;
  fromStatus: string;
  toState: { status: string; owner: string; nextAction: string | null };
  action: string;
  reason?: string;
  preferredLanguage: "fa" | "en";
  textDirection: "rtl" | "ltr";
  previous: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      preferred_language: input.preferredLanguage,
      text_direction: input.textDirection,
      language_preference_status: input.toState.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.targetUserId)
    .select(languageSelect)
    .single();
  if (error) throw new Error(error.message);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: input.targetUserId,
    action: input.action,
    entityType: "language_preferences",
    entityId: input.targetUserId,
    fromStatus: input.fromStatus,
    toStatus: input.toState.status,
    reason: input.reason,
    metadata: {
      owner: input.toState.owner,
      nextAction: input.toState.nextAction,
      previous: input.previous,
      next: data,
    },
  });
  await notifyLanguagePreferenceChanged({
    userId: input.targetUserId,
    preferredLanguage: input.preferredLanguage,
    textDirection: input.textDirection,
    status: input.toState.status,
  });

  return data;
}

export function getDefaultLanguagePreferenceState() {
  return getLanguagePreferenceState(languagePreferenceStatuses.DEFAULTED);
}
