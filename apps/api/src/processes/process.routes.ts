import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createProcessSchema,
  downwardEvaluationResponseSchema,
  downwardEvaluationReturnSchema,
  downwardEvaluationVisibilitySchema,
  listProcessesQuerySchema,
  processDecisionSchema,
  selfAssessmentResponseSchema,
  selfAssessmentReturnSchema,
  selfAssessmentVisibilitySchema,
  updateProcessSchema,
} from "./process.schemas.js";
import {
  approveDownwardHrbp,
  approveDownwardNextLevel,
  approveSelfAssessment,
  completeSelfAssessment,
  completeDownwardEvaluation,
  configureProcess,
  createProcess,
  getProcess,
  listDownwardEvaluations,
  listProcesses,
  listSelfAssessments,
  moveProcess,
  returnDownwardEvaluation,
  returnSelfAssessment,
  startDownwardEvaluation,
  startSelfAssessment,
  submitDownwardEvaluation,
  submitSelfAssessment,
  updateProcess,
  updateDownwardEvaluationVisibility,
  updateSelfAssessmentVisibility,
} from "./process.service.js";

export const processRouter = Router();

processRouter.get("/", requirePermission("process.read"), async (req, res, next) => {
  try {
    const query = listProcessesQuerySchema.parse(req.query);
    res.json({ processes: await listProcesses(query) });
  } catch (error) {
    next(error);
  }
});

processRouter.get("/:id/self-assessments", requirePermission("process.read"), async (req, res, next) => {
  try {
    res.json({ selfAssessments: await listSelfAssessments({ processId: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

processRouter.get("/:id/downward-evaluations", requirePermission("process.read"), async (req, res, next) => {
  try {
    res.json({ downwardEvaluations: await listDownwardEvaluations({ processId: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/:id/participants/:participantId/self-assessment/start", requirePermission("process.submit"), async (req, res, next) => {
  try {
    res.status(201).json({
      selfAssessment: await startSelfAssessment({ actor: req.user!, processId: req.params.id, participantId: req.params.participantId }),
    });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/:id/participants/:participantId/downward-evaluation/start", requirePermission("process.submit"), async (req, res, next) => {
  try {
    res.status(201).json({
      downwardEvaluation: await startDownwardEvaluation({ actor: req.user!, processId: req.params.id, participantId: req.params.participantId }),
    });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/downward-evaluations/:downwardEvaluationId/visibility", requirePermission("process.override"), async (req, res, next) => {
  try {
    const input = downwardEvaluationVisibilitySchema.parse(req.body);
    res.json({ downwardEvaluation: await updateDownwardEvaluationVisibility({ actor: req.user!, id: req.params.downwardEvaluationId, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/downward-evaluations/:downwardEvaluationId", requirePermission("process.submit"), async (req, res, next) => {
  try {
    const input = downwardEvaluationResponseSchema.parse(req.body);
    res.json({ downwardEvaluation: await submitDownwardEvaluation({ actor: req.user!, id: req.params.downwardEvaluationId, responses: input, saveOnly: true }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/downward-evaluations/:downwardEvaluationId/submit", requirePermission("process.submit"), async (req, res, next) => {
  try {
    const input = downwardEvaluationResponseSchema.parse(req.body);
    res.json({ downwardEvaluation: await submitDownwardEvaluation({ actor: req.user!, id: req.params.downwardEvaluationId, responses: input }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/downward-evaluations/:downwardEvaluationId/next-level-approve", requirePermission("process.approve"), async (req, res, next) => {
  try {
    res.json({ downwardEvaluation: await approveDownwardNextLevel({ actor: req.user!, id: req.params.downwardEvaluationId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/downward-evaluations/:downwardEvaluationId/hrbp-approve", requirePermission("process.approve"), async (req, res, next) => {
  try {
    res.json({ downwardEvaluation: await approveDownwardHrbp({ actor: req.user!, id: req.params.downwardEvaluationId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/downward-evaluations/:downwardEvaluationId/complete", requirePermission("process.approve"), async (req, res, next) => {
  try {
    res.json({ downwardEvaluation: await completeDownwardEvaluation({ actor: req.user!, id: req.params.downwardEvaluationId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/downward-evaluations/:downwardEvaluationId/return", requirePermission("process.return"), async (req, res, next) => {
  try {
    const input = downwardEvaluationReturnSchema.parse(req.body);
    res.json({ downwardEvaluation: await returnDownwardEvaluation({ actor: req.user!, id: req.params.downwardEvaluationId, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/self-assessments/:selfAssessmentId/visibility", requirePermission("process.override"), async (req, res, next) => {
  try {
    const input = selfAssessmentVisibilitySchema.parse(req.body);
    res.json({ selfAssessment: await updateSelfAssessmentVisibility({ actor: req.user!, id: req.params.selfAssessmentId, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/self-assessments/:selfAssessmentId", requirePermission("process.submit"), async (req, res, next) => {
  try {
    const input = selfAssessmentResponseSchema.parse(req.body);
    res.json({ selfAssessment: await submitSelfAssessment({ actor: req.user!, id: req.params.selfAssessmentId, responses: input.responses, saveOnly: true }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/self-assessments/:selfAssessmentId/submit", requirePermission("process.submit"), async (req, res, next) => {
  try {
    const input = selfAssessmentResponseSchema.parse(req.body);
    res.json({ selfAssessment: await submitSelfAssessment({ actor: req.user!, id: req.params.selfAssessmentId, responses: input.responses }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/self-assessments/:selfAssessmentId/approve", requirePermission("process.approve"), async (req, res, next) => {
  try {
    res.json({ selfAssessment: await approveSelfAssessment({ actor: req.user!, id: req.params.selfAssessmentId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/self-assessments/:selfAssessmentId/complete", requirePermission("process.approve"), async (req, res, next) => {
  try {
    res.json({ selfAssessment: await completeSelfAssessment({ actor: req.user!, id: req.params.selfAssessmentId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/self-assessments/:selfAssessmentId/return", requirePermission("process.return"), async (req, res, next) => {
  try {
    const input = selfAssessmentReturnSchema.parse(req.body);
    res.json({ selfAssessment: await returnSelfAssessment({ actor: req.user!, id: req.params.selfAssessmentId, reason: input.reason }) });
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
