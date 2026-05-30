import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});

export const createUserSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  displayName: z.string().min(2).max(120),
  employeeId: z.string().min(2).max(40).optional(),
  role: z.enum(["EMPLOYEE", "MANAGER", "NEXT_LEVEL_MANAGER", "HRBP", "HR_ADMIN"]),
});

export const deactivateUserSchema = z.object({
  reason: z.string().min(8).max(500),
});
