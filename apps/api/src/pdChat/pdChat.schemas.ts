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

export const createPdChatScheduleSchema = z.object({
  employeeId: z.string().uuid(),
  managerId: z.string().uuid().optional().nullable(),
  topic: z.string().min(3).max(180),
  cadence: z.enum(["weekly", "biweekly", "monthly", "quarterly"]),
  startAt: z.string().datetime(),
  timezone: z.string().min(3).max(64).default("Asia/Tehran"),
  durationMinutes: z.number().int().min(15).max(180).default(45),
  visibility: z.object({
    employeeCanView: z.boolean().default(true),
    managerCanView: z.boolean().default(true),
    hrbpCanView: z.boolean().default(false),
  }).optional(),
});

export const updatePdChatScheduleSchema = createPdChatScheduleSchema.partial();

export const listPdChatSchedulesQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  status: z.enum(["draft", "submitted", "approved", "active", "paused", "returned", "visibility_changed", "archived"]).optional(),
  cadence: z.enum(["weekly", "biweekly", "monthly", "quarterly"]).optional(),
});

export const pdChatScheduleReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const pdChatScheduleVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanView: z.boolean().default(true),
    managerCanView: z.boolean().default(true),
    hrbpCanView: z.boolean().default(false),
  }),
  reason: z.string().min(8).max(500),
});
