import { z } from "zod";

export const processTypeSchema = z.enum([
  "self_assessment",
  "downward_evaluation",
  "upward_feedback",
  "survey",
  "end_cycle",
  "mid_cycle",
]);

const eligibilityFilterSchema = z.object({
  businessUnitIds: z.array(z.string().uuid()).default([]),
  departmentIds: z.array(z.string().uuid()).default([]),
  teamIds: z.array(z.string().uuid()).default([]),
  levels: z.array(z.string().min(1).max(20)).default([]),
  includeEmployees: z.array(z.string().uuid()).default([]),
  excludeEmployees: z.array(z.string().uuid()).default([]),
});

export const processConfigSchema = z.object({
  formTemplateId: z.string().uuid().optional().nullable(),
  formTemplateVersionId: z.string().uuid().optional().nullable(),
  eligibilityFilter: eligibilityFilterSchema.default({}),
  steps: z.array(z.object({
    id: z.string().min(1).max(80),
    ownerRole: z.enum(["EMPLOYEE", "MANAGER", "NEXT_LEVEL_MANAGER", "HRBP", "HR_ADMIN"]),
    action: z.string().min(1).max(120),
    dueInDays: z.number().int().min(0).max(365).optional(),
  })).min(1),
  visibility: z.object({
    employeeCanSeeManagerFeedbackBeforeSubmit: z.boolean().default(false),
    managerCanSeeScoresBeforeSubmit: z.boolean().default(false),
  }).default({}),
});

export const createProcessSchema = z.object({
  name: z.string().min(2).max(180),
  description: z.string().max(800).optional(),
  processType: processTypeSchema,
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  config: processConfigSchema,
});

export const updateProcessSchema = createProcessSchema.partial().extend({
  config: processConfigSchema.optional(),
});

export const listProcessesQuerySchema = z.object({
  processType: processTypeSchema.optional(),
  status: z.enum(["draft", "configured", "scheduled", "active", "paused", "completed", "cancelled"]).optional(),
});

export const processDecisionSchema = z.object({
  reason: z.string().min(8).max(500).optional(),
});
