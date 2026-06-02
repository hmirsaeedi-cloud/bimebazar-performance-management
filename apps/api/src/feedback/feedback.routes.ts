import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  closeFeedbackSchema,
  createFeedbackSchema,
  extendFeedbackSchema,
  feedbackResponseSchema,
  feedbackVisibilitySchema,
  listFeedbackQuerySchema,
  releaseFeedbackAnonymitySchema,
  updateFeedbackSchema,
} from "./feedback.schemas.js";
import {
  closeFeedbackRequest,
  createFeedbackRequest,
  extendFeedbackRequest,
  listActiveFeedbackRecipients,
  listFeedbackRequests,
  releaseFeedbackAnonymity,
  reviewFeedbackAnonymity,
  submitFeedbackRequest,
  submitFeedbackResponse,
  updateFeedbackRequest,
  updateFeedbackVisibility,
} from "./feedback.service.js";

export const feedbackRouter = Router();

feedbackRouter.get("/", requirePermission("feedback.read"), async (req, res, next) => {
  try {
    const query = listFeedbackQuerySchema.parse(req.query);
    res.json({ requests: await listFeedbackRequests({ actor: req.user!, ...query }) });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.get("/recipients", requirePermission("feedback.read"), async (_req, res, next) => {
  try {
    res.json({ recipients: await listActiveFeedbackRecipients() });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/", requirePermission("feedback.create"), async (req, res, next) => {
  try {
    const input = createFeedbackSchema.parse(req.body);
    res.status(201).json({ request: await createFeedbackRequest({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.patch("/:id", requirePermission("feedback.update"), async (req, res, next) => {
  try {
    const input = updateFeedbackSchema.parse(req.body);
    res.json({ request: await updateFeedbackRequest({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/:id/submit", requirePermission("feedback.submit"), async (req, res, next) => {
  try {
    res.json({ request: await submitFeedbackRequest({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/:id/respond", requirePermission("feedback.submit"), async (req, res, next) => {
  try {
    const input = feedbackResponseSchema.parse(req.body);
    res.status(201).json({ response: await submitFeedbackResponse({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/:id/anonymity/review", requirePermission("feedback.anonymity_review"), async (req, res, next) => {
  try {
    res.json({ request: await reviewFeedbackAnonymity({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/:id/anonymity/release", requirePermission("feedback.anonymity_release"), async (req, res, next) => {
  try {
    const input = releaseFeedbackAnonymitySchema.parse(req.body);
    res.json({ request: await releaseFeedbackAnonymity({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/:id/extend", requirePermission("feedback.extend"), async (req, res, next) => {
  try {
    const input = extendFeedbackSchema.parse(req.body);
    res.json({ request: await extendFeedbackRequest({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.post("/:id/close", requirePermission("feedback.close"), async (req, res, next) => {
  try {
    const input = closeFeedbackSchema.parse(req.body);
    res.json({ request: await closeFeedbackRequest({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

feedbackRouter.patch("/:id/visibility", requirePermission("feedback.override"), async (req, res, next) => {
  try {
    const input = feedbackVisibilitySchema.parse(req.body);
    res.json({ request: await updateFeedbackVisibility({ actor: req.user!, id: req.params.id, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});
