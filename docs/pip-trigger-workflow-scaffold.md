# PIP Trigger And Workflow Scaffold

Module: PIP  
Priority: P2 High value  
Sprint: S6

## 1. Data Model And Migrations

Migration: `db/migrations/035_pip_trigger_workflow.sql`

The scaffold adds `public.pip_cases` with employee, manager, HRBP, optional source evaluation, performance concern, success criteria, support plan, checkpoints, visibility, and workflow timestamps.

## 2. API Routes, Validation, And RBAC

Routes are mounted at `/pip`:

- `GET /pip` requires `pip.read`
- `POST /pip` requires `pip.create`
- `PATCH /pip/:id` requires `pip.update`
- `POST /pip/:id/submit` requires `pip.submit`
- `POST /pip/:id/approve` requires `pip.approve`
- `POST /pip/:id/activate-visibility` requires `pip.activate_visibility`
- `POST /pip/:id/start` requires `pip.update`
- `POST /pip/:id/complete` requires `pip.complete`
- `POST /pip/:id/return` requires `pip.return`
- `POST /pip/:id/cancel` requires `pip.cancel`
- `PATCH /pip/:id/visibility` requires `pip.override`

## 3. State Machine Config

Package: `packages/pip-workflow`

States:

- `draft`
- `submitted`
- `hrbp_approved`
- `visibility_active`
- `active`
- `completed`
- `returned`
- `cancelled`

Each state returns explicit `status`, `owner`, `nextAction`, and `employeeVisible`.

## 4. Frontend Screens/Components

Temporary local screen: `temp-pip.html`

The page supports creating a hidden PIP, submitting it to HRBP, approving it, activating employee visibility, starting, completing, returning, cancelling, and overriding visibility.

## 5. Audit Log And Notifications Hooks

Actions write immutable audit events:

- `pip.created`
- `pip.updated`
- `pip.submitted`
- `pip.approved`
- `pip.visibility_activated`
- `pip.visibility_changed`
- `pip.started`
- `pip.completed`
- `pip.returned`
- `pip.cancelled`

The API calls `notifyPipChanged(...)` as the notification hook.

## 6. Tests And Seed Data

Tests: `packages/pip-workflow/tests/pipWorkflow.test.mjs`

Seed data creates one draft PIP case for the first active profile. It is hidden from the employee by default.

## Acceptance Criteria Mapping

- Role permissions are enforced through `pip.*` route middleware, seeded role permissions, and RLS.
- Create, update, submit, approve, return, cancel, override, and visibility changes write audit events.
- State transitions return explicit `status`, `owner`, `nextAction`, and employee visibility.
- PIP content is hidden from employees until HRBP activates visibility.
