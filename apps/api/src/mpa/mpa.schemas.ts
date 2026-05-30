import { z } from "zod";
import { jalaliToIsoDate } from "@bimebazar/calendar-utils";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const jalaliDateSchema = z.string().regex(/^1[34]\d{2}-\d{2}-\d{2}$/).transform((value) => jalaliToIsoDate(value));
const calendarDateSchema = z.union([isoDateSchema, jalaliDateSchema]);

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
  content: z.object({
    goals: z.array(z.object({
      title: z.string().min(2).max(180),
      measure: z.string().min(2).max(500),
      weight: z.number().min(0).max(100).optional(),
    })).min(1),
    developmentActions: z.array(z.string().min(2).max(500)).default([]),
    notes: z.string().max(2000).optional(),
  }),
});

export const updateMpaSchema = createMpaSchema.pick({
  title: true,
  content: true,
}).partial();

export const listMpasQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  cycleId: z.string().uuid().optional(),
  status: z.enum(["draft", "submitted", "returned", "employee_approved", "manager_approved", "active", "archived"]).optional(),
});

export const mpaDecisionSchema = z.object({
  reason: z.string().min(8).max(500).optional(),
});
