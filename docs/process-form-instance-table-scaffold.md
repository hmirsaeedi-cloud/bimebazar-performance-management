# Process Detail Form Instance Table Scaffold

Module: Process  
Priority: P2 High value  
Sprint: S5

## 1. Data Model And Migrations

Migration: `db/migrations/033_process_form_instance_table.sql`

The scaffold adds `public.process_form_instances`, one row per process participant and locked form version. Each row stores:

- `process_id`, `participant_id`, `employee_id`, `manager_id`
- `form_template_id`
- `form_template_version_id`
- `locked_form_version_number`
- `locked_form_schema`
- `response_payload`

This preserves the in-flight form version even when templates are edited later.

## 2. API Routes, Validation, And RBAC

Routes are mounted on the existing Process API:

- `GET /processes/:id/form-instances` requires `process.read`
- `POST /processes/:id/form-instances/sync` requires `process.configure`
- `PATCH /processes/form-instances/:formInstanceId` requires `process.submit`
- `POST /processes/form-instances/:formInstanceId/submit` requires `process.submit`
- `POST /processes/form-instances/:formInstanceId/approve` requires `process.approve`
- `POST /processes/form-instances/:formInstanceId/return` requires `process.return`
- `POST /processes/form-instances/:formInstanceId/close` requires `process.complete`
- `PATCH /processes/form-instances/:formInstanceId/visibility` requires `process.override`

Validation lives in `apps/api/src/processes/process.schemas.ts`. Service logic lives in `apps/api/src/processes/process.service.ts`.

## 3. State Machine Config

Package: `packages/process-form-instance-workflow`

States are explicit:

- `assigned`
- `in_progress`
- `submitted`
- `approved`
- `returned`
- `closed`

Every transition returns `status`, `owner`, and `nextAction`.

## 4. Frontend Screens/Components

Temporary local screen: `temp-process-form-instances.html`

The page lets HR/Admin select a process, inspect locked form metadata, sync participant form-instance rows, and move rows through update, submit, approve, return, close, and visibility actions.

## 5. Audit Log And Notifications Hooks

Actions write immutable audit events:

- `process.form_instances.created`
- `process.form_instance.updated`
- `process.form_instance.submitted`
- `process.form_instance.approved`
- `process.form_instance.returned`
- `process.form_instance.closed`
- `process.form_instance.visibility_changed`

The API calls `notifyProcessFormInstanceChanged(...)` as the notification hook.

## 6. Tests And Seed Data

Tests: `packages/process-form-instance-workflow/tests/processFormInstanceWorkflow.test.mjs`

The migration seeds instances for existing configured participants when the process already has a locked form version.

## Acceptance Criteria Mapping

- Role permissions are enforced through existing `process.*` permissions, route middleware, and RLS.
- Create, update, submit, approve, return, close, and visibility changes write audit events.
- State transitions are explicit `status`, `owner`, and `nextAction`.
- Sync refuses zero eligible participants.
- Each row stores `form_template_version_id`, `locked_form_version_number`, and `locked_form_schema` so in-flight processes keep their selected form version after template edits.
