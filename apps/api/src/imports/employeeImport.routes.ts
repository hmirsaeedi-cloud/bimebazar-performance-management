import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import { previewEmployeeImportSchema, processEmployeeImportSchema } from "./employeeImport.schemas.js";
import { listEmployeeImportRuns, previewEmployeeImport, processEmployeeImport } from "./employeeImport.service.js";

export const employeeImportRouter = Router();

employeeImportRouter.get("/employee-imports", requirePermission("profiles.import_read"), async (_req, res, next) => {
  try {
    res.json({ runs: await listEmployeeImportRuns() });
  } catch (error) {
    next(error);
  }
});

employeeImportRouter.post("/employee-imports/preview", requirePermission("profiles.bulk_import"), async (req, res, next) => {
  try {
    const input = previewEmployeeImportSchema.parse(req.body);
    res.json(await previewEmployeeImport({ actor: req.user!, ...input }));
  } catch (error) {
    next(error);
  }
});

employeeImportRouter.post("/employee-imports/process", requirePermission("profiles.bulk_import"), async (req, res, next) => {
  try {
    const input = processEmployeeImportSchema.parse(req.body);
    res.status(201).json({ run: await processEmployeeImport({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});
