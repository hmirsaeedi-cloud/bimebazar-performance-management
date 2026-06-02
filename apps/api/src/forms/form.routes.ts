import { Router } from "express";
import { requirePermission } from "../middleware/rbac.js";
import {
  archiveFormTemplateSchema,
  clonePresetSchema,
  createFormVersionEditSchema,
  createFormTemplateSchema,
  formVersionDecisionSchema,
  formVersionVisibilitySchema,
  listFormTemplatesQuerySchema,
  returnFormTemplateSchema,
  updateFormVersionEditSchema,
  updateFormTemplateSchema,
} from "./form.schemas.js";
import {
  archiveFormTemplate,
  archiveFormVersionEdit,
  approveFormVersionEdit,
  cloneFormTemplatePreset,
  createFormTemplate,
  createFormVersionEdit,
  getFormTemplate,
  listFormVersionEdits,
  listFormTemplatePresets,
  listFormTemplates,
  publishFormVersionEdit,
  publishFormTemplate,
  returnFormVersionEdit,
  returnFormTemplateToDraft,
  seedDefaultFormTemplates,
  submitFormVersionEdit,
  updateFormVersionEdit,
  updateFormTemplate,
  updateFormVersionVisibility,
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

formRouter.get("/presets", requirePermission("forms.read"), async (_req, res, next) => {
  try {
    res.json({ presets: listFormTemplatePresets() });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/presets/seed-defaults", requirePermission("forms.create"), async (req, res, next) => {
  try {
    res.status(201).json({ templates: await seedDefaultFormTemplates({ actor: req.user! }) });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/presets/:presetKey/clone", requirePermission("forms.create"), async (req, res, next) => {
  try {
    const input = clonePresetSchema.parse(req.body);
    res.status(201).json({
      template: await cloneFormTemplatePreset({
        actor: req.user!,
        presetKey: req.params.presetKey,
        ...input,
      }),
    });
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

formRouter.get("/:id/versions", requirePermission("forms.version_read"), async (req, res, next) => {
  try {
    res.json({ versions: await listFormVersionEdits({ templateId: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/:id/versions/edit", requirePermission("forms.version_write"), async (req, res, next) => {
  try {
    const input = createFormVersionEditSchema.parse(req.body);
    res.status(201).json({ version: await createFormVersionEdit({ actor: req.user!, templateId: req.params.id, ...input }) });
  } catch (error) {
    next(error);
  }
});

formRouter.patch("/:id/versions/:versionId", requirePermission("forms.version_write"), async (req, res, next) => {
  try {
    const input = updateFormVersionEditSchema.parse(req.body);
    res.json({ version: await updateFormVersionEdit({ actor: req.user!, templateId: req.params.id, versionId: req.params.versionId, ...input }) });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/:id/versions/:versionId/submit", requirePermission("forms.version_write"), async (req, res, next) => {
  try {
    res.json({ version: await submitFormVersionEdit({ actor: req.user!, templateId: req.params.id, versionId: req.params.versionId }) });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/:id/versions/:versionId/approve", requirePermission("forms.version_approve"), async (req, res, next) => {
  try {
    res.json({ version: await approveFormVersionEdit({ actor: req.user!, templateId: req.params.id, versionId: req.params.versionId }) });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/:id/versions/:versionId/publish", requirePermission("forms.version_publish"), async (req, res, next) => {
  try {
    res.json({ template: await publishFormVersionEdit({ actor: req.user!, templateId: req.params.id, versionId: req.params.versionId }) });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/:id/versions/:versionId/return", requirePermission("forms.version_approve"), async (req, res, next) => {
  try {
    const input = formVersionDecisionSchema.parse(req.body);
    res.json({ version: await returnFormVersionEdit({ actor: req.user!, templateId: req.params.id, versionId: req.params.versionId, reason: input.reason ?? "Returned for revision" }) });
  } catch (error) {
    next(error);
  }
});

formRouter.post("/:id/versions/:versionId/archive", requirePermission("forms.version_write"), async (req, res, next) => {
  try {
    res.json({ version: await archiveFormVersionEdit({ actor: req.user!, templateId: req.params.id, versionId: req.params.versionId }) });
  } catch (error) {
    next(error);
  }
});

formRouter.patch("/:id/versions/:versionId/visibility", requirePermission("forms.version_write"), async (req, res, next) => {
  try {
    const input = formVersionVisibilitySchema.parse(req.body);
    res.json({ version: await updateFormVersionVisibility({ actor: req.user!, templateId: req.params.id, versionId: req.params.versionId, visibilityPolicy: input.visibilityPolicy }) });
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

formRouter.post("/:id/return", requirePermission("forms.return"), async (req, res, next) => {
  try {
    const input = returnFormTemplateSchema.parse(req.body);
    res.json({ template: await returnFormTemplateToDraft({ actor: req.user!, id: req.params.id, reason: input.reason }) });
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
