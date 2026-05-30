import { z } from "zod";

export const questionTypeSchema = z.enum([
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
]);

const optionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  value: z.string().min(1).max(160),
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
  })
  .superRefine((question, context) => {
    if (["single_select", "multi_select"].includes(question.type) && (!question.options || question.options.length < 2)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select questions need at least two options",
        path: ["options"],
      });
    }
    if (question.type === "scale" && (typeof question.min !== "number" || typeof question.max !== "number")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scale questions need min and max values",
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
});

export const archiveFormTemplateSchema = z.object({
  reason: z.string().min(8).max(500),
});
