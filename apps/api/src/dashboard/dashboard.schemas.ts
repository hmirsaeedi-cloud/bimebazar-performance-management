import { z } from "zod";

export const dashboardViewSchema = z.enum(["employee", "manager", "hrbp", "hr_admin"]);

export const dashboardSummaryQuerySchema = z.object({
  view: dashboardViewSchema.optional(),
  userId: z.string().uuid().optional(),
});

export const dashboardPreferenceSchema = z.object({
  view: dashboardViewSchema,
  layout: z.array(z.string().min(1).max(80)).min(1).max(20),
  filters: z.record(z.unknown()).default({}),
});

export const dashboardOverrideSchema = z.object({
  userId: z.string().uuid(),
  view: dashboardViewSchema,
  layout: z.array(z.string().min(1).max(80)).min(1).max(20),
  filters: z.record(z.unknown()).default({}),
});
