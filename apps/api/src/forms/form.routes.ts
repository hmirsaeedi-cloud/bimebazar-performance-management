import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  archiveFormTemplateSchema,
  createFormTemplateSchema,
  listFormTemplatesQuerySchema,
  updateFormTemplateSchema,
} from "./form.schemas.js";
import {
  archiveFormTemplate,
  createFormTemplate,
  getFormTemplate,
  listFormTemplates,
  publishFormTemplate,
  updateFormTemplate,
} from "./form.service.js";

export const formRouter = Router();

formRouter.get("/", requirePermission("forms.read"), async (req, res, next) => {
  try {
    const query = listFormTemplatesQuerySchema.parse(req.query);
    res.json({ templates: await listFormTemplates(query) });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/", requirePermission("forms.create"), async (req, res, next) => {
  try {
    const input = createFormTemplateSchema.parse(req.body);
    const template = await createFormTemplate({ actor: req.user!, ...input });
    res.status(201).json({ template });
  } catch (error) {
    next(error);
  }
});

formRouter.get("/:id", requirePermission("forms.read"), async (req, res, next) => {
  try {
    res.json({ template: await getFormTemplate(req.params.id) });
  } catch (error) {
    next(error);
  }
});

formRouter.patch("/:id", requirePermission("forms.update"), async (req, res, next) => {
  try {
    const patch = updateFormTemplateSchema.parse(req.body);
    const template = await updateFormTemplate({ actor: req.user!, id: req.params.id, patch });
    res.json({ template });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/:id/publish", requirePermission("forms.publish"), async (req, res, next) => {
  try {
    res.json({ template: await publishFormTemplate({ actor: req.user!, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/:id/archive", requirePermission("forms.archive"), async (req, res, next) => {
  try {
    const input = archiveFormTemplateSchema.parse(req.body);
    res.json({ template: await archiveFormTemplate({ actor: req.user!, id: req.params.id, reason: input.reason }) });
  } catch (error) {
    next(error);
  }
});
