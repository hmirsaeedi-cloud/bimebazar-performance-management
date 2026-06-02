import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import { createAuditExportSchema, listAuditEventsQuerySchema, listAuditExportsQuerySchema } from "./compliance.schemas.js";
import {
  createAuditExport,
  listAuditEvents,
  listAuditExports,
  verifyAuditExport,
  verifyAuditLogIntegrity,
} from "./compliance.service.js";

export const complianceRouter = Router();

complianceRouter.get("/audit-events", requirePermission("compliance.audit.read"), async (req, res, next) => {
  try {
    const query = listAuditEventsQuerySchema.parse(req.query);
    res.json({ events: await listAuditEvents(query) });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get("/audit-events/verify", requirePermission("compliance.audit.verify"), async (req, res, next) => {
  try {
    res.json({ integrity: await verifyAuditLogIntegrity(req.user!) });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get("/audit-exports", requirePermission("compliance.audit.export"), async (req, res, next) => {
  try {
    const query = listAuditExportsQuerySchema.parse(req.query);
    res.json({ exports: await listAuditExports(query) });
  } catch (error) {
    next(error);
  }
});

complianceRouter.post("/audit-exports", requirePermission("compliance.audit.export"), async (req, res, next) => {
  try {
    const input = createAuditExportSchema.parse(req.body);
    res.status(201).json({ exportRequest: await createAuditExport({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

complianceRouter.post("/audit-exports/:id/verify", requirePermission("compliance.audit.verify"), async (req, res, next) => {
  try {
    res.json({ exportRequest: await verifyAuditExport({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});
