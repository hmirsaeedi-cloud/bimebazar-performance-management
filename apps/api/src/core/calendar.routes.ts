import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import { calendarOverrideSchema, calendarPreferenceSchema } from "./calendar.schemas.js";
import {
  getCalendarPreferences,
  overrideCalendarPreferences,
  updateOwnCalendarPreferences,
} from "./calendar.service.js";
import { languageOverrideSchema, languagePreferenceSchema } from "./language.schemas.js";
import {
  getLanguagePreferences,
  overrideLanguagePreferences,
  updateOwnLanguagePreferences,
} from "./language.service.js";

export const coreRouter = Router();

coreRouter.get("/calendar", requirePermission("core.calendar.read"), async (req, res, next) => {
  try {
    res.json({ preferences: await getCalendarPreferences(req.user!) });
  } catch (error) {
    next(error);
  }
});

coreRouter.patch("/calendar", requirePermission("core.calendar.update"), async (req, res, next) => {
  try {
    const input = calendarPreferenceSchema.parse(req.body);
    res.json({ preferences: await updateOwnCalendarPreferences({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.patch("/calendar/users/:userId", requirePermission("core.calendar.override"), async (req, res, next) => {
  try {
    const input = calendarOverrideSchema.parse(req.body);
    res.json({
      preferences: await overrideCalendarPreferences({
        actor: req.user!,
        targetUserId: req.params.userId,
        ...input,
      }),
    });
  } catch (error) {
    next(error);
  }
});

coreRouter.get("/language", requirePermission("core.language.read"), async (req, res, next) => {
  try {
    res.json({ preferences: await getLanguagePreferences(req.user!) });
  } catch (error) {
    next(error);
  }
});

coreRouter.patch("/language", requirePermission("core.language.update"), async (req, res, next) => {
  try {
    const input = languagePreferenceSchema.parse(req.body);
    res.json({ preferences: await updateOwnLanguagePreferences({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.patch("/language/users/:userId", requirePermission("core.language.override"), async (req, res, next) => {
  try {
    const input = languageOverrideSchema.parse(req.body);
    res.json({
      preferences: await overrideLanguagePreferences({
        actor: req.user!,
        targetUserId: req.params.userId,
        ...input,
      }),
    });
  } catch (error) {
    next(error);
  }
});
