import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createPromotionCaseSchema,
  listPromotionCasesQuerySchema,
  promotionReturnSchema,
  promotionVisibilitySchema,
  updatePromotionCaseSchema,
} from "./promotion.schemas.js";
import {
  approvePromotionCase,
  cancelPromotionCase,
  createPromotionCase,
  hrbpApprovePromotionCase,
  listPromotionCases,
  managerApprovePromotionCase,
  returnPromotionCase,
  submitPromotionCase,
  updatePromotionCase,
  updatePromotionVisibility,
} from "./promotion.service.js";

export const promotionRouter = Router();

promotionRouter.get("/", requirePermission("promotion.read"), async (req, res, next) => {
  try {
    const query = listPromotionCasesQuerySchema.parse(req.query);
    res.json({ promotionCases: await listPromotionCases({ actor: req.user!, ...query }) });
  } catch (error) {
    next(error);
  }
});

promotionRouter.post("/", requirePermission("promotion.create"), async (req, res, next) => {
  try {
    const input = createPromotionCaseSchema.parse(req.body);
    res.status(201).json({ promotionCase: await createPromotionCase({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

promotionRouter.patch("/:id", requirePermission("promotion.update"), async (req, res, next) => {
  try {
    const input = updatePromotionCaseSchema.parse(req.body);
    res.json({ promotionCase: await updatePromotionCase({ actor: req.user!, id: req.params.id, patch: input }) });
  } catch (error) {
    next(error);
  }
});

promotionRouter.post("/:id/submit", requirePermission("promotion.submit"), async (req, res, next) => {
  try {
    res.json({ promotionCase: await submitPromotionCase({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

promotionRouter.post("/:id/manager-approve", requirePermission("promotion.approve"), async (req, res, next) => {
  try {
    res.json({ promotionCase: await managerApprovePromotionCase({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

promotionRouter.post("/:id/hrbp-approve", requirePermission("promotion.approve"), async (req, res, next) => {
  try {
    res.json({ promotionCase: await hrbpApprovePromotionCase({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

promotionRouter.post("/:id/approve", requirePermission("promotion.approve"), async (req, res, next) => {
  try {
    res.json({ promotionCase: await approvePromotionCase({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

promotionRouter.post("/:id/return", requirePermission("promotion.return"), async (req, res, next) => {
  try {
    const input = promotionReturnSchema.parse(req.body);
    res.json({ promotionCase: await returnPromotionCase({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

promotionRouter.post("/:id/cancel", requirePermission("promotion.cancel"), async (req, res, next) => {
  try {
    res.json({ promotionCase: await cancelPromotionCase({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

promotionRouter.patch("/:id/visibility", requirePermission("promotion.override"), async (req, res, next) => {
  try {
    const input = promotionVisibilitySchema.parse(req.body);
    res.json({ promotionCase: await updatePromotionVisibility({ actor: req.user!, id: req.params.id, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});
