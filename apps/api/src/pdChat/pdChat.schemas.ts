import { z } from "zod";

export const createPdChatSchema = z.object({
  processId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid(),
  managerId: z.string().uuid().optional().nullable(),
  evaluationId: z.string().uuid().optional().nullable(),
  topic: z.string().min(3).max(180),
  message: z.string().min(1).max(4000),
});

export const pdChatAttachmentSchema = z.object({
  processId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid(),
  managerId: z.string().uuid().optional().nullable(),
  evaluationType: z.enum(["end_cycle_evaluation", "mid_cycle_evaluation", "downward_evaluation"]),
  evaluationId: z.string().uuid(),
});

export const pdChatMessageSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const pdChatReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const pdChatVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanView: z.boolean().default(true),
    managerCanView: z.boolean().default(true),
    hrbpCanView: z.boolean().default(false),
  }),
});

export const listPdChatsQuerySchema = z.object({
  processId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  evaluationId: z.string().uuid().optional(),
  status: z.enum(["draft", "active", "submitted", "manager_reviewed", "returned", "visibility_approved", "archived"]).optional(),
});
