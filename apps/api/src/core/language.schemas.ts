import { z } from "zod";

export const languagePreferenceSchema = z
  .object({
    preferredLanguage: z.enum(["fa", "en"]),
    textDirection: z.enum(["rtl", "ltr"]).optional(),
    reason: z.string().min(8).max(500).optional(),
  })
  .transform((input) => ({
    ...input,
    textDirection: input.textDirection ?? (input.preferredLanguage === "fa" ? "rtl" : "ltr"),
  }));

export const languageOverrideSchema = languagePreferenceSchema.pipe(
  z.object({
    preferredLanguage: z.enum(["fa", "en"]),
    textDirection: z.enum(["rtl", "ltr"]),
    reason: z.string().min(8).max(500),
  }),
);
