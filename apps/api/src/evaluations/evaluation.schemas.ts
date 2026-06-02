import { z } from "zod";

export const createEndCycleEvaluationSchema = z.object({
  processId: z.string().uuid().optional().nullable(),
  participantId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid(),
  managerId: z.string().uuid().optional().nullable(),
  hrbpId: z.string().uuid().optional().nullable(),
  nextLevelManagerId: z.string().uuid().optional().nullable(),
  headReviewerId: z.string().uuid().optional().nullable(),
  formTemplateVersionId: z.string().uuid(),
});

const scaleAnswerSchema = z.object({
  value: z.number(),
  selected: z.boolean(),
});

export const evaluationAnswersSchema = z.object({
  answers: z.record(z.union([z.string(), z.number(), z.boolean(), scaleAnswerSchema, z.array(z.string()), z.null()])),
});

export const scoreCalculationSchema = evaluationAnswersSchema.extend({
  reveal: z.boolean().default(false),
});

export const evaluationReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const evaluationVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanViewScore: z.boolean().default(false),
    employeeCanViewManagerNotes: z.boolean().default(false),
  }),
});

export const listEvaluationsQuerySchema = z.object({
  processId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  status: z.enum(["draft", "in_progress", "submitted", "nl_approved", "head_approved", "hrbp_approved", "returned", "approved", "visibility_approved", "completed"]).optional(),
});

export const listPerformanceBandFlagsQuerySchema = z.object({
  evaluationId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  flagType: z.enum(["pip", "promotion", "none"]).optional(),
  status: z.enum(["detected", "under_review", "approved", "returned", "converted", "dismissed"]).optional(),
});

export const generatePerformanceBandFlagSchema = z.object({
  evaluationId: z.string().uuid(),
  thresholds: z.object({
    pipMax: z.number().min(0).max(100).default(59.99),
    promotionMin: z.number().min(0).max(100).default(90),
  }).default({}),
});

export const updatePerformanceBandFlagSchema = z.object({
  rationale: z.string().min(8).max(1000).optional(),
  thresholds: z.object({
    pipMax: z.number().min(0).max(100).optional(),
    promotionMin: z.number().min(0).max(100).optional(),
  }).optional(),
});

export const performanceBandFlagReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const performanceBandFlagDismissSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const performanceBandFlagConvertSchema = z.object({
  targetType: z.enum(["pip", "promotion"]),
  targetId: z.string().uuid().optional().nullable(),
});

export const performanceBandFlagVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanView: z.boolean().default(false),
    managerCanView: z.boolean().default(true),
    hrbpCanView: z.boolean().default(true),
    hrAdminCanView: z.boolean().default(true),
  }),
});

export const listEvaluationComparisonsQuerySchema = z.object({
  processId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  status: z.enum(["draft", "in_review", "submitted", "approved", "returned", "visibility_approved", "completed"]).optional(),
});

export const createEvaluationComparisonSchema = z.object({
  selfAssessmentId: z.string().uuid(),
  managerEvaluationId: z.string().uuid(),
  revealScores: z.boolean().default(false),
});

export const updateEvaluationComparisonSchema = z.object({
  notes: z.string().max(1200).optional(),
  revealScores: z.boolean().default(false),
});

export const evaluationComparisonReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const evaluationComparisonVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanView: z.boolean().default(false),
    managerCanView: z.boolean().default(true),
    hrbpCanView: z.boolean().default(true),
  }),
});
