import { z } from "zod";

export const supportedQuestionTypes = [
  "short_text",
  "long_text",
  "rich_text",
  "number",
  "scale",
  "single_select",
  "multi_select",
  "date",
  "boolean",
  "file",
  "employee_reference",
  "section_heading",
] as const;

export const questionTypeSchema = z.enum(supportedQuestionTypes);

const optionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  value: z.string().min(1).max(160),
});

const visibilityRuleSchema = z.object({
  sourceQuestionId: z.string().min(1).max(80),
  operator: z.enum(["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
});

const questionSchema = z
  .object({
    id: z.string().min(1).max(80),
    type: questionTypeSchema,
    label: z.string().min(1).max(240),
    helpText: z.string().max(500).optional(),
    required: z.boolean().default(false),
    options: z.array(optionSchema).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    weight: z.number().min(0).max(100).optional(),
    allowedMimeTypes: z.array(z.string().min(1).max(120)).max(20).optional(),
    maxFileSizeMb: z.number().positive().max(100).optional(),
    visibility: z.array(visibilityRuleSchema).max(12).optional(),
  })
  .superRefine((question, context) => {
    if (["single_select", "multi_select"].includes(question.type) && (!question.options || question.options.length < 2)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select questions need at least two options",
        path: ["options"],
      });
    }
    if (question.options) {
      const optionIds = new Set<string>();
      const optionValues = new Set<string>();
      for (const option of question.options) {
        if (optionIds.has(option.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate option id: ${option.id}`,
            path: ["options"],
          });
        }
        if (optionValues.has(option.value)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate option value: ${option.value}`,
            path: ["options"],
          });
        }
        optionIds.add(option.id);
        optionValues.add(option.value);
      }
    }
    if (question.type === "scale" && (typeof question.min !== "number" || typeof question.max !== "number")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scale questions need min and max values",
      });
    }
    if (question.type === "scale" && typeof question.min === "number" && typeof question.max === "number" && question.max <= question.min) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scale max must be greater than min",
      });
    }
    if (question.type === "number" && typeof question.min === "number" && typeof question.max === "number" && question.max < question.min) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Number max must be greater than or equal to min",
      });
    }
    if (question.type === "file" && (!question.allowedMimeTypes || question.allowedMimeTypes.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File questions need at least one allowed MIME type",
        path: ["allowedMimeTypes"],
      });
    }
    if (question.type !== "file" && (question.allowedMimeTypes || question.maxFileSizeMb)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only file questions can define file constraints",
      });
    }
    if (question.type === "section_heading" && question.required) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Section headings cannot be required",
        path: ["required"],
      });
    }
  });

export const formSchemaDefinition = z.object({
  title: z.string().min(2).max(180),
  description: z.string().max(800).optional(),
  sections: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        title: z.string().min(1).max(160),
        questions: z.array(questionSchema).min(1),
      }),
    )
    .min(1),
}).superRefine((schema, context) => {
  const sectionIds = new Set<string>();
  const questionIds = new Set<string>();
  for (const [sectionIndex, section] of schema.sections.entries()) {
    if (sectionIds.has(section.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate section id: ${section.id}`,
        path: ["sections", sectionIndex, "id"],
      });
    }
    sectionIds.add(section.id);
    for (const [questionIndex, question] of section.questions.entries()) {
      if (questionIds.has(question.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate question id: ${question.id}`,
          path: ["sections", sectionIndex, "questions", questionIndex, "id"],
        });
      }
      questionIds.add(question.id);
    }
  }

  for (const [sectionIndex, section] of schema.sections.entries()) {
    for (const [questionIndex, question] of section.questions.entries()) {
      for (const [ruleIndex, rule] of (question.visibility ?? []).entries()) {
        if (!questionIds.has(rule.sourceQuestionId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Visibility rule references unknown question: ${rule.sourceQuestionId}`,
            path: ["sections", sectionIndex, "questions", questionIndex, "visibility", ruleIndex, "sourceQuestionId"],
          });
        }
        if (rule.sourceQuestionId === question.id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A question cannot depend on its own visibility",
            path: ["sections", sectionIndex, "questions", questionIndex, "visibility", ruleIndex, "sourceQuestionId"],
          });
        }
      }
    }
  }
});

export const createFormTemplateSchema = z.object({
  name: z.string().min(2).max(180),
  description: z.string().max(800).optional(),
  module: z.enum(["self_assessment", "manager_evaluation", "upward_feedback", "survey", "evaluation"]).default("evaluation"),
  schema: formSchemaDefinition,
});

export const updateFormTemplateSchema = createFormTemplateSchema.partial().extend({
  schema: formSchemaDefinition.optional(),
});

export const listFormTemplatesQuerySchema = z.object({
  status: z.enum(["draft", "published", "archived"]).optional(),
  module: z.string().max(80).optional(),
  search: z.string().max(120).optional(),
  templateCategory: z.enum(["system_default", "custom"]).optional(),
});

export const archiveFormTemplateSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const returnFormTemplateSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const clonePresetSchema = z.object({
  name: z.string().min(2).max(180).optional(),
  description: z.string().max(800).optional(),
});

export const createFormVersionEditSchema = z.object({
  schema: formSchemaDefinition.optional(),
  changeSummary: z.record(z.unknown()).default({}),
});

export const updateFormVersionEditSchema = z.object({
  schema: formSchemaDefinition.optional(),
  changeSummary: z.record(z.unknown()).optional(),
});

export const formVersionDecisionSchema = z.object({
  reason: z.string().min(8).max(500).optional(),
});

export const formVersionVisibilitySchema = z.object({
  visibilityPolicy: z.object({
    visibleToEmployees: z.boolean().default(false),
    visibleToManagers: z.boolean().default(false),
    visibleToHrbp: z.boolean().default(true),
    visibleToHrAdmin: z.boolean().default(true),
  }),
});
