import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createMidCycleEvaluationSchema,
  listMidCycleEvaluationsQuerySchema,
  midCycleAnswersSchema,
  midCycleReturnSchema,
  midCycleScoreCalculationSchema,
  midCycleVisibilitySchema,
} from "./midCycle.schemas.js";
import {
  approveMidCycleHrbp,
  approveMidCycleManager,
  calculateMidCycleScore,
  completeMidCycleEvaluation,
  createMidCycleEvaluation,
  getMidCycleEvaluation,
  listMidCycleEvaluations,
  returnMidCycleEvaluation,
  submitMidCycleEvaluation,
  updateMidCycleEvaluation,
  updateMidCycleVisibility,
} from "./midCycle.service.js";

export const midCycleEvaluationRouter = Router();

midCycleEvaluationRouter.get("/", requirePermission("evaluation.read"), async (req, res, next) => {
  try {
    const query = listMidCycleEvaluationsQuerySchema.parse(req.query);
    res.json({ evaluations: await listMidCycleEvaluations(query) });
  } catch (error) {
    next(error);
  }
});

midCycleEvaluationRouter.post("/", requirePermission("evaluation.create"), async (req, res, next) => {
  try {
    const input = createMidCycleEvaluationSchema.parse(req.body);
    res.status(201).json({ evaluation: await createMidCycleEvaluation({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

midCycleEvaluationRouter.get("/:id", requirePermission("evaluation.read"), async (req, res, next) => {
  try {
    res.json({ evaluation: await getMidCycleEvaluation(req.params.id) });
  } catch (error) {
    next(error);
  }
});

midCycleEvaluationRouter.patch("/:id", requirePermission("evaluation.update"), async (req, res, next) => {
  try {
    const input = midCycleAnswersSchema.parse(req.body);
    res.json({ evaluation: await updateMidCycleEvaluation({ actor: req.user!, id: req.params.id, answers: input.answers }) });
  } catch (error) {
    next(error);
  }
});

midCycleEvaluationRouter.post("/:id/score", requirePermission("evaluation.read"), async (req, res, next) => {
  try {
    const input = midCycleScoreCalculationSchema.parse(req.body);
    res.json({ score: await calculateMidCycleScore({ id: req.params.id, answers: input.answers, reveal: input.reveal }) });
  } catch (error) {
    next(error);
  }
});

midCycleEvaluationRouter.post("/:id/submit", requirePermission("evaluation.submit"), async (req, res, next) => {
  try {
    const input = midCycleAnswersSchema.parse(req.body);
    res.json({ evaluation: await submitMidCycleEvaluation({ actor: req.user!, id: req.params.id, answers: input.answers }) });
  } catch (error) {
    next(error);
  }
});

midCycleEvaluationRouter.post("/:id/manager-approve", requirePermission("evaluation.approve"), async (req, res, next) => {
  try {
    res.json({ evaluation: await approveMidCycleManager({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

midCycleEvaluationRouter.post("/:id/hrbp-approve", requirePermission("evaluation.approve"), async (req, res, next) => {
  try {
    res.json({ evaluation: await approveMidCycleHrbp({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

midCycleEvaluationRouter.post("/:id/return", requirePermission("evaluation.return"), async (req, res, next) => {
  try {
    const input = midCycleReturnSchema.parse(req.body);
    res.json({ evaluation: await returnMidCycleEvaluation({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

midCycleEvaluationRouter.patch("/:id/visibility", requirePermission("evaluation.override"), async (req, res, next) => {
  try {
    const input = midCycleVisibilitySchema.parse(req.body);
    res.json({ evaluation: await updateMidCycleVisibility({ actor: req.user!, id: req.params.id, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});

midCycleEvaluationRouter.post("/:id/complete", requirePermission("evaluation.approve"), async (req, res, next) => {
  try {
    res.json({ evaluation: await completeMidCycleEvaluation({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});
