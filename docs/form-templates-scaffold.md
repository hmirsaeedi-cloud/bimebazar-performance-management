# Form Templates Scaffold

Module: Forms  
Priority: P1 (Critical)  
Sprint: S2  
Impact: 8/10  
Effort: 4/10  
Score: 12

## 1. Data Model And Migrations

- `public.form_templates` keeps the existing versioned form builder model.
- Template-library metadata adds:
  - `template_key` for stable system template identifiers.
  - `template_category`: `system_default` or `custom`.
  - `is_system_template` for default BimeBazar templates.
  - `source_template_id` for cloned drafts.
- Default templates are represented as ordinary versioned form templates so they can move through the same workflow.

## 2. API Routes, Validation, And RBAC Middleware

- `GET /forms/presets` requires `forms.read`.
- `POST /forms/presets/seed-defaults` requires `forms.create`.
- `POST /forms/presets/:presetKey/clone` requires `forms.create`.
- Existing template routes still enforce `forms.read`, `forms.create`, `forms.update`, `forms.publish`, `forms.return`, and `forms.archive`.
- Preset schemas use the same question validation as manually created templates.

## 3. State Machine Config

State remains in `packages/form-builder-workflow`:

- `draft`: owner `HR_ADMIN`, nextAction `publish`.
- `published`: owner `HRBP`, nextAction `return_to_draft`.
- `archived`: owner `SYSTEM`, nextAction `null`.

System presets and cloned templates use the same explicit `status`, `owner`, and `nextAction` values.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-form-builder.html`.
- Starter-template buttons clone:
  - Self-assessment
  - Manager evaluation
  - Upward feedback
  - Pulse survey
- Cloned templates are created as editable drafts.

## 5. Audit Log And Notification Hooks

- Seeding default templates writes `form_template.system_seeded`.
- Cloning a preset writes the normal `form_template.created` event through the API service.
- The temporary page writes `form_template.cloned_from_preset`.
- Existing update, publish, return, archive, and visibility-change audit hooks remain.
- `notifyFormTemplateChanged` remains the notification hook for downstream delivery.

## 6. Tests And Seed Data

- `db/seeds/form_templates_seed.json` lists the default template catalog.
- Existing form-builder workflow tests cover state shape and transitions.

## Acceptance Criteria Mapping

- Role permissions are enforced for every Forms template route and action.
- Create, update, publish, return, archive, preset seed, clone, and visibility changes write audit events.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
