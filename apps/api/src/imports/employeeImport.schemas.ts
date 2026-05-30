import { z } from "zod";
import { jalaliToIsoDate } from "@bimebazar/calendar-utils";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const jalaliDateSchema = z.string().regex(/^1[34]\d{2}-\d{2}-\d{2}$/).transform((value) => jalaliToIsoDate(value));
const calendarDateSchema = z.union([isoDateSchema, jalaliDateSchema]);

export const importEmployeeRowSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  employeeId: z.string().min(2).max(40),
  fullNamePersian: z.string().min(2).max(160),
  fullNameEnglish: z.string().min(2).max(160),
  joinDate: calendarDateSchema,
  businessUnitName: z.string().min(1).max(160),
  departmentName: z.string().min(1).max(160),
  teamName: z.string().min(1).max(160),
  level: z.string().min(1).max(20),
  positionTitle: z.string().min(2).max(160),
  managerEmail: z.string().email().optional().or(z.literal("")).transform((value) => value || null),
  phone: z.string().max(40).optional().or(z.literal("")).transform((value) => value || null),
});

export const previewEmployeeImportSchema = z.object({
  sourceFilename: z.string().min(1).max(240).default("employee-import.csv"),
  rows: z.array(z.record(z.unknown())).min(1).max(500),
});

export const processEmployeeImportSchema = previewEmployeeImportSchema.extend({
  dryRun: z.boolean().default(false),
});
