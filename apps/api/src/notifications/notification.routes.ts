import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createEmailNotificationSchema,
  createNotificationSchema,
  emailFailSchema,
  emailMarkSentSchema,
  emailReturnSchema,
  emailVisibilitySchema,
  listEmailNotificationsQuerySchema,
  listNotificationPreferencesQuerySchema,
  listNotificationsQuerySchema,
  notificationPreferenceOverrideSchema,
  notificationPreferenceReturnSchema,
  notificationPreferenceVisibilitySchema,
  updateEmailNotificationSchema,
  updateNotificationPreferenceSchema,
  updateNotificationSchema,
} from "./notification.schemas.js";
import {
  archiveNotification,
  approveEmailNotification,
  cancelEmailNotification,
  approveNotificationPreference,
  createInAppNotification,
  createEmailNotification,
  failEmailNotification,
  listNotificationPreferences,
  listEmailNotifications,
  listNotifications,
  markNotificationRead,
  markEmailNotificationSent,
  queueEmailNotification,
  returnNotificationPreference,
  submitNotificationPreference,
  overrideNotificationPreference,
  returnEmailNotification,
  updateNotificationPreference,
  updateNotificationPreferenceVisibility,
  submitEmailNotification,
  updateEmailNotification,
  updateEmailNotificationVisibility,
  updateNotification,
} from "./notification.service.js";

export const notificationRouter = Router();

notificationRouter.get("/", requirePermission("notifications.read"), async (req, res, next) => {
  try {
    const query = listNotificationsQuerySchema.parse(req.query);
    res.json({ notifications: await listNotifications({ actor: req.user!, ...query }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/", requirePermission("notifications.create"), async (req, res, next) => {
  try {
    const input = createNotificationSchema.parse(req.body);
    res.status(201).json({ notification: await createInAppNotification({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch("/:id", requirePermission("notifications.update"), async (req, res, next) => {
  try {
    const input = updateNotificationSchema.parse(req.body);
    res.json({ notification: await updateNotification({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/:id/mark-read", requirePermission("notifications.mark_read"), async (req, res, next) => {
  try {
    res.json({ notification: await markNotificationRead({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/:id/archive", requirePermission("notifications.archive"), async (req, res, next) => {
  try {
    res.json({ notification: await archiveNotification({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.get("/preferences", requirePermission("notifications.preferences.read"), async (req, res, next) => {
  try {
    const query = listNotificationPreferencesQuerySchema.parse(req.query);
    res.json({ preferences: await listNotificationPreferences({ actor: req.user!, ...query }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch("/preferences/:id", requirePermission("notifications.preferences.update"), async (req, res, next) => {
  try {
    const input = updateNotificationPreferenceSchema.parse(req.body);
    res.json({ preference: await updateNotificationPreference({ actor: req.user!, id: req.params.id, patch: input }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/preferences/:id/submit", requirePermission("notifications.preferences.submit"), async (req, res, next) => {
  try {
    res.json({ preference: await submitNotificationPreference({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/preferences/:id/approve", requirePermission("notifications.preferences.approve"), async (req, res, next) => {
  try {
    res.json({ preference: await approveNotificationPreference({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/preferences/:id/return", requirePermission("notifications.preferences.return"), async (req, res, next) => {
  try {
    const input = notificationPreferenceReturnSchema.parse(req.body);
    res.json({ preference: await returnNotificationPreference({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/preferences/:id/override", requirePermission("notifications.preferences.override"), async (req, res, next) => {
  try {
    const input = notificationPreferenceOverrideSchema.parse(req.body);
    res.json({ preference: await overrideNotificationPreference({ actor: req.user!, id: req.params.id, patch: input, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch("/preferences/:id/visibility", requirePermission("notifications.preferences.override"), async (req, res, next) => {
  try {
    const input = notificationPreferenceVisibilitySchema.parse(req.body);
    res.json({ preference: await updateNotificationPreferenceVisibility({ actor: req.user!, id: req.params.id, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.get("/email", requirePermission("notifications.email.read"), async (req, res, next) => {
  try {
    const query = listEmailNotificationsQuerySchema.parse(req.query);
    res.json({ emailNotifications: await listEmailNotifications({ actor: req.user!, ...query }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/email", requirePermission("notifications.email.create"), async (req, res, next) => {
  try {
    const input = createEmailNotificationSchema.parse(req.body);
    res.status(201).json({ emailNotification: await createEmailNotification({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch("/email/:id", requirePermission("notifications.email.update"), async (req, res, next) => {
  try {
    const input = updateEmailNotificationSchema.parse(req.body);
    res.json({ emailNotification: await updateEmailNotification({ actor: req.user!, id: req.params.id, patch: input }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/email/:id/submit", requirePermission("notifications.email.submit"), async (req, res, next) => {
  try {
    res.json({ emailNotification: await submitEmailNotification({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/email/:id/approve", requirePermission("notifications.email.approve"), async (req, res, next) => {
  try {
    res.json({ emailNotification: await approveEmailNotification({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/email/:id/queue", requirePermission("notifications.email.send"), async (req, res, next) => {
  try {
    res.json({ emailNotification: await queueEmailNotification({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/email/:id/mark-sent", requirePermission("notifications.email.send"), async (req, res, next) => {
  try {
    const input = emailMarkSentSchema.parse(req.body);
    res.json({ emailNotification: await markEmailNotificationSent({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/email/:id/fail", requirePermission("notifications.email.send"), async (req, res, next) => {
  try {
    const input = emailFailSchema.parse(req.body);
    res.json({ emailNotification: await failEmailNotification({ actor: req.user!, id: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/email/:id/return", requirePermission("notifications.email.return"), async (req, res, next) => {
  try {
    const input = emailReturnSchema.parse(req.body);
    res.json({ emailNotification: await returnEmailNotification({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/email/:id/cancel", requirePermission("notifications.email.cancel"), async (req, res, next) => {
  try {
    res.json({ emailNotification: await cancelEmailNotification({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch("/email/:id/visibility", requirePermission("notifications.email.override"), async (req, res, next) => {
  try {
    const input = emailVisibilitySchema.parse(req.body);
    res.json({ emailNotification: await updateEmailNotificationVisibility({ actor: req.user!, id: req.params.id, recipientVisible: input.recipientVisible }) });
  } catch (error) {
    next(error);
  }
});
