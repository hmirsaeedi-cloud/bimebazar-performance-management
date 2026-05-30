import { Router } from "express";
import type { ErrorRequestHandler } from "express";
import { writeAuditEvent } from "../audit/audit.service.js";
import { requirePermission } from "../middleware/rbac.js";
import { createRequestSupabaseClient } from "../supabase/client.js";
import { createUserSchema, deactivateUserSchema, loginSchema } from "./auth.schemas.js";
import { createUser, deactivateUser, login, logout } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/login", requirePermission("auth.login", { allowAnonymous: true }), async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const supabase = createRequestSupabaseClient(req, res);
    const result = await login(supabase, input);

    res.status(200).json({ user: result.user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", requirePermission("auth.logout"), async (req, res, next) => {
  try {
    const supabase = createRequestSupabaseClient(req, res);
    await logout(supabase, { actor: req.user! });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requirePermission("auth.me"), async (req, res) => {
  res.json({ user: req.user });
});

authRouter.post("/users", requirePermission("auth.create_user"), async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await createUser({ actor: req.user!, ...input });

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/users/:userId/deactivate", requirePermission("auth.deactivate_user"), async (req, res, next) => {
  try {
    const input = deactivateUserSchema.parse(req.body);
    const user = await deactivateUser({
      actor: req.user!,
      targetUserId: req.params.userId,
      reason: input.reason,
    });

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
});

const authErrorHandler: ErrorRequestHandler = async (error, req, res, _next) => {
  await writeAuditEvent({
    actorUserId: req.user?.id ?? null,
    targetUserId: req.user?.id ?? null,
    action: "auth.error",
    entityType: "auth_route",
    reason: error instanceof Error ? error.message : "Unknown auth error",
    metadata: { path: req.path, method: req.method },
  });

  res.status(400).json({
    error: error instanceof Error ? error.message : "Invalid request",
  });
};

authRouter.use(authErrorHandler);
