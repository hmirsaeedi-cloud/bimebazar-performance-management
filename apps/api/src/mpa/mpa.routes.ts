import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  autoAttachMpaSchema,
  createMpaCycleSchema,
  createMpaHistoryVersionSchema,
  createMpaSchema,
  listMpaHistoryQuerySchema,
  listMpasQuerySchema,
  mpaDecisionSchema,
  mpaHistoryDecisionSchema,
  mpaHistoryVisibilitySchema,
  updateMpaSchema,
} from "./mpa.schemas.js";
import {
  archiveMpaHistoryVersion,
  autoAttachMpaToEvaluation,
  captureMpaHistoryVersion,
  createMpa,
  createMpaCycle,
  getMpa,
  listMpaCycles,
  listMpaHistoryVersions,
  listMpas,
  moveMpa,
  restoreMpaHistoryVersion,
  reviewMpaHistoryVersion,
  returnMpaHistoryVersion,
  updateMpa,
  updateMpaHistoryVisibility,
} from "./mpa.service.js";

export const mpaRouter = Router();

mpaRouter.get("/cycles", requirePermission("mpa.read"), async (_req, res, next) => {
  try {
    res.json({ cycles: await listMpaCycles() });
  } catch (error) {
    next(error);
  }
});

mpaRouter.post("/cycles", requirePermission("mpa.create"), async (req, res, next) => {
  try {
    const input = createMpaCycleSchema.parse(req.body);
    res.status(201).json({ cycle: await createMpaCycle({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.get("/", requirePermission("mpa.read"), async (req, res, next) => {
  try {
    const query = listMpasQuerySchema.parse(req.query);
    res.json({ mpas: await listMpas({ actor: req.user!, ...query }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.post("/", requirePermission("mpa.create"), async (req, res, next) => {
  try {
    const input = createMpaSchema.parse(req.body);
    res.status(201).json({ mpa: await createMpa({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.post("/attachments/auto", requirePermission("mpa.attach"), async (req, res, next) => {
  try {
    const input = autoAttachMpaSchema.parse(req.body);
    res.status(201).json({ attachment: await autoAttachMpaToEvaluation({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.get("/:id", requirePermission("mpa.read"), async (req, res, next) => {
  try {
    res.json({ mpa: await getMpa(req.params.id) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.patch("/:id", requirePermission("mpa.update"), async (req, res, next) => {
  try {
    const patch = updateMpaSchema.parse(req.body);
    res.json({ mpa: await updateMpa({ actor: req.user!, id: req.params.id, patch }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.get("/:id/history", requirePermission("mpa.history_read"), async (req, res, next) => {
  try {
    const query = listMpaHistoryQuerySchema.parse(req.query);
    res.json({ versions: await listMpaHistoryVersions({ actor: req.user!, mpaId: req.params.id, ...query }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.post("/:id/history", requirePermission("mpa.history_write"), async (req, res, next) => {
  try {
    const input = createMpaHistoryVersionSchema.parse(req.body);
    res.status(201).json({ version: await captureMpaHistoryVersion({ actor: req.user!, mpaId: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.post("/:id/history/:versionId/review", requirePermission("mpa.history_write"), async (req, res, next) => {
  try {
    res.json({ version: await reviewMpaHistoryVersion({ actor: req.user!, id: req.params.versionId }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.post("/:id/history/:versionId/return", requirePermission("mpa.history_write"), async (req, res, next) => {
  try {
    const input = mpaHistoryDecisionSchema.parse(req.body);
    res.json({ version: await returnMpaHistoryVersion({ actor: req.user!, id: req.params.versionId, reason: input.reason ?? "Returned for revision" }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.post("/:id/history/:versionId/archive", requirePermission("mpa.history_write"), async (req, res, next) => {
  try {
    res.json({ version: await archiveMpaHistoryVersion({ actor: req.user!, id: req.params.versionId }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.post("/:id/history/:versionId/restore", requirePermission("mpa.history_restore"), async (req, res, next) => {
  try {
    res.json({ mpa: await restoreMpaHistoryVersion({ actor: req.user!, mpaId: req.params.id, versionId: req.params.versionId }) });
  } catch (error) {
    next(error);
  }
});

mpaRouter.patch("/:id/history/:versionId/visibility", requirePermission("mpa.history_write"), async (req, res, next) => {
  try {
    const input = mpaHistoryVisibilitySchema.parse(req.body);
    res.json({ version: await updateMpaHistoryVisibility({ actor: req.user!, id: req.params.versionId, visibleToEmployee: input.visibleToEmployee }) });
  } catch (error) {
    next(error);
  }
});

for (const [route, permission, action] of [
  ["submit", "mpa.submit", "submit"],
  ["return", "mpa.return", "return"],
  ["employee-approve", "mpa.approve_employee", "employee_approve"],
  ["manager-approve", "mpa.approve_manager", "manager_approve"],
  ["activate", "mpa.activate", "activate"],
  ["archive", "mpa.archive", "archive"],
] as const) {
  mpaRouter.post(`/:id/${route}`, requirePermission(permission), async (req, res, next) => {
    try {
      const input = mpaDecisionSchema.parse(req.body);
      res.json({ mpa: await moveMpa({ actor: req.user!, id: req.params.id, action, reason: input.reason }) });
    } catch (error) {
      next(error);
    }
  });
}
