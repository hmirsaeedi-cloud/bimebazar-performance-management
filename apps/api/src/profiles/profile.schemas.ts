import { z } from "zod";
import { jalaliToIsoDate } from "@bimebazar/calendar-utils";

const optionalUuid = z.string().uuid().nullable().optional();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const jalaliDateSchema = z
  .string()
  .regex(/^1[34]\d{2}-\d{2}-\d{2}$/)
  .transform((value, context) => {
    try {
      return jalaliToIsoDate(value);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : "Invalid Jalali date",
      });
      return z.NEVER;
    }
  });
const calendarDateSchema = z.union([isoDateSchema, jalaliDateSchema]);

export const createEmployeeProfileSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  employeeId: z.string().min(2).max(40),
  fullNamePersian: z.string().min(2).max(160),
  fullNameEnglish: z.string().min(2).max(160),
  joinDate: calendarDateSchema,
  managerId: optionalUuid,
  businessUnitId: z.string().uuid(),
  departmentId: z.string().uuid(),
  teamId: z.string().uuid(),
  level: z.string().min(1).max(20),
  positionTitle: z.string().min(2).max(160),
  phone: z.string().max(40).optional().nullable(),
  functionLeadId: optionalUuid,
  hrbpId: optionalUuid,
});

export const updateEmployeeProfileSchema = createEmployeeProfileSchema
  .partial()
  .extend({
    exitDate: calendarDateSchema.nullable().optional(),
    accountStatus: z.enum(["invited", "active", "locked", "deactivated"]).optional(),
  });

export const listProfilesQuerySchema = z.object({
  search: z.string().max(120).optional(),
  businessUnitId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  status: z.enum(["invited", "active", "locked", "deactivated"]).optional(),
  level: z.string().max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const employeeExportReportSchema = listProfilesQuerySchema
  .omit({ page: true, pageSize: true })
  .extend({
    columns: z
      .array(
        z.enum([
          "employee_id",
          "email",
          "full_name_english",
          "full_name_persian",
          "role_code",
          "account_status",
          "join_date",
          "level",
          "position_title",
          "phone",
          "preferred_calendar",
          "preferred_language",
        ]),
      )
      .min(1)
      .max(20)
      .default([
        "employee_id",
        "email",
        "full_name_english",
        "full_name_persian",
        "role_code",
        "account_status",
        "join_date",
        "level",
        "position_title",
      ]),
  });

export const deactivateProfileSchema = z.object({
  reason: z.string().min(8).max(500),
  exitDate: calendarDateSchema.optional(),
});

const orgChartVisibilitySchema = z.object({
  employeeCanView: z.boolean().default(true),
  managerCanView: z.boolean().default(true),
  hrbpCanView: z.boolean().default(true),
  hrAdminCanView: z.boolean().default(true),
});

export const listProfileOrgChartsQuerySchema = z.object({
  rootProfileId: z.string().uuid().optional(),
  status: z.enum(["draft", "submitted", "approved", "active", "returned", "visibility_changed", "archived"]).optional(),
});

export const createProfileOrgChartSchema = z.object({
  rootProfileId: z.string().uuid(),
  name: z.string().min(2).max(180),
  description: z.string().max(800).optional(),
  maxDepth: z.number().int().min(1).max(6).default(3),
  layout: z.enum(["tree", "radial", "compact"]).default("tree"),
  visibility: orgChartVisibilitySchema.default({ employeeCanView: true, managerCanView: true, hrbpCanView: true, hrAdminCanView: true }),
});

export const updateProfileOrgChartSchema = z.object({
  name: z.string().min(2).max(180).optional(),
  description: z.string().max(800).nullable().optional(),
  maxDepth: z.number().int().min(1).max(6).optional(),
  layout: z.enum(["tree", "radial", "compact"]).optional(),
});

export const profileOrgChartDecisionSchema = z.object({
  reason: z.string().min(8).max(500).optional(),
});

export const profileOrgChartVisibilitySchema = z.object({
  visibility: orgChartVisibilitySchema,
  reason: z.string().min(8).max(500),
});
