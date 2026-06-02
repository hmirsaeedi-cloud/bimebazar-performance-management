import { z } from "zod";

export const listPromotionCasesQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  hrbpId: z.string().uuid().optional(),
  status: z.enum(["draft", "submitted", "manager_approved", "hrbp_approved", "approved", "returned", "cancelled"]).optional(),
});

export const createPromotionCaseSchema = z.object({
  employeeId: z.string().uuid(),
  managerId: z.string().uuid().optional().nullable(),
  hrbpId: z.string().uuid().optional().nullable(),
  sourceEvaluationId: z.string().uuid().optional().nullable(),
  currentLevel: z.string().min(1).max(40).optional().nullable(),
  proposedLevel: z.string().min(1).max(40),
  currentTitle: z.string().min(1).max(120).optional().nullable(),
  proposedTitle: z.string().min(1).max(120).optional().nullable(),
  effectiveDate: z.string().date().optional().nullable(),
  rationale: z.string().min(10).max(4000),
  evidence: z.record(z.unknown()).default({}),
});

export const updatePromotionCaseSchema = createPromotionCaseSchema.omit({ employeeId: true }).partial();

export const promotionReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const promotionVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanView: z.boolean().default(false),
    managerCanView: z.boolean().default(true),
    hrbpCanView: z.boolean().default(true),
    hrAdminCanView: z.boolean().default(true),
  }),
});
