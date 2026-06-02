import { z } from "zod";

export const listFeedbackQuerySchema = z.object({
  status: z.enum(["draft", "open", "extended", "completed", "closed"]).optional(),
  requesterUserId: z.string().uuid().optional(),
  recipientUserId: z.string().uuid().optional(),
  subjectUserId: z.string().uuid().optional(),
  anonymityStatus: z.enum(["not_anonymous", "collecting", "guarded", "releasable", "released", "closed_zero"]).optional(),
});

export const createFeedbackSchema = z.object({
  subjectUserId: z.string().uuid().optional().nullable(),
  recipientUserIds: z.array(z.string().uuid()).min(1).max(20),
  title: z.string().min(3).max(180),
  question: z.string().min(8).max(1000),
  isAnonymous: z.boolean().default(false),
  minResponseCount: z.number().int().min(1).max(20).default(3),
  dueAt: z.string().datetime().optional().nullable(),
});

export const updateFeedbackSchema = z.object({
  title: z.string().min(3).max(180).optional(),
  question: z.string().min(8).max(1000).optional(),
  dueAt: z.string().datetime().optional().nullable(),
});

export const feedbackResponseSchema = z.object({
  responseText: z.string().min(2).max(4000),
});

export const extendFeedbackSchema = z.object({
  extendedUntil: z.string().datetime(),
});

export const closeFeedbackSchema = z.object({
  reason: z.string().min(4).max(500).optional(),
});

export const feedbackVisibilitySchema = z.object({
  visibility: z.object({
    requesterCanView: z.boolean().default(true),
    subjectCanView: z.boolean().default(false),
    hrbpCanView: z.boolean().default(true),
  }),
});

export const releaseFeedbackAnonymitySchema = z.object({
  reason: z.string().min(8).max(500).default("Minimum anonymous response threshold met."),
});
