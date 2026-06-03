import { Router } from "express";
import { employeeImportRouter } from "../imports/employeeImport.routes.js";
import { requirePermission } from "../middleware/rbac.js";
import {
  createEmployeeProfileSchema,
  createProfileOrgChartSchema,
  deactivateProfileSchema,
  employeeExportReportSchema,
  listProfilesQuerySchema,
  listProfileOrgChartsQuerySchema,
  profileOrgChartDecisionSchema,
  profileOrgChartVisibilitySchema,
  updateProfileOrgChartSchema,
  updateEmployeeProfileSchema,
} from "./profile.schemas.js";
import {
  activateProfileOrgChart,
  approveProfileOrgChart,
  archiveProfileOrgChart,
  createEmployeeProfile,
  createEmployeeExportReport,
  createProfileOrgChart,
  deactivateEmployeeProfile,
  getEmployeeProfile,
  getProfileOrgChart,
  listEmployeeProfiles,
  listProfileOrgCharts,
  listOrgUnits,
  refreshProfileOrgChart,
  returnProfileOrgChart,
  submitProfileOrgChart,
  updateEmployeeProfile,
  updateProfileOrgChart,
  updateProfileOrgChartVisibility,
} from "./profile.service.js";

export const profileRouter = Router();

profileRouter.use(employeeImportRouter);

profileRouter.get("/org-units", requirePermission("org_units.read"), async (_req, res, next) => {
  try {
    res.json(await listOrgUnits());
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/", requirePermission("profiles.read"), async (req, res, next) => {
  try {
    const query = listProfilesQuerySchema.parse(req.query);
    res.json(await listEmployeeProfiles(query));
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/exports", requirePermission("profiles.export"), async (req, res, next) => {
  try {
    const input = employeeExportReportSchema.parse(req.body);
    const { report, csv } = await createEmployeeExportReport({ actor: req.user!, ...input });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${report.file_name}"`);
    res.setHeader("X-Export-Report-Id", report.id);
    res.status(201).send(csv);
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/org-charts", requirePermission("profiles.org_chart_read"), async (req, res, next) => {
  try {
    const query = listProfileOrgChartsQuerySchema.parse(req.query);
    res.json({ orgCharts: await listProfileOrgCharts(query) });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/org-charts", requirePermission("profiles.org_chart_create"), async (req, res, next) => {
  try {
    const input = createProfileOrgChartSchema.parse(req.body);
    res.status(201).json({ orgChart: await createProfileOrgChart({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/org-charts/:id", requirePermission("profiles.org_chart_read"), async (req, res, next) => {
  try {
    res.json({ orgChart: await getProfileOrgChart(req.params.id) });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch("/org-charts/:id", requirePermission("profiles.org_chart_update"), async (req, res, next) => {
  try {
    const patch = updateProfileOrgChartSchema.parse(req.body);
    res.json({ orgChart: await updateProfileOrgChart({ actor: req.user!, id: req.params.id, patch }) });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/org-charts/:id/refresh", requirePermission("profiles.org_chart_update"), async (req, res, next) => {
  try {
    res.json({ orgChart: await refreshProfileOrgChart({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/org-charts/:id/submit", requirePermission("profiles.org_chart_submit"), async (req, res, next) => {
  try {
    res.json({ orgChart: await submitProfileOrgChart({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/org-charts/:id/approve", requirePermission("profiles.org_chart_approve"), async (req, res, next) => {
  try {
    res.json({ orgChart: await approveProfileOrgChart({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/org-charts/:id/activate", requirePermission("profiles.org_chart_approve"), async (req, res, next) => {
  try {
    res.json({ orgChart: await activateProfileOrgChart({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/org-charts/:id/return", requirePermission("profiles.org_chart_return"), async (req, res, next) => {
  try {
    const input = profileOrgChartDecisionSchema.parse(req.body);
    res.json({ orgChart: await returnProfileOrgChart({ actor: req.user!, id: req.params.id, reason: input.reason ?? "Returned for revision" }) });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch("/org-charts/:id/visibility", requirePermission("profiles.org_chart_override"), async (req, res, next) => {
  try {
    const input = profileOrgChartVisibilitySchema.parse(req.body);
    res.json({ orgChart: await updateProfileOrgChartVisibility({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/org-charts/:id/archive", requirePermission("profiles.org_chart_archive"), async (req, res, next) => {
  try {
    res.json({ orgChart: await archiveProfileOrgChart({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/", requirePermission("profiles.create"), async (req, res, next) => {
  try {
    const input = createEmployeeProfileSchema.parse(req.body);
    const profile = await createEmployeeProfile({ actor: req.user!, ...input });
    res.status(201).json({ profile });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/:id", requirePermission("profiles.read"), async (req, res, next) => {
  try {
    res.json({ profile: await getEmployeeProfile(req.params.id) });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch("/:id", requirePermission("profiles.update"), async (req, res, next) => {
  try {
    const patch = updateEmployeeProfileSchema.parse(req.body);
    const profile = await updateEmployeeProfile({ actor: req.user!, id: req.params.id, patch });
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/:id/deactivate", requirePermission("profiles.deactivate"), async (req, res, next) => {
  try {
    const input = deactivateProfileSchema.parse(req.body);
    const profile = await deactivateEmployeeProfile({
      actor: req.user!,
      id: req.params.id,
      reason: input.reason,
      exitDate: input.exitDate,
    });
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});
