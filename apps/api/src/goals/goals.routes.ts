import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createGoalSchema,
  goalReturnSchema,
  goalVisibilitySchema,
  listGoalsQuerySchema,
  updateGoalSchema,
} from "./goals.schemas.js";
import {
  activateGoal,
  approveGoal,
  archiveGoal,
  completeGoal,
  createGoal,
  listGoals,
  returnGoal,
  submitGoal,
  updateGoal,
  updateGoalVisibility,
} from "./goals.service.js";

export const goalsRouter = Router();

goalsRouter.get("/", requirePermission("goals.read"), async (req, res, next) => {
  try {
    const query = listGoalsQuerySchema.parse(req.query);
    res.json({ goals: await listGoals(query) });
  } catch (error) {
    next(error);
  }
});

goalsRouter.post("/", requirePermission("goals.create"), async (req, res, next) => {
  try {
    const input = createGoalSchema.parse(req.body);
    res.status(201).json({ goal: await createGoal({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

goalsRouter.patch("/:id", requirePermission("goals.update"), async (req, res, next) => {
  try {
    const patch = updateGoalSchema.parse(req.body);
    res.json({ goal: await updateGoal({ actor: req.user!, id: req.params.id, patch }) });
  } catch (error) {
    next(error);
  }
});

goalsRouter.post("/:id/submit", requirePermission("goals.submit"), async (req, res, next) => {
  try {
    res.json({ goal: await submitGoal({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

goalsRouter.post("/:id/approve", requirePermission("goals.approve"), async (req, res, next) => {
  try {
    res.json({ goal: await approveGoal({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

goalsRouter.post("/:id/activate", requirePermission("goals.approve"), async (req, res, next) => {
  try {
    res.json({ goal: await activateGoal({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

goalsRouter.post("/:id/return", requirePermission("goals.return"), async (req, res, next) => {
  try {
    const input = goalReturnSchema.parse(req.body);
    res.json({ goal: await returnGoal({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

goalsRouter.patch("/:id/visibility", requirePermission("goals.override"), async (req, res, next) => {
  try {
    const input = goalVisibilitySchema.parse(req.body);
    res.json({ goal: await updateGoalVisibility({ actor: req.user!, id: req.params.id, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});

goalsRouter.post("/:id/complete", requirePermission("goals.complete"), async (req, res, next) => {
  try {
    res.json({ goal: await completeGoal({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

goalsRouter.post("/:id/archive", requirePermission("goals.archive"), async (req, res, next) => {
  try {
    res.json({ goal: await archiveGoal({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});
