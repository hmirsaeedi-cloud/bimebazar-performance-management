# Form Builder - All Question Types Scaffold

Module: Forms  
Priority: P1 (Critical)  
Sprint: S2  
Impact: 10/10  
Effort: 6/10  
Score: 14

## 1. Data Model And Migrations

- `public.form_templates` stores the template identity, module, workflow status, owner role, and current version pointer.
- `public.form_template_versions` stores immutable version numbers and the full JSON form schema.
- Supported question types:
  - `short_text`
  - `long_text`
  - `rich_text`
  - `number`
  - `scale`
  - `single_select`
  - `multi_select`
  - `date`
  - `boolean`
  - `file`
  - `employee_reference`
  - `section_heading`

## 2. API Routes, Validation, And RBAC Middleware

- `GET /forms` requires `forms.read`.
- `POST /forms` requires `forms.create`.
- `GET /forms/:id` requires `forms.read`.
- `PATCH /forms/:id` requires `forms.update`.
- `POST /forms/:id/publish` requires `forms.publish`.
- `POST /forms/:id/return` requires `forms.return`.
- `POST /forms/:id/archive` requires `forms.archive`.
- Zod validation enforces required labels, unique section/question/option IDs, select options, scale min/max values, number ranges, file MIME constraints, section structure, and visibility rule references.

## 3. State Machine Config

State lives in `packages/form-builder-workflow`:

- `draft`: owner `HR_ADMIN`, nextAction `publish`.
- `published`: owner `HRBP`, nextAction `return_to_draft`.
- `archived`: owner `SYSTEM`, nextAction `null`.
- Returning a published template creates a new draft version from the current published schema.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-form-builder.html`.
- It creates a draft template containing every supported question type.
- It can publish the draft version and writes an audit event.
- Question schema supports conditional visibility rules for future process-specific display logic.

## 5. Audit Log And Notifications Hooks

- API service writes audit events for create, update, publish, return, and archive.
- Visibility rule changes also write `form_template.visibility_changed`.
- Audit metadata includes `owner`, `nextAction`, current version, and question count where relevant.
- `notifyFormTemplateChanged` can later trigger in-app or email notifications.

## 6. Tests And Seed Data

- `packages/form-builder-workflow` tests state shape, publish, return-to-draft, and invalid transitions.
- Seed page creates a practical all-question-types template through the temporary local UI.

## Acceptance Criteria Mapping

- Role permissions are enforced for every Forms route and action through `requirePermission`.
- Every create, update, publish, return, archive, and visibility change writes an audit event.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
