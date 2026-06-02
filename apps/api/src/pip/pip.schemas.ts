import { z } from "zod";

export const listPipCasesQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  hrbpId: z.string().uuid().optional(),
  status: z.enum(["draft", "submitted", "hrbp_approved", "visibility_active", "active", "completed", "returned", "cancelled"]).optional(),
});

export const createPipCaseSchema = z.object({
  employeeId: z.string().uuid(),
  managerId: z.string().uuid().optional().nullable(),
  hrbpId: z.string().uuid().optional().nullable(),
  sourceEvaluationId: z.string().uuid().optional().nullable(),
  performanceConcern: z.string().min(10).max(4000),
  successCriteria: z.string().min(10).max(4000),
  supportPlan: z.string().min(10).max(4000),
  startDate: z.string().date().optional().nullable(),
  dueDate: z.string().date().optional().nullable(),
  checkpoints: z.array(z.record(z.unknown())).default([]),
});

export const updatePipCaseSchema = createPipCaseSchema.omit({ employeeId: true }).partial();

export const pipReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const pipVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanView: z.boolean().default(false),
    managerCanView: z.boolean().default(true),
    hrbpCanView: z.boolean().default(true),
    hrAdminCanView: z.boolean().default(true),
  }),
});
