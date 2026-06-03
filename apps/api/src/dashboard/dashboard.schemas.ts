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

const teamHealthMetricsSchema = z.object({
  evaluationCompletionRate: z.number().min(0).max(1).default(0),
  averagePerformanceScore: z.number().min(0).max(5).default(0),
  feedbackParticipationRate: z.number().min(0).max(1).default(0),
  pipRiskRate: z.number().min(0).max(1).default(0),
  overdueTaskRate: z.number().min(0).max(1).default(0),
});

const teamHealthVisibilitySettingsSchema = z.object({
  managerCanView: z.boolean().default(true),
  hrbpCanView: z.boolean().default(true),
  hrAdminCanView: z.boolean().default(true),
  employeeCanView: z.boolean().default(false),
});

export const listTeamHealthQuerySchema = z.object({
  teamId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  status: z.enum(["draft", "submitted", "approved", "active", "returned", "visibility_changed", "archived"]).optional(),
  cycle: z.string().max(80).optional(),
});

export const createTeamHealthSchema = z.object({
  teamId: z.string().uuid(),
  managerId: z.string().uuid().optional(),
  cycle: z.string().min(2).max(80),
  name: z.string().min(2).max(180),
  metrics: teamHealthMetricsSchema,
  visibility: teamHealthVisibilitySettingsSchema.default({ managerCanView: true, hrbpCanView: true, hrAdminCanView: true, employeeCanView: false }),
});

export const updateTeamHealthSchema = z.object({
  name: z.string().min(2).max(180).optional(),
  metrics: teamHealthMetricsSchema.optional(),
});

export const teamHealthDecisionSchema = z.object({
  reason: z.string().min(8).max(500).optional(),
});

export const teamHealthVisibilitySchema = z.object({
  visibility: teamHealthVisibilitySettingsSchema,
  reason: z.string().min(8).max(500),
});
