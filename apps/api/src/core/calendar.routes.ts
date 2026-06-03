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
import {
  createHrisIntegrationSchema,
  hrisDecisionSchema,
  hrisSyncCompleteSchema,
  hrisSyncPreviewSchema,
  hrisVisibilitySchema,
  listHrisIntegrationsQuerySchema,
  updateHrisIntegrationSchema,
} from "./hris.schemas.js";
import {
  activateHrisIntegration,
  approveHrisIntegration,
  archiveHrisIntegration,
  completeHrisSync,
  createHrisIntegration,
  failHrisSync,
  getHrisIntegration,
  listHrisIntegrations,
  previewHrisSync,
  returnHrisIntegration,
  startHrisSync,
  submitHrisIntegration,
  updateHrisIntegration,
  updateHrisVisibility,
} from "./hris.service.js";

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

coreRouter.get("/hris", requirePermission("core.hris.read"), async (req, res, next) => {
  try {
    const query = listHrisIntegrationsQuerySchema.parse(req.query);
    res.json({ integrations: await listHrisIntegrations(query) });
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/hris", requirePermission("core.hris.create"), async (req, res, next) => {
  try {
    const input = createHrisIntegrationSchema.parse(req.body);
    res.status(201).json({ integration: await createHrisIntegration({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.get("/hris/:id", requirePermission("core.hris.read"), async (req, res, next) => {
  try {
    res.json({ integration: await getHrisIntegration(req.params.id) });
  } catch (error) {
    next(error);
  }
});

coreRouter.patch("/hris/:id", requirePermission("core.hris.update"), async (req, res, next) => {
  try {
    const patch = updateHrisIntegrationSchema.parse(req.body);
    res.json({ integration: await updateHrisIntegration({ actor: req.user!, id: req.params.id, patch }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/hris/:id/preview", requirePermission("core.hris.read"), async (req, res, next) => {
  try {
    const input = hrisSyncPreviewSchema.parse(req.body);
    res.json({ preview: await previewHrisSync({ actor: req.user!, id: req.params.id, records: input.records }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/hris/:id/submit", requirePermission("core.hris.submit"), async (req, res, next) => {
  try {
    res.json({ integration: await submitHrisIntegration({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/hris/:id/approve", requirePermission("core.hris.approve"), async (req, res, next) => {
  try {
    res.json({ integration: await approveHrisIntegration({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/hris/:id/activate", requirePermission("core.hris.approve"), async (req, res, next) => {
  try {
    res.json({ integration: await activateHrisIntegration({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/hris/:id/sync/start", requirePermission("core.hris.sync"), async (req, res, next) => {
  try {
    res.json({ integration: await startHrisSync({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/hris/:id/sync/complete", requirePermission("core.hris.sync"), async (req, res, next) => {
  try {
    const input = hrisSyncCompleteSchema.parse(req.body);
    res.json({ integration: await completeHrisSync({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/hris/:id/sync/fail", requirePermission("core.hris.sync"), async (req, res, next) => {
  try {
    const input = hrisDecisionSchema.parse(req.body);
    res.json({ integration: await failHrisSync({ actor: req.user!, id: req.params.id, reason: input.reason ?? "Sync failed" }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/hris/:id/return", requirePermission("core.hris.return"), async (req, res, next) => {
  try {
    const input = hrisDecisionSchema.parse(req.body);
    res.json({ integration: await returnHrisIntegration({ actor: req.user!, id: req.params.id, reason: input.reason ?? "Returned for revision" }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.patch("/hris/:id/visibility", requirePermission("core.hris.override"), async (req, res, next) => {
  try {
    const input = hrisVisibilitySchema.parse(req.body);
    res.json({ integration: await updateHrisVisibility({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/hris/:id/archive", requirePermission("core.hris.archive"), async (req, res, next) => {
  try {
    res.json({ integration: await archiveHrisIntegration({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});
