import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createReportSchema,
  generateReportSchema,
  listReportsQuerySchema,
  reportExportSchema,
  reportReturnSchema,
  reportVisibilitySchema,
} from "./reports.schemas.js";
import {
  approveReport,
  archiveReport,
  createReport,
  exportReport,
  generateReport,
  getReport,
  listReports,
  returnReport,
  submitReport,
  updateReportVisibility,
} from "./reports.service.js";

export const reportsRouter = Router();

reportsRouter.get("/", requirePermission("reports.read"), async (req, res, next) => {
  try {
    const query = listReportsQuerySchema.parse(req.query);
    res.json({ reports: await listReports(query) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/", requirePermission("reports.create"), async (req, res, next) => {
  try {
    const input = createReportSchema.parse(req.body);
    res.status(201).json({ report: await createReport({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/:id", requirePermission("reports.read"), async (req, res, next) => {
  try {
    res.json({ report: await getReport(req.params.id) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:id/generate", requirePermission("reports.generate"), async (req, res, next) => {
  try {
    const input = generateReportSchema.parse(req.body);
    res.json({ report: await generateReport({ actor: req.user!, id: req.params.id, filters: input.filters }) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:id/submit", requirePermission("reports.submit"), async (req, res, next) => {
  try {
    res.json({ report: await submitReport({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:id/approve", requirePermission("reports.approve"), async (req, res, next) => {
  try {
    res.json({ report: await approveReport({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:id/return", requirePermission("reports.return"), async (req, res, next) => {
  try {
    const input = reportReturnSchema.parse(req.body);
    res.json({ report: await returnReport({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.patch("/:id/visibility", requirePermission("reports.override"), async (req, res, next) => {
  try {
    const input = reportVisibilitySchema.parse(req.body);
    res.json({ report: await updateReportVisibility({ actor: req.user!, id: req.params.id, insights: input.insights }) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:id/export", requirePermission("reports.export"), async (req, res, next) => {
  try {
    const input = reportExportSchema.parse(req.body);
    res.json({ report: await exportReport({ actor: req.user!, id: req.params.id, exportFormat: input.exportFormat }) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:id/archive", requirePermission("reports.archive"), async (req, res, next) => {
  try {
    res.json({ report: await archiveReport({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});
