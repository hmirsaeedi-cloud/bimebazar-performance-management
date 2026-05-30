import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import { createProcessSchema, listProcessesQuerySchema, processDecisionSchema, updateProcessSchema } from "./process.schemas.js";
import { configureProcess, createProcess, getProcess, listProcesses, moveProcess, updateProcess } from "./process.service.js";

export const processRouter = Router();

processRouter.get("/", requirePermission("process.read"), async (req, res, next) => {
  try {
    const query = listProcessesQuerySchema.parse(req.query);
    res.json({ processes: await listProcesses(query) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/", requirePermission("process.create"), async (req, res, next) => {
  try {
    const input = createProcessSchema.parse(req.body);
    res.status(201).json({ process: await createProcess({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

processRouter.get("/:id", requirePermission("process.read"), async (req, res, next) => {
  try {
    res.json({ process: await getProcess(req.params.id) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/:id", requirePermission("process.update"), async (req, res, next) => {
  try {
    const patch = updateProcessSchema.parse(req.body);
    res.json({ process: await updateProcess({ actor: req.user!, id: req.params.id, patch }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/:id/configure", requirePermission("process.configure"), async (req, res, next) => {
  try {
    res.json({ process: await configureProcess({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

for (const [route, permission, action] of [
  ["schedule", "process.configure", "schedule"],
  ["start", "process.start", "start"],
  ["pause", "process.pause", "pause"],
  ["resume", "process.start", "resume"],
  ["complete", "process.complete", "complete"],
  ["cancel", "process.cancel", "cancel"],
] as const) {
  processRouter.post(`/:id/${route}`, requirePermission(permission), async (req, res, next) => {
    try {
      const input = processDecisionSchema.parse(req.body);
      res.json({ process: await moveProcess({ actor: req.user!, id: req.params.id, action, reason: input.reason }) });
    } catch (error) {
      next(error);
    }
  });
}
