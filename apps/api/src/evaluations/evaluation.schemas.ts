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
