import type { NextFunction, Request, Response } from "express";
import type { PermissionCode } from "../auth/auth.types.js";

export function requirePermission(
  permission: PermissionCode,
  options: { allowAnonymous?: boolean } = {},
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (options.allowAnonymous) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: "Permission denied", permission });
    }

    return next();
  };
}
