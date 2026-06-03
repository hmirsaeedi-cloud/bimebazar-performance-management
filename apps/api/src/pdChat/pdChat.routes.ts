import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  createPdChatSchema,
  createPdChatScheduleSchema,
  listPdChatSchedulesQuerySchema,
  listPdChatsQuerySchema,
  pdChatAttachmentSchema,
  pdChatMessageSchema,
  pdChatReturnSchema,
  pdChatScheduleReturnSchema,
  pdChatScheduleVisibilitySchema,
  pdChatVisibilitySchema,
  updatePdChatScheduleSchema,
} from "./pdChat.schemas.js";
import {
  activatePdChatSchedule,
  approvePdChat,
  approvePdChatSchedule,
  archivePdChat,
  archivePdChatSchedule,
  autoAttachPdChatToEvaluation,
  createPdChat,
  createPdChatSchedule,
  generatePdChatOccurrence,
  getPdChat,
  getPdChatSchedule,
  listPdChatSchedules,
  listPdChats,
  pausePdChatSchedule,
  returnPdChat,
  returnPdChatSchedule,
  resumePdChatSchedule,
  submitPdChat,
  submitPdChatSchedule,
  updatePdChat,
  updatePdChatSchedule,
  updatePdChatScheduleVisibility,
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

pdChatRouter.get("/schedules", requirePermission("pd_chat.scheduler_read"), async (req, res, next) => {
  try {
    const query = listPdChatSchedulesQuerySchema.parse(req.query);
    res.json({ schedules: await listPdChatSchedules(query) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/schedules", requirePermission("pd_chat.scheduler_create"), async (req, res, next) => {
  try {
    const input = createPdChatScheduleSchema.parse(req.body);
    res.status(201).json({ schedule: await createPdChatSchedule({ actor: req.user!, ...input }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.get("/schedules/:id", requirePermission("pd_chat.scheduler_read"), async (req, res, next) => {
  try {
    res.json({ schedule: await getPdChatSchedule(req.params.id) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.patch("/schedules/:id", requirePermission("pd_chat.scheduler_update"), async (req, res, next) => {
  try {
    const patch = updatePdChatScheduleSchema.parse(req.body);
    res.json({ schedule: await updatePdChatSchedule({ actor: req.user!, id: req.params.id, patch }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/schedules/:id/submit", requirePermission("pd_chat.scheduler_submit"), async (req, res, next) => {
  try {
    res.json({ schedule: await submitPdChatSchedule({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/schedules/:id/approve", requirePermission("pd_chat.scheduler_approve"), async (req, res, next) => {
  try {
    res.json({ schedule: await approvePdChatSchedule({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/schedules/:id/activate", requirePermission("pd_chat.scheduler_approve"), async (req, res, next) => {
  try {
    res.json({ schedule: await activatePdChatSchedule({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/schedules/:id/pause", requirePermission("pd_chat.scheduler_update"), async (req, res, next) => {
  try {
    res.json({ schedule: await pausePdChatSchedule({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/schedules/:id/resume", requirePermission("pd_chat.scheduler_update"), async (req, res, next) => {
  try {
    res.json({ schedule: await resumePdChatSchedule({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/schedules/:id/return", requirePermission("pd_chat.scheduler_return"), async (req, res, next) => {
  try {
    const input = pdChatScheduleReturnSchema.parse(req.body);
    res.json({ schedule: await returnPdChatSchedule({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.patch("/schedules/:id/visibility", requirePermission("pd_chat.scheduler_override"), async (req, res, next) => {
  try {
    const input = pdChatScheduleVisibilitySchema.parse(req.body);
    res.json({ schedule: await updatePdChatScheduleVisibility({ actor: req.user!, id: req.params.id, visibility: input.visibility, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/schedules/:id/generate", requirePermission("pd_chat.scheduler_update"), async (req, res, next) => {
  try {
    res.status(201).json(await generatePdChatOccurrence({ actor: req.user!, id: req.params.id }));
  } catch (error) {
    next(error);
  }
});

pdChatRouter.post("/schedules/:id/archive", requirePermission("pd_chat.scheduler_archive"), async (req, res, next) => {
  try {
    res.json({ schedule: await archivePdChatSchedule({ actor: req.user!, id: req.params.id }) });
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
