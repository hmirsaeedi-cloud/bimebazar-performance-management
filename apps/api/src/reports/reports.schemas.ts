import { z } from "zod";

export const listReportsQuerySchema = z.object({
  status: z.enum(["draft", "generated", "submitted", "reviewed", "returned", "visibility_approved", "exported", "archived"]).optional(),
  reportKey: z.string().min(2).max(80).optional(),
});

export const createReportSchema = z.object({
  title: z.string().min(3).max(180),
  periodStart: z.string().date().optional().nullable(),
  periodEnd: z.string().date().optional().nullable(),
  businessUnitId: z.string().uuid().optional().nullable(),
  filters: z.record(z.unknown()).default({}),
});

export const generateReportSchema = z.object({
  filters: z.record(z.unknown()).default({}),
});

export const reportReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const reportVisibilitySchema = z.object({
  insights: z.array(z.string().min(1).max(300)).default([]),
});

export const reportExportSchema = z.object({
  exportFormat: z.enum(["csv", "xlsx", "pdf", "json"]).default("csv"),
});
