import { Router } from "express";
import { employeeImportRouter } from "../imports/employeeImport.routes.js";
import { requirePermission } from "../middleware/rbac.js";
import {
  createEmployeeProfileSchema,
  deactivateProfileSchema,
  listProfilesQuerySchema,
  updateEmployeeProfileSchema,
} from "./profile.schemas.js";
import {
  createEmployeeProfile,
  deactivateEmployeeProfile,
  getEmployeeProfile,
  listEmployeeProfiles,
  listOrgUnits,
  updateEmployeeProfile,
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
