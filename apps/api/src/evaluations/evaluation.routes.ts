import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createEndCycleEvaluationSchema,
  createEvaluationComparisonSchema,
  evaluationAnswersSchema,
  evaluationComparisonReturnSchema,
  evaluationComparisonVisibilitySchema,
  evaluationReturnSchema,
  evaluationVisibilitySchema,
  generatePerformanceBandFlagSchema,
  listEvaluationComparisonsQuerySchema,
  listEvaluationsQuerySchema,
  listPerformanceBandFlagsQuerySchema,
  performanceBandFlagConvertSchema,
  performanceBandFlagDismissSchema,
  performanceBandFlagReturnSchema,
  performanceBandFlagVisibilitySchema,
  scoreCalculationSchema,
  updateEvaluationComparisonSchema,
  updatePerformanceBandFlagSchema,
} from "./evaluation.schemas.js";
import {
  approveEndCycleEvaluation,
  approveEvaluationComparison,
  approvePerformanceBandFlag,
  approveHrbpEvaluation,
  approveHeadEvaluation,
  approveNextLevelEvaluation,
  calculateEndCycleScore,
  completeEndCycleEvaluation,
  completeEvaluationComparison,
  convertPerformanceBandFlag,
  createEvaluationComparison,
  createEndCycleEvaluation,
  dismissPerformanceBandFlag,
  generatePerformanceBandFlag,
  getEndCycleEvaluation,
  listEvaluationComparisons,
  listEndCycleEvaluations,
  listPerformanceBandFlags,
  returnEndCycleEvaluation,
  returnEvaluationComparison,
  returnPerformanceBandFlag,
  submitPerformanceBandFlag,
  submitEvaluationComparison,
  submitEndCycleEvaluation,
  updateEvaluationComparison,
  updateEvaluationComparisonVisibility,
  updateEndCycleEvaluation,
  updateEndCycleVisibility,
  updatePerformanceBandFlag,
  updatePerformanceBandFlagVisibility,
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

evaluationRouter.get("/band-flags", requirePermission("evaluation.band_flags.read"), async (req, res, next) => {
  try {
    const query = listPerformanceBandFlagsQuerySchema.parse(req.query);
    res.json({ flags: await listPerformanceBandFlags(query) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/band-flags/generate", requirePermission("evaluation.band_flags.create"), async (req, res, next) => {
  try {
    const input = generatePerformanceBandFlagSchema.parse(req.body);
    res.status(201).json({ flag: await generatePerformanceBandFlag({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.patch("/band-flags/:flagId", requirePermission("evaluation.band_flags.update"), async (req, res, next) => {
  try {
    const patch = updatePerformanceBandFlagSchema.parse(req.body);
    res.json({ flag: await updatePerformanceBandFlag({ actor: req.user!, id: req.params.flagId, patch }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/band-flags/:flagId/submit", requirePermission("evaluation.band_flags.submit"), async (req, res, next) => {
  try {
    res.json({ flag: await submitPerformanceBandFlag({ actor: req.user!, id: req.params.flagId }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/band-flags/:flagId/approve", requirePermission("evaluation.band_flags.approve"), async (req, res, next) => {
  try {
    res.json({ flag: await approvePerformanceBandFlag({ actor: req.user!, id: req.params.flagId }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/band-flags/:flagId/return", requirePermission("evaluation.band_flags.return"), async (req, res, next) => {
  try {
    const input = performanceBandFlagReturnSchema.parse(req.body);
    res.json({ flag: await returnPerformanceBandFlag({ actor: req.user!, id: req.params.flagId, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/band-flags/:flagId/convert", requirePermission("evaluation.band_flags.convert"), async (req, res, next) => {
  try {
    const input = performanceBandFlagConvertSchema.parse(req.body);
    res.json({ flag: await convertPerformanceBandFlag({ actor: req.user!, id: req.params.flagId, targetType: input.targetType, targetId: input.targetId }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/band-flags/:flagId/dismiss", requirePermission("evaluation.band_flags.dismiss"), async (req, res, next) => {
  try {
    const input = performanceBandFlagDismissSchema.parse(req.body);
    res.json({ flag: await dismissPerformanceBandFlag({ actor: req.user!, id: req.params.flagId, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.get("/comparisons", requirePermission("evaluation.comparison.read"), async (req, res, next) => {
  try {
    const query = listEvaluationComparisonsQuerySchema.parse(req.query);
    res.json({ comparisons: await listEvaluationComparisons(query) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/comparisons", requirePermission("evaluation.comparison.create"), async (req, res, next) => {
  try {
    const input = createEvaluationComparisonSchema.parse(req.body);
    res.status(201).json({ comparison: await createEvaluationComparison({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.patch("/comparisons/:comparisonId", requirePermission("evaluation.comparison.update"), async (req, res, next) => {
  try {
    const input = updateEvaluationComparisonSchema.parse(req.body);
    res.json({ comparison: await updateEvaluationComparison({ actor: req.user!, id: req.params.comparisonId, ...input }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/comparisons/:comparisonId/submit", requirePermission("evaluation.comparison.submit"), async (req, res, next) => {
  try {
    res.json({ comparison: await submitEvaluationComparison({ actor: req.user!, id: req.params.comparisonId }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/comparisons/:comparisonId/approve", requirePermission("evaluation.comparison.approve"), async (req, res, next) => {
  try {
    res.json({ comparison: await approveEvaluationComparison({ actor: req.user!, id: req.params.comparisonId }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/comparisons/:comparisonId/return", requirePermission("evaluation.comparison.return"), async (req, res, next) => {
  try {
    const input = evaluationComparisonReturnSchema.parse(req.body);
    res.json({ comparison: await returnEvaluationComparison({ actor: req.user!, id: req.params.comparisonId, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.patch("/comparisons/:comparisonId/visibility", requirePermission("evaluation.comparison.override"), async (req, res, next) => {
  try {
    const input = evaluationComparisonVisibilitySchema.parse(req.body);
    res.json({ comparison: await updateEvaluationComparisonVisibility({ actor: req.user!, id: req.params.comparisonId, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.post("/comparisons/:comparisonId/complete", requirePermission("evaluation.comparison.complete"), async (req, res, next) => {
  try {
    res.json({ comparison: await completeEvaluationComparison({ actor: req.user!, id: req.params.comparisonId }) });
  } catch (error) {
    next(error);
  }
});

evaluationRouter.patch("/band-flags/:flagId/visibility", requirePermission("evaluation.band_flags.override"), async (req, res, next) => {
  try {
    const input = performanceBandFlagVisibilitySchema.parse(req.body);
    res.json({ flag: await updatePerformanceBandFlagVisibility({ actor: req.user!, id: req.params.flagId, visibility: input.visibility }) });
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
