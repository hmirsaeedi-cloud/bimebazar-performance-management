import { z } from "zod";

export const roleCodeSchema = z.enum(["EMPLOYEE", "MANAGER", "NEXT_LEVEL_MANAGER", "HRBP", "HR_ADMIN"]);

export const assignRoleSchema = z.object({
  role: roleCodeSchema,
  assignmentType: z.enum(["manual", "computed"]).default("manual"),
  reason: z.string().min(4).max(500),
});

export const revokeRoleSchema = z.object({
  reason: z.string().min(8).max(500),
});
