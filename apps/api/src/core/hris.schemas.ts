import { z } from "zod";

const visibilitySchema = z.object({
  hrAdminCanView: z.boolean().default(true),
  hrbpCanView: z.boolean().default(true),
  managerCanView: z.boolean().default(false),
  employeeCanView: z.boolean().default(false),
});

const fieldMappingSchema = z.object({
  externalEmployeeId: z.string().min(1).max(120).default("employee_id"),
  email: z.string().min(1).max(120).default("email"),
  fullNameEnglish: z.string().min(1).max(120).default("full_name"),
  fullNamePersian: z.string().min(1).max(120).optional(),
  managerExternalId: z.string().min(1).max(120).default("manager_id"),
  department: z.string().min(1).max(120).optional(),
  title: z.string().min(1).max(120).default("title"),
  status: z.string().min(1).max(120).default("status"),
});

export const listHrisIntegrationsQuerySchema = z.object({
  status: z.enum(["draft", "submitted", "approved", "active", "sync_running", "sync_completed", "sync_failed", "returned", "visibility_changed", "archived"]).optional(),
  provider: z.string().max(80).optional(),
});

export const createHrisIntegrationSchema = z.object({
  provider: z.enum(["bamboohr", "workday", "sap_successfactors", "custom"]),
  name: z.string().min(2).max(180),
  baseUrl: z.string().url(),
  authType: z.enum(["api_key", "oauth2", "basic"]).default("api_key"),
  syncMode: z.enum(["manual", "scheduled"]).default("manual"),
  schedule: z.string().max(120).optional(),
  fieldMapping: fieldMappingSchema.default({}),
  visibility: visibilitySchema.default({ hrAdminCanView: true, hrbpCanView: true, managerCanView: false, employeeCanView: false }),
});

export const updateHrisIntegrationSchema = z.object({
  name: z.string().min(2).max(180).optional(),
  baseUrl: z.string().url().optional(),
  authType: z.enum(["api_key", "oauth2", "basic"]).optional(),
  syncMode: z.enum(["manual", "scheduled"]).optional(),
  schedule: z.string().max(120).nullable().optional(),
  fieldMapping: fieldMappingSchema.optional(),
});

export const hrisDecisionSchema = z.object({
  reason: z.string().min(8).max(500).optional(),
});

export const hrisVisibilitySchema = z.object({
  visibility: visibilitySchema,
  reason: z.string().min(8).max(500),
});

export const hrisSyncPreviewSchema = z.object({
  records: z.array(z.record(z.unknown())).max(200).default([]),
});

export const hrisSyncCompleteSchema = z.object({
  totalRecords: z.number().int().min(0),
  changedRecords: z.number().int().min(0),
  failedRecords: z.number().int().min(0).default(0),
  sample: z.array(z.record(z.unknown())).max(20).default([]),
});
