import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import { syncAllComputedManagerRoles } from "./managerRole.service.js";
import { assignRoleSchema, revokeRoleSchema, roleCodeSchema } from "./rbac.schemas.js";
import { assignUserRole, listRbacCatalog, listUserRoleAssignments, revokeUserRole } from "./rbac.service.js";

export const rbacRouter = Router();

rbacRouter.get("/", requirePermission("rbac.read"), async (_req, res, next) => {
  try {
    res.json(await listRbacCatalog());
  } catch (error) {
    next(error);
  }
});

rbacRouter.post("/sync-manager-roles", requirePermission("rbac.sync_manager_roles"), async (req, res, next) => {
  try {
    const results = await syncAllComputedManagerRoles({
      actor: req.user!,
      reason: "Manual HR Admin manager-role resync",
    });

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

rbacRouter.get("/users/:userId/roles", requirePermission("rbac.read"), async (req, res, next) => {
  try {
    res.json({ roles: await listUserRoleAssignments(req.params.userId) });
  } catch (error) {
    next(error);
  }
});

rbacRouter.post("/users/:userId/roles", requirePermission("rbac.assign_role"), async (req, res, next) => {
  try {
    const input = assignRoleSchema.parse(req.body);
    const assignment = await assignUserRole({
      actor: req.user!,
      userId: req.params.userId,
      role: input.role,
      assignmentType: input.assignmentType,
      reason: input.reason,
    });

    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
});

rbacRouter.delete("/users/:userId/roles/:role", requirePermission("rbac.revoke_role"), async (req, res, next) => {
  try {
    const role = roleCodeSchema.parse(req.params.role);
    const input = revokeRoleSchema.parse(req.body);
    const assignment = await revokeUserRole({
      actor: req.user!,
      userId: req.params.userId,
      role,
      reason: input.reason,
    });

    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});
