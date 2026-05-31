import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createEndCycleEvaluationSchema,
  evaluationAnswersSchema,
  evaluationReturnSchema,
  evaluationVisibilitySchema,
  listEvaluationsQuerySchema,
  scoreCalculationSchema,
} from "./evaluation.schemas.js";
import {
  approveEndCycleEvaluation,
  approveHrbpEvaluation,
  approveHeadEvaluation,
  approveNextLevelEvaluation,
  calculateEndCycleScore,
  completeEndCycleEvaluation,
  createEndCycleEvaluation,
  getEndCycleEvaluation,
  listEndCycleEvaluations,
  returnEndCycleEvaluation,
  submitEndCycleEvaluation,
  updateEndCycleEvaluation,
  updateEndCycleVisibility,
} from "./evaluation.service.js";

export const evaluationRouter = Router();

evaluationRouter.get("/", requirePermission("evaluation.read"), async (req, res, next) => {
  try {
    const query = listEvaluationsQuerySchema.parse(req.query);
    res.json({ evaluations: await listEndCycleEvaluations(query) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/", requirePermission("evaluation.create"), async (req, res, next) => {
  try {
    const input = createEndCycleEvaluationSchema.parse(req.body);
    res.status(201).json({ evaluation: await createEndCycleEvaluation({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.get("/:id", requirePermission("evaluation.read"), async (req, res, next) => {
  try {
    res.json({ evaluation: await getEndCycleEvaluation(req.params.id) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.patch("/:id", requirePermission("evaluation.update"), async (req, res, next) => {
  try {
    const input = evaluationAnswersSchema.parse(req.body);
    res.json({ evaluation: await updateEndCycleEvaluation({ actor: req.user!, id: req.params.id, answers: input.answers }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/:id/score", requirePermission("evaluation.read"), async (req, res, next) => {
  try {
    const input = scoreCalculationSchema.parse(req.body);
    res.json({ score: await calculateEndCycleScore({ id: req.params.id, answers: input.answers, reveal: input.reveal }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/:id/submit", requirePermission("evaluation.submit"), async (req, res, next) => {
  try {
    const input = evaluationAnswersSchema.parse(req.body);
    res.json({ evaluation: await submitEndCycleEvaluation({ actor: req.user!, id: req.params.id, answers: input.answers }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/:id/approve", requirePermission("evaluation.approve"), async (req, res, next) => {
  try {
    res.json({ evaluation: await approveEndCycleEvaluation({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/:id/next-level-approve", requirePermission("evaluation.approve"), async (req, res, next) => {
  try {
    res.json({ evaluation: await approveNextLevelEvaluation({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/:id/head-approve", requirePermission("evaluation.approve"), async (req, res, next) => {
  try {
    res.json({ evaluation: await approveHeadEvaluation({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/:id/hrbp-approve", requirePermission("evaluation.approve"), async (req, res, next) => {
  try {
    res.json({ evaluation: await approveHrbpEvaluation({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/:id/return", requirePermission("evaluation.return"), async (req, res, next) => {
  try {
    const input = evaluationReturnSchema.parse(req.body);
    res.json({ evaluation: await returnEndCycleEvaluation({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/:id/complete", requirePermission("evaluation.approve"), async (req, res, next) => {
  try {
    res.json({ evaluation: await completeEndCycleEvaluation({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.patch("/:id/visibility", requirePermission("evaluation.override"), async (req, res, next) => {
  try {
    const input = evaluationVisibilitySchema.parse(req.body);
    res.json({ evaluation: await updateEndCycleVisibility({ actor: req.user!, id: req.params.id, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});
