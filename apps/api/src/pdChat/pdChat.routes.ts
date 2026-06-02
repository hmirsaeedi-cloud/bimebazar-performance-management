import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createPdChatSchema,
  listPdChatsQuerySchema,
  pdChatAttachmentSchema,
  pdChatMessageSchema,
  pdChatReturnSchema,
  pdChatVisibilitySchema,
} from "./pdChat.schemas.js";
import {
  approvePdChat,
  archivePdChat,
  autoAttachPdChatToEvaluation,
  createPdChat,
  getPdChat,
  listPdChats,
  returnPdChat,
  submitPdChat,
  updatePdChat,
  updatePdChatVisibility,
} from "./pdChat.service.js";

export const pdChatRouter = Router();

pdChatRouter.get("/", requirePermission("pd_chat.read"), async (req, res, next) => {
  try {
    const query = listPdChatsQuerySchema.parse(req.query);
    res.json({ chats: await listPdChats(query) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/", requirePermission("pd_chat.create"), async (req, res, next) => {
  try {
    const input = createPdChatSchema.parse(req.body);
    res.status(201).json({ chat: await createPdChat({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/attachments/auto", requirePermission("pd_chat.attach"), async (req, res, next) => {
  try {
    const input = pdChatAttachmentSchema.parse(req.body);
    res.status(201).json({ attachment: await autoAttachPdChatToEvaluation({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.get("/:id", requirePermission("pd_chat.read"), async (req, res, next) => {
  try {
    res.json({ chat: await getPdChat(req.params.id) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.patch("/:id", requirePermission("pd_chat.update"), async (req, res, next) => {
  try {
    const input = pdChatMessageSchema.parse(req.body);
    res.json({ chat: await updatePdChat({ actor: req.user!, id: req.params.id, message: input.message }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/:id/submit", requirePermission("pd_chat.submit"), async (req, res, next) => {
  try {
    res.json({ chat: await submitPdChat({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/:id/approve", requirePermission("pd_chat.approve"), async (req, res, next) => {
  try {
    res.json({ chat: await approvePdChat({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/:id/return", requirePermission("pd_chat.return"), async (req, res, next) => {
  try {
    const input = pdChatReturnSchema.parse(req.body);
    res.json({ chat: await returnPdChat({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.patch("/:id/visibility", requirePermission("pd_chat.override"), async (req, res, next) => {
  try {
    const input = pdChatVisibilitySchema.parse(req.body);
    res.json({ chat: await updatePdChatVisibility({ actor: req.user!, id: req.params.id, visibility: input.visibility }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/:id/archive", requirePermission("pd_chat.archive"), async (req, res, next) => {
  try {
    res.json({ chat: await archivePdChat({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});
