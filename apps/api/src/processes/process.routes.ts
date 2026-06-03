import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createProcessSchema,
  downwardEvaluationResponseSchema,
  downwardEvaluationReturnSchema,
  downwardEvaluationVisibilitySchema,
  formInstanceAdminMoveSchema,
  formInstancePayloadSchema,
  formInstanceReturnSchema,
  formInstanceVisibilitySchema,
  createIndividualSurveySchema,
  createPulseSurveySchema,
  individualSurveyResponseSchema,
  individualSurveyReturnSchema,
  individualSurveyVisibilitySchema,
  listIndividualSurveysQuerySchema,
  listPulseSurveysQuerySchema,
  listProcessesQuerySchema,
  processDecisionSchema,
  pulseSurveyResponseSchema,
  pulseSurveyReturnSchema,
  pulseSurveyVisibilitySchema,
  selfAssessmentResponseSchema,
  selfAssessmentReturnSchema,
  selfAssessmentVisibilitySchema,
  updateProcessSchema,
  updateIndividualSurveySchema,
  updatePulseSurveySchema,
} from "./process.schemas.js";
import {
  approveDownwardHrbp,
  approveDownwardNextLevel,
  approveIndividualSurveyResponse,
  approvePulseSurvey,
  adminMoveProcessFormInstance,
  approveProcessFormInstance,
  closeProcessFormInstance,
  approveSelfAssessment,
  cancelIndividualSurvey,
  cancelPulseSurvey,
  completeSelfAssessment,
  completeDownwardEvaluation,
  completeIndividualSurvey,
  completePulseSurvey,
  configureProcess,
  createIndividualSurvey,
  createPulseSurvey,
  createProcess,
  getProcess,
  listDownwardEvaluations,
  listIndividualSurveys,
  listPulseSurveys,
  listProcessFormInstances,
  listProcesses,
  listSelfAssessments,
  moveProcess,
  returnDownwardEvaluation,
  returnIndividualSurveyResponse,
  returnPulseSurvey,
  returnProcessFormInstance,
  returnSelfAssessment,
  releasePulseSurvey,
  startDownwardEvaluation,
  startIndividualSurvey,
  startPulseSurvey,
  startSelfAssessment,
  submitDownwardEvaluation,
  submitIndividualSurveyResponse,
  submitPulseSurveyResponse,
  submitProcessFormInstance,
  submitSelfAssessment,
  syncProcessFormInstances,
  updateProcess,
  updateDownwardEvaluationVisibility,
  updateIndividualSurvey,
  updateIndividualSurveyVisibility,
  updatePulseSurvey,
  updatePulseSurveyVisibility,
  updateProcessFormInstance,
  updateProcessFormInstanceVisibility,
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

processRouter.get("/:id/form-instances", requirePermission("process.read"), async (req, res, next) => {
  try {
    res.json({ formInstances: await listProcessFormInstances({ processId: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/:id/form-instances/sync", requirePermission("process.configure"), async (req, res, next) => {
  try {
    res.status(201).json({ formInstances: await syncProcessFormInstances({ actor: req.user!, processId: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/form-instances/:formInstanceId", requirePermission("process.submit"), async (req, res, next) => {
  try {
    const input = formInstancePayloadSchema.parse(req.body);
    res.json({ formInstance: await updateProcessFormInstance({ actor: req.user!, id: req.params.formInstanceId, responsePayload: input.responsePayload }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/form-instances/:formInstanceId/submit", requirePermission("process.submit"), async (req, res, next) => {
  try {
    const input = formInstancePayloadSchema.parse(req.body);
    res.json({ formInstance: await submitProcessFormInstance({ actor: req.user!, id: req.params.formInstanceId, responsePayload: input.responsePayload }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/form-instances/:formInstanceId/approve", requirePermission("process.approve"), async (req, res, next) => {
  try {
    res.json({ formInstance: await approveProcessFormInstance({ actor: req.user!, id: req.params.formInstanceId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/form-instances/:formInstanceId/return", requirePermission("process.return"), async (req, res, next) => {
  try {
    const input = formInstanceReturnSchema.parse(req.body);
    res.json({ formInstance: await returnProcessFormInstance({ actor: req.user!, id: req.params.formInstanceId, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/form-instances/:formInstanceId/close", requirePermission("process.complete"), async (req, res, next) => {
  try {
    res.json({ formInstance: await closeProcessFormInstance({ actor: req.user!, id: req.params.formInstanceId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/form-instances/:formInstanceId/visibility", requirePermission("process.override"), async (req, res, next) => {
  try {
    const input = formInstanceVisibilitySchema.parse(req.body);
    res.json({ formInstance: await updateProcessFormInstanceVisibility({ actor: req.user!, id: req.params.formInstanceId, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/form-instances/:formInstanceId/admin-move", requirePermission("process.admin_move"), async (req, res, next) => {
  try {
    const input = formInstanceAdminMoveSchema.parse(req.body);
    res.json({ formInstance: await adminMoveProcessFormInstance({ actor: req.user!, id: req.params.formInstanceId, targetStatus: input.targetStatus, reason: input.reason }) });
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

processRouter.get("/surveys/individual", requirePermission("process.survey.read"), async (req, res, next) => {
  try {
    const query = listIndividualSurveysQuerySchema.parse(req.query);
    res.json({ surveys: await listIndividualSurveys(query) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/individual", requirePermission("process.survey.create"), async (req, res, next) => {
  try {
    const input = createIndividualSurveySchema.parse(req.body);
    res.status(201).json({ survey: await createIndividualSurvey({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/surveys/individual/:surveyId", requirePermission("process.survey.update"), async (req, res, next) => {
  try {
    const patch = updateIndividualSurveySchema.parse(req.body);
    res.json({ survey: await updateIndividualSurvey({ actor: req.user!, id: req.params.surveyId, patch }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/individual/:surveyId/start", requirePermission("process.survey.start"), async (req, res, next) => {
  try {
    res.json({ survey: await startIndividualSurvey({ actor: req.user!, id: req.params.surveyId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/surveys/individual/:surveyId/visibility", requirePermission("process.survey.override"), async (req, res, next) => {
  try {
    const input = individualSurveyVisibilitySchema.parse(req.body);
    res.json({ survey: await updateIndividualSurveyVisibility({ actor: req.user!, id: req.params.surveyId, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/individual/:surveyId/complete", requirePermission("process.survey.complete"), async (req, res, next) => {
  try {
    res.json({ survey: await completeIndividualSurvey({ actor: req.user!, id: req.params.surveyId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/individual/:surveyId/cancel", requirePermission("process.survey.cancel"), async (req, res, next) => {
  try {
    const input = processDecisionSchema.parse(req.body);
    res.json({ survey: await cancelIndividualSurvey({ actor: req.user!, id: req.params.surveyId, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/surveys/individual/responses/:responseId", requirePermission("process.survey.submit"), async (req, res, next) => {
  try {
    const input = individualSurveyResponseSchema.parse(req.body);
    res.json({ response: await submitIndividualSurveyResponse({ actor: req.user!, id: req.params.responseId, answers: input.answers, saveOnly: true }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/individual/responses/:responseId/submit", requirePermission("process.survey.submit"), async (req, res, next) => {
  try {
    const input = individualSurveyResponseSchema.parse(req.body);
    res.json({ response: await submitIndividualSurveyResponse({ actor: req.user!, id: req.params.responseId, answers: input.answers }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/individual/responses/:responseId/approve", requirePermission("process.survey.approve"), async (req, res, next) => {
  try {
    res.json({ response: await approveIndividualSurveyResponse({ actor: req.user!, id: req.params.responseId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/individual/responses/:responseId/return", requirePermission("process.survey.return"), async (req, res, next) => {
  try {
    const input = individualSurveyReturnSchema.parse(req.body);
    res.json({ response: await returnIndividualSurveyResponse({ actor: req.user!, id: req.params.responseId, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

processRouter.get("/surveys/pulse", requirePermission("process.pulse.read"), async (req, res, next) => {
  try {
    const query = listPulseSurveysQuerySchema.parse(req.query);
    res.json({ surveys: await listPulseSurveys(query) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/pulse", requirePermission("process.pulse.create"), async (req, res, next) => {
  try {
    const input = createPulseSurveySchema.parse(req.body);
    res.status(201).json({ survey: await createPulseSurvey({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/surveys/pulse/:surveyId", requirePermission("process.pulse.update"), async (req, res, next) => {
  try {
    const patch = updatePulseSurveySchema.parse(req.body);
    res.json({ survey: await updatePulseSurvey({ actor: req.user!, id: req.params.surveyId, patch }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/pulse/:surveyId/start", requirePermission("process.pulse.start"), async (req, res, next) => {
  try {
    res.json({ survey: await startPulseSurvey({ actor: req.user!, id: req.params.surveyId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/pulse/:surveyId/responses", requirePermission("process.pulse.submit"), async (req, res, next) => {
  try {
    const input = pulseSurveyResponseSchema.parse(req.body);
    res.status(201).json(await submitPulseSurveyResponse({ actor: req.user!, id: req.params.surveyId, respondentCode: input.respondentCode, answers: input.answers }));
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/pulse/:surveyId/approve", requirePermission("process.pulse.approve"), async (req, res, next) => {
  try {
    res.json({ survey: await approvePulseSurvey({ actor: req.user!, id: req.params.surveyId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/pulse/:surveyId/release", requirePermission("process.pulse.release"), async (req, res, next) => {
  try {
    res.json({ survey: await releasePulseSurvey({ actor: req.user!, id: req.params.surveyId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/pulse/:surveyId/return", requirePermission("process.pulse.return"), async (req, res, next) => {
  try {
    const input = pulseSurveyReturnSchema.parse(req.body);
    res.json({ survey: await returnPulseSurvey({ actor: req.user!, id: req.params.surveyId, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

processRouter.patch("/surveys/pulse/:surveyId/visibility", requirePermission("process.pulse.override"), async (req, res, next) => {
  try {
    const input = pulseSurveyVisibilitySchema.parse(req.body);
    res.json({ survey: await updatePulseSurveyVisibility({ actor: req.user!, id: req.params.surveyId, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/pulse/:surveyId/complete", requirePermission("process.pulse.complete"), async (req, res, next) => {
  try {
    res.json({ survey: await completePulseSurvey({ actor: req.user!, id: req.params.surveyId }) });
  } catch (error) {
    next(error);
  }
});

processRouter.post("/surveys/pulse/:surveyId/cancel", requirePermission("process.pulse.cancel"), async (req, res, next) => {
  try {
    const input = processDecisionSchema.parse(req.body);
    res.json({ survey: await cancelPulseSurvey({ actor: req.user!, id: req.params.surveyId, reason: input.reason }) });
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
