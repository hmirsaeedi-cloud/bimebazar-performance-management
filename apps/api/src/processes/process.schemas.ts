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

export const selfAssessmentResponseSchema = z.object({
  responses: z.record(z.unknown()).default({}),
});

export const selfAssessmentReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const selfAssessmentVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanViewManagerReview: z.boolean().default(false),
    managerCanViewEmployeeDraft: z.boolean().default(false),
  }),
});

export const downwardEvaluationResponseSchema = z.object({
  managerResponses: z.record(z.unknown()).default({}),
  reviewerResponses: z.record(z.unknown()).default({}),
});

export const downwardEvaluationReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const downwardEvaluationVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanViewEvaluation: z.boolean().default(false),
    managerCanViewReviewerNotes: z.boolean().default(false),
  }),
});

export const formInstancePayloadSchema = z.object({
  responsePayload: z.record(z.unknown()).default({}),
});

export const formInstanceReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const formInstanceVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanView: z.boolean().default(true),
    managerCanView: z.boolean().default(true),
    hrbpCanView: z.boolean().default(true),
  }),
});

export const formInstanceAdminMoveSchema = z.object({
  targetStatus: z.enum(["assigned", "in_progress", "submitted", "approved", "returned", "closed"]),
  reason: z.string().min(12).max(700),
});

export const listIndividualSurveysQuerySchema = z.object({
  status: z.enum(["draft", "configured", "active", "submitted", "approved", "returned", "completed", "cancelled"]).optional(),
});

export const createIndividualSurveySchema = z.object({
  title: z.string().min(2).max(180),
  description: z.string().max(800).optional(),
  formTemplateId: z.string().uuid().optional().nullable(),
  formTemplateVersionId: z.string().uuid(),
  targetEmployeeIds: z.array(z.string().uuid()).min(1),
  surveySettings: z.record(z.unknown()).default({}),
  visibility: z.object({
    employeeCanView: z.boolean().default(true),
    managerCanView: z.boolean().default(false),
    hrbpCanView: z.boolean().default(true),
    hrAdminCanView: z.boolean().default(true),
  }).default({}),
});

export const updateIndividualSurveySchema = createIndividualSurveySchema.partial().extend({
  targetEmployeeIds: z.array(z.string().uuid()).min(1).optional(),
});

export const individualSurveyResponseSchema = z.object({
  answers: z.record(z.unknown()).default({}),
});

export const individualSurveyReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const individualSurveyVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanView: z.boolean().default(true),
    managerCanView: z.boolean().default(false),
    hrbpCanView: z.boolean().default(true),
    hrAdminCanView: z.boolean().default(true),
  }),
});

export const listPulseSurveysQuerySchema = z.object({
  status: z.enum(["draft", "configured", "active", "anonymity_review", "approved", "returned", "released", "completed", "visibility_changed", "cancelled"]).optional(),
});

export const createPulseSurveySchema = z.object({
  title: z.string().min(2).max(180),
  description: z.string().max(800).optional(),
  formTemplateId: z.string().uuid().optional().nullable(),
  formTemplateVersionId: z.string().uuid(),
  targetEmployeeIds: z.array(z.string().uuid()).min(1),
  minResponses: z.number().int().min(3).max(100).default(3),
  pulseSettings: z.record(z.unknown()).default({}),
  visibility: z.object({
    employeeCanView: z.boolean().default(true),
    managerCanViewAggregates: z.boolean().default(false),
    hrbpCanViewAggregates: z.boolean().default(true),
    hrAdminCanViewAggregates: z.boolean().default(true),
  }).default({}),
});

export const updatePulseSurveySchema = createPulseSurveySchema.partial().extend({
  targetEmployeeIds: z.array(z.string().uuid()).min(1).optional(),
});

export const pulseSurveyResponseSchema = z.object({
  respondentCode: z.string().min(8).max(120),
  answers: z.record(z.unknown()).default({}),
});

export const pulseSurveyReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const pulseSurveyVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanView: z.boolean().default(true),
    managerCanViewAggregates: z.boolean().default(false),
    hrbpCanViewAggregates: z.boolean().default(true),
    hrAdminCanViewAggregates: z.boolean().default(true),
  }),
});
