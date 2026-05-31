import { z } from "zod";
import { jalaliToIsoDate } from "@bimebazar/calendar-utils";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const jalaliDateSchema = z.string().regex(/^1[34]\d{2}-\d{2}-\d{2}$/).transform((value) => jalaliToIsoDate(value));
const calendarDateSchema = z.union([isoDateSchema, jalaliDateSchema]);
const approvalVisibilitySchema = z.object({
  employeeCanViewManagerContent: z.boolean().default(false),
  employeeCanViewHrbpNotes: z.boolean().default(false),
});
const richTextSchema = z.object({
  format: z.literal("rich_text"),
  html: z.string().min(1).max(12000),
  plainText: z.string().min(1).max(8000),
  wordCount: z.number().int().min(0).max(2000).optional(),
});
const mpaContentSchema = z.object({
  goals: z.array(z.object({
    title: z.string().min(2).max(180),
    measure: z.string().min(2).max(500),
    weight: z.number().min(0).max(100).optional(),
  })).min(1),
  developmentActions: z.array(z.string().min(2).max(500)).default([]),
  notes: z.string().max(2000).optional(),
  richText: richTextSchema.optional(),
  sections: z.array(z.object({
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(180),
    html: z.string().max(6000),
    plainText: z.string().max(3000),
  })).default([]),
});

export const createMpaCycleSchema = z.object({
  name: z.string().min(2).max(180),
  startsOn: calendarDateSchema,
  endsOn: calendarDateSchema,
});

export const createMpaSchema = z.object({
  employeeId: z.string().uuid(),
  managerId: z.string().uuid().optional().nullable(),
  hrbpId: z.string().uuid().optional().nullable(),
  cycleId: z.string().uuid(),
  title: z.string().min(2).max(180),
  content: mpaContentSchema,
  approvalVisibility: approvalVisibilitySchema.optional(),
});

export const updateMpaSchema = createMpaSchema.pick({
  title: true,
  content: true,
  approvalVisibility: true,
}).partial();

export const listMpasQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  cycleId: z.string().uuid().optional(),
  status: z.enum(["draft", "submitted", "returned", "employee_approved", "manager_approved", "active", "archived"]).optional(),
});

export const mpaDecisionSchema = z.object({
  reason: z.string().min(8).max(500).optional(),
});

export const autoAttachMpaSchema = z.object({
  employeeId: z.string().uuid(),
  processId: z.string().uuid().optional().nullable(),
  cycleId: z.string().uuid().optional().nullable(),
  evaluationType: z.enum(["downward_evaluation", "self_assessment"]),
  evaluationId: z.string().uuid(),
});
