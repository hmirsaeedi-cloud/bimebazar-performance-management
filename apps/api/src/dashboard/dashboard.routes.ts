import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createTeamHealthSchema,
  dashboardOverrideSchema,
  dashboardPreferenceSchema,
  dashboardSummaryQuerySchema,
  listTeamHealthQuerySchema,
  teamHealthDecisionSchema,
  teamHealthVisibilitySchema,
  updateTeamHealthSchema,
} from "./dashboard.schemas.js";
import {
  activateTeamHealth,
  approveTeamHealth,
  archiveTeamHealth,
  calculateTeamHealth,
  createTeamHealthScore,
  getDashboardSummary,
  listTeamHealthScores,
  overrideDashboardPreference,
  returnTeamHealth,
  submitTeamHealth,
  updateDashboardPreference,
  updateTeamHealthScore,
  updateTeamHealthVisibility,
} from "./dashboard.service.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requirePermission("dashboard.read"), async (req, res, next) => {
  try {
    const query = dashboardSummaryQuerySchema.parse(req.query);
    res.json({ dashboard: await getDashboardSummary({ actor: req.user!, ...query }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/team-health", requirePermission("dashboard.team_health.read"), async (req, res, next) => {
  try {
    const query = listTeamHealthQuerySchema.parse(req.query);
    res.json({ scores: await listTeamHealthScores(query) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.post("/team-health", requirePermission("dashboard.team_health.create"), async (req, res, next) => {
  try {
    const input = createTeamHealthSchema.parse(req.body);
    res.status(201).json({ score: await createTeamHealthScore({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.patch("/team-health/:id", requirePermission("dashboard.team_health.update"), async (req, res, next) => {
  try {
    const patch = updateTeamHealthSchema.parse(req.body);
    res.json({ score: await updateTeamHealthScore({ actor: req.user!, id: req.params.id, patch }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.post("/team-health/:id/calculate", requirePermission("dashboard.team_health.update"), async (req, res, next) => {
  try {
    res.json({ score: await calculateTeamHealth({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.post("/team-health/:id/submit", requirePermission("dashboard.team_health.submit"), async (req, res, next) => {
  try {
    res.json({ score: await submitTeamHealth({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.post("/team-health/:id/approve", requirePermission("dashboard.team_health.approve"), async (req, res, next) => {
  try {
    res.json({ score: await approveTeamHealth({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.post("/team-health/:id/activate", requirePermission("dashboard.team_health.approve"), async (req, res, next) => {
  try {
    res.json({ score: await activateTeamHealth({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.post("/team-health/:id/return", requirePermission("dashboard.team_health.return"), async (req, res, next) => {
  try {
    const input = teamHealthDecisionSchema.parse(req.body);
    res.json({ score: await returnTeamHealth({ actor: req.user!, id: req.params.id, reason: input.reason ?? "Returned for revision" }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.patch("/team-health/:id/visibility", requirePermission("dashboard.team_health.override"), async (req, res, next) => {
  try {
    const input = teamHealthVisibilitySchema.parse(req.body);
    res.json({ score: await updateTeamHealthVisibility({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.post("/team-health/:id/archive", requirePermission("dashboard.team_health.archive"), async (req, res, next) => {
  try {
    res.json({ score: await archiveTeamHealth({ actor: req.user!, id: req.params.id }) });
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
