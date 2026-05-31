import {
  calendarPreferenceActions,
  calendarPreferenceStatuses,
  getCalendarPreferenceState,
  transitionCalendarPreferenceState,
} from "@bimebazar/calendar-preferences-workflow";
import { writeAuditEvent } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { notifyCalendarPreferenceChanged } from "../notifications/notification.service.js";
import { createSupabaseAdminClient } from "../supabase/client.js";

const calendarSelect = `
  id,email,display_name,preferred_calendar,preferred_locale,date_display_timezone,calendar_preference_status
`;

export async function getCalendarPreferences(actor: AuthUser) {
  return getCalendarPreferenceByUserId(actor.id);
}

export async function getCalendarPreferenceByUserId(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select(calendarSelect).eq("id", userId).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateOwnCalendarPreferences(input: {
  actor: AuthUser;
  preferredCalendar: "jalali" | "gregorian";
  preferredLocale: "fa-IR" | "en-US";
  dateDisplayTimezone: "Asia/Tehran" | "UTC";
  reason?: string;
}) {
  const current = await getCalendarPreferenceByUserId(input.actor.id);
  const currentStatus = current.calendar_preference_status ?? calendarPreferenceStatuses.DEFAULTED;
  const nextState = transitionCalendarPreferenceState(currentStatus, calendarPreferenceActions.USER_UPDATE);
  return updateCalendarPreferenceRow({
    actor: input.actor,
    targetUserId: input.actor.id,
    fromStatus: currentStatus,
    toState: nextState,
    action: "core.calendar_preferences.updated",
    reason: input.reason,
    preferredCalendar: input.preferredCalendar,
    preferredLocale: input.preferredLocale,
    dateDisplayTimezone: input.dateDisplayTimezone,
    previous: current,
  });
}

export async function overrideCalendarPreferences(input: {
  actor: AuthUser;
  targetUserId: string;
  preferredCalendar: "jalali" | "gregorian";
  preferredLocale: "fa-IR" | "en-US";
  dateDisplayTimezone: "Asia/Tehran" | "UTC";
  reason: string;
}) {
  const current = await getCalendarPreferenceByUserId(input.targetUserId);
  const pending = transitionCalendarPreferenceState(
    current.calendar_preference_status ?? calendarPreferenceStatuses.DEFAULTED,
    calendarPreferenceActions.REQUEST_HR_OVERRIDE,
  );
  const nextState = transitionCalendarPreferenceState(pending.status, calendarPreferenceActions.APPROVE_HR_OVERRIDE);
  return updateCalendarPreferenceRow({
    actor: input.actor,
    targetUserId: input.targetUserId,
    fromStatus: current.calendar_preference_status ?? calendarPreferenceStatuses.DEFAULTED,
    toState: nextState,
    action: "core.calendar_preferences.overridden",
    reason: input.reason,
    preferredCalendar: input.preferredCalendar,
    preferredLocale: input.preferredLocale,
    dateDisplayTimezone: input.dateDisplayTimezone,
    previous: current,
  });
}

async function updateCalendarPreferenceRow(input: {
  actor: AuthUser;
  targetUserId: string;
  fromStatus: string;
  toState: { status: string; owner: string; nextAction: string | null };
  action: string;
  reason?: string;
  preferredCalendar: "jalali" | "gregorian";
  preferredLocale: "fa-IR" | "en-US";
  dateDisplayTimezone: "Asia/Tehran" | "UTC";
  previous: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      preferred_calendar: input.preferredCalendar,
      preferred_locale: input.preferredLocale,
      date_display_timezone: input.dateDisplayTimezone,
      calendar_preference_status: input.toState.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.targetUserId)
    .select(calendarSelect)
    .single();
  if (error) throw new Error(error.message);

  await writeAuditEvent({
    actorUserId: input.actor.id,
    targetUserId: input.targetUserId,
    action: input.action,
    entityType: "calendar_preferences",
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
  await notifyCalendarPreferenceChanged({
    userId: input.targetUserId,
    preferredCalendar: input.preferredCalendar,
    preferredLocale: input.preferredLocale,
    status: input.toState.status,
  });

  return data;
}

export function getDefaultCalendarPreferenceState() {
  return getCalendarPreferenceState(calendarPreferenceStatuses.DEFAULTED);
}
