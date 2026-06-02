import { z } from "zod";

export const listAuditEventsQuerySchema = z.object({
  actorUserId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  action: z.string().min(1).max(120).optional(),
  entityType: z.string().min(1).max(120).optional(),
  entityId: z.string().min(1).max(160).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const createAuditExportSchema = z.object({
  format: z.enum(["csv", "json"]).default("csv"),
  filters: listAuditEventsQuerySchema.omit({ limit: true }).default({}),
});

export const listAuditExportsQuerySchema = z.object({
  status: z.enum(["requested", "generated", "verified", "expired"]).optional(),
});
