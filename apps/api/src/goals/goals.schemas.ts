import { z } from "zod";

const keyResultSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(2).max(220),
  currentValue: z.number().default(0),
  targetValue: z.number().default(100),
  unit: z.string().min(1).max(40).default("%"),
  weight: z.number().min(0).max(100).default(1),
});

export const listGoalsQuerySchema = z.object({
  ownerUserId: z.string().uuid().optional(),
  parentGoalId: z.string().uuid().optional(),
  status: z.enum(["draft", "submitted", "approved", "returned", "active", "visibility_changed", "completed", "archived"]).optional(),
  cycle: z.string().min(1).max(80).optional(),
});

export const createGoalSchema = z.object({
  parentGoalId: z.string().uuid().optional().nullable(),
  ownerUserId: z.string().uuid(),
  title: z.string().min(2).max(220),
  description: z.string().max(1200).optional().nullable(),
  cycle: z.string().min(1).max(80),
  goalType: z.enum(["company", "department", "team", "individual"]).default("individual"),
  keyResults: z.array(keyResultSchema).min(1),
  visibility: z.object({
    employeeCanView: z.boolean().default(true),
    managerCanView: z.boolean().default(true),
    hrbpCanView: z.boolean().default(true),
    hrAdminCanView: z.boolean().default(true),
  }).default({}),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  keyResults: z.array(keyResultSchema).min(1).optional(),
});

export const goalReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const goalVisibilitySchema = z.object({
  visibility: z.object({
    employeeCanView: z.boolean().default(true),
    managerCanView: z.boolean().default(true),
    hrbpCanView: z.boolean().default(true),
    hrAdminCanView: z.boolean().default(true),
  }),
});
