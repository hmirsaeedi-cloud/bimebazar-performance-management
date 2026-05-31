import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import { autoAttachMpaSchema, createMpaCycleSchema, createMpaSchema, listMpasQuerySchema, mpaDecisionSchema, updateMpaSchema } from "./mpa.schemas.js";
import { autoAttachMpaToEvaluation, createMpa, createMpaCycle, getMpa, listMpaCycles, listMpas, moveMpa, updateMpa } from "./mpa.service.js";

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
