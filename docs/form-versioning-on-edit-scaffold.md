# Form Versioning On Edit Scaffold

Module: Forms  
Priority: P2 High value  
Sprint: S6

## 1. Data Model And Migrations

Migration: `db/migrations/039_form_versioning_on_edit.sql`

The scaffold extends `public.form_template_versions` with parent version links, version workflow fields, change summary, visibility policy, and review timestamps. Editing a form creates a new draft version instead of mutating the published version.

## 2. API Routes, Validation, And RBAC

Routes are mounted under `/forms/:id/versions`:

- `GET /forms/:id/versions` requires `forms.version_read`
- `POST /forms/:id/versions/edit` requires `forms.version_write`
- `PATCH /forms/:id/versions/:versionId` requires `forms.version_write`
- `POST /forms/:id/versions/:versionId/submit` requires `forms.version_write`
- `POST /forms/:id/versions/:versionId/approve` requires `forms.version_approve`
- `POST /forms/:id/versions/:versionId/publish` requires `forms.version_publish`
- `POST /forms/:id/versions/:versionId/return` requires `forms.version_approve`
- `POST /forms/:id/versions/:versionId/archive` requires `forms.version_write`
- `PATCH /forms/:id/versions/:versionId/visibility` requires `forms.version_write`

## 3. State Machine Config

Package: `packages/form-versioning-workflow`

States:

- `draft_edit`
- `submitted`
- `approved`
- `published`
- `returned`
- `archived`

Each state returns explicit `status`, `owner`, and `nextAction`.

## 4. Frontend Screens/Components

Temporary local screen: `temp-form-versioning.html`

The page supports selecting a template, creating an edit version, updating schema text, submitting, approving, publishing, returning, archiving, and changing visibility policy.

## 5. Audit Log And Notifications Hooks

Actions write immutable audit events:

- `form_version.created`
- `form_version.updated`
- `form_version.submitted`
- `form_version.approved`
- `form_version.published`
- `form_version.returned`
- `form_version.archived`
- `form_version.visibility_changed`

Publishing also calls the existing form notification hook.

## 6. Tests And Seed Data

Tests: `packages/form-versioning-workflow/tests/formVersioningWorkflow.test.mjs`

Seed data creates one draft edit version from the first existing form template.

## Acceptance Criteria Mapping

- Role permissions are enforced through `forms.version_*` route middleware, seeded role permissions, and existing Forms RLS.
- Create, update, submit, approve, return, publish, archive, and visibility changes write audit events.
- State transitions return explicit `status`, `owner`, and `nextAction`.
