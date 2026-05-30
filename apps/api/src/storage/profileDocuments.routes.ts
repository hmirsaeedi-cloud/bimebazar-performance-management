import { Router } from "express";
import { z } from "zod";
import { requirePermission } from "../middleware/rbac.js";
import { createProfileDocumentReadUrl, createProfileDocumentUploadUrl } from "./profileDocuments.service.js";

const uploadUrlSchema = z.object({
  targetUserId: z.string().uuid(),
  fileName: z.string().min(1).max(180),
});

const readUrlSchema = z.object({
  objectPath: z.string().min(1).max(500),
  expiresInSeconds: z.number().int().min(60).max(3600).optional(),
});

export const profileDocumentsRouter = Router();

profileDocumentsRouter.post(
  "/upload-url",
  requirePermission("storage.profile_documents.write"),
  async (req, res, next) => {
    try {
      const input = uploadUrlSchema.parse(req.body);
      const result = await createProfileDocumentUploadUrl({ actor: req.user!, ...input });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

profileDocumentsRouter.post(
  "/read-url",
  requirePermission("storage.profile_documents.read"),
  async (req, res, next) => {
    try {
      const input = readUrlSchema.parse(req.body);
      const result = await createProfileDocumentReadUrl({ actor: req.user!, ...input });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);
