import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createPipCaseSchema,
  listPipCasesQuerySchema,
  pipReturnSchema,
  pipVisibilitySchema,
  updatePipCaseSchema,
} from "./pip.schemas.js";
import {
  activatePipVisibility,
  approvePipCase,
  cancelPipCase,
  completePipCase,
  createPipCase,
  listPipCases,
  returnPipCase,
  startPipCase,
  submitPipCase,
  updatePipCase,
  updatePipVisibility,
} from "./pip.service.js";

export const pipRouter = Router();

pipRouter.get("/", requirePermission("pip.read"), async (req, res, next) => {
  try {
    const query = listPipCasesQuerySchema.parse(req.query);
    res.json({ pipCases: await listPipCases({ actor: req.user!, ...query }) });
  } catch (error) {
    next(error);
  }
});

pipRouter.post("/", requirePermission("pip.create"), async (req, res, next) => {
  try {
    const input = createPipCaseSchema.parse(req.body);
    res.status(201).json({ pipCase: await createPipCase({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

pipRouter.patch("/:id", requirePermission("pip.update"), async (req, res, next) => {
  try {
    const input = updatePipCaseSchema.parse(req.body);
    res.json({ pipCase: await updatePipCase({ actor: req.user!, id: req.params.id, patch: input }) });
  } catch (error) {
    next(error);
  }
});

pipRouter.post("/:id/submit", requirePermission("pip.submit"), async (req, res, next) => {
  try {
    res.json({ pipCase: await submitPipCase({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pipRouter.post("/:id/approve", requirePermission("pip.approve"), async (req, res, next) => {
  try {
    res.json({ pipCase: await approvePipCase({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pipRouter.post("/:id/activate-visibility", requirePermission("pip.activate_visibility"), async (req, res, next) => {
  try {
    res.json({ pipCase: await activatePipVisibility({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pipRouter.post("/:id/start", requirePermission("pip.update"), async (req, res, next) => {
  try {
    res.json({ pipCase: await startPipCase({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pipRouter.post("/:id/complete", requirePermission("pip.complete"), async (req, res, next) => {
  try {
    res.json({ pipCase: await completePipCase({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pipRouter.post("/:id/return", requirePermission("pip.return"), async (req, res, next) => {
  try {
    const input = pipReturnSchema.parse(req.body);
    res.json({ pipCase: await returnPipCase({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

pipRouter.post("/:id/cancel", requirePermission("pip.cancel"), async (req, res, next) => {
  try {
    res.json({ pipCase: await cancelPipCase({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pipRouter.patch("/:id/visibility", requirePermission("pip.override"), async (req, res, next) => {
  try {
    const input = pipVisibilitySchema.parse(req.body);
    res.json({ pipCase: await updatePipVisibility({ actor: req.user!, id: req.params.id, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});
