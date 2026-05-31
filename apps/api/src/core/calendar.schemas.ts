import { z } from "zod";

export const calendarPreferenceSchema = z.object({
  preferredCalendar: z.enum(["jalali", "gregorian"]),
  preferredLocale: z.enum(["fa-IR", "en-US"]),
  dateDisplayTimezone: z.enum(["Asia/Tehran", "UTC"]).default("Asia/Tehran"),
  reason: z.string().min(8).max(500).optional(),
});

export const calendarOverrideSchema = calendarPreferenceSchema.extend({
  reason: z.string().min(8).max(500),
});
