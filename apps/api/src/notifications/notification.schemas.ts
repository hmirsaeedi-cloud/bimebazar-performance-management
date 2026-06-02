import { z } from "zod";

const notificationPrioritySchema = z.enum(["low", "normal", "high", "critical"]);

export const listNotificationsQuerySchema = z.object({
  recipientUserId: z.string().uuid().optional(),
  status: z.enum(["unread", "read", "archived"]).optional(),
  priority: notificationPrioritySchema.optional(),
  entityType: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const createNotificationSchema = z.object({
  recipientUserId: z.string().uuid(),
  title: z.string().min(2).max(180),
  body: z.string().min(1).max(2000),
  priority: notificationPrioritySchema.default("normal"),
  entityType: z.string().min(1).max(80).optional().nullable(),
  entityId: z.string().min(1).max(120).optional().nullable(),
  actionUrl: z.string().min(1).max(500).optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

export const updateNotificationSchema = z.object({
  title: z.string().min(2).max(180).optional(),
  body: z.string().min(1).max(2000).optional(),
  priority: notificationPrioritySchema.optional(),
  actionUrl: z.string().min(1).max(500).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const listEmailNotificationsQuerySchema = z.object({
  recipientUserId: z.string().uuid().optional(),
  status: z
    .enum(["draft", "pending_approval", "approved", "queued", "sent", "failed", "returned", "cancelled"])
    .optional(),
  priority: notificationPrioritySchema.optional(),
  entityType: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const createEmailNotificationSchema = z.object({
  recipientUserId: z.string().uuid(),
  toEmail: z.string().email(),
  ccEmails: z.array(z.string().email()).default([]),
  bccEmails: z.array(z.string().email()).default([]),
  priority: notificationPrioritySchema.default("normal"),
  templateKey: z.string().min(1).max(120).optional().nullable(),
  subject: z.string().min(2).max(180),
  bodyText: z.string().min(1).max(4000),
  bodyHtml: z.string().min(1).max(8000),
  entityType: z.string().min(1).max(80).optional().nullable(),
  entityId: z.string().min(1).max(120).optional().nullable(),
  actionUrl: z.string().min(1).max(500).optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

export const updateEmailNotificationSchema = createEmailNotificationSchema.omit({ recipientUserId: true, toEmail: true }).partial();

export const emailReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const emailFailSchema = z.object({
  error: z.string().min(4).max(1000),
  provider: z.string().min(1).max(80).optional().nullable(),
});

export const emailMarkSentSchema = z.object({
  provider: z.string().min(1).max(80).optional().nullable(),
  providerMessageId: z.string().min(1).max(200).optional().nullable(),
});

export const emailVisibilitySchema = z.object({
  recipientVisible: z.boolean(),
});

export const listNotificationPreferencesQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  status: z.enum(["defaulted", "customized", "submitted", "approved", "returned", "overridden"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const updateNotificationPreferenceSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  digestFrequency: z.enum(["immediate", "daily", "weekly", "off"]).optional(),
  quietHours: z.object({
    enabled: z.boolean().default(true),
    start: z.string().min(4).max(8).default("18:00"),
    end: z.string().min(4).max(8).default("09:00"),
    timezone: z.string().min(1).max(80).default("Asia/Tehran"),
  }).partial().optional(),
  visibility: z.object({
    managerCanView: z.boolean().default(false),
    hrbpCanView: z.boolean().default(true),
    hrAdminCanView: z.boolean().default(true),
  }).partial().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const notificationPreferenceReturnSchema = z.object({
  reason: z.string().min(8).max(500),
});

export const notificationPreferenceOverrideSchema = updateNotificationPreferenceSchema.extend({
  reason: z.string().min(8).max(500),
});

export const notificationPreferenceVisibilitySchema = z.object({
  visibility: z.object({
    managerCanView: z.boolean().default(false),
    hrbpCanView: z.boolean().default(true),
    hrAdminCanView: z.boolean().default(true),
  }),
});
