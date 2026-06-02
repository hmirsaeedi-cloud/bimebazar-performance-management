import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import { dashboardOverrideSchema, dashboardPreferenceSchema, dashboardSummaryQuerySchema } from "./dashboard.schemas.js";
import { getDashboardSummary, overrideDashboardPreference, updateDashboardPreference } from "./dashboard.service.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requirePermission("dashboard.read"), async (req, res, next) => {
  try {
    const query = dashboardSummaryQuerySchema.parse(req.query);
    res.json({ dashboard: await getDashboardSummary({ actor: req.user!, ...query }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.patch("/preferences", requirePermission("dashboard.update"), async (req, res, next) => {
  try {
    const input = dashboardPreferenceSchema.parse(req.body);
    res.json({ preference: await updateDashboardPreference({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.post("/preferences/override", requirePermission("dashboard.override"), async (req, res, next) => {
  try {
    const input = dashboardOverrideSchema.parse(req.body);
    res.json({ preference: await overrideDashboardPreference({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});
