import type { NextFunction, Request, Response } from "express";
import { getAuthUserById } from "../db/repository.js";
import { createRequestSupabaseClient } from "../supabase/client.js";

export async function attachSession(req: Request, res: Response, next: NextFunction) {
  try {
    const supabase = createRequestSupabaseClient(req, res);
    const { data, error } = await supabase.auth.getClaims();
    const claimsPayload = data as
      | { claims?: { sub?: string }; user?: { sub?: string; id?: string } }
      | null;
    const subject = claimsPayload?.claims?.sub ?? claimsPayload?.user?.sub ?? claimsPayload?.user?.id;

    if (error || !subject) {
      return next();
    }

    const user = await getAuthUserById(supabase, subject);
    if (user) {
      req.user = user;
    }

    return next();
  } catch {
    return next();
  }
}
