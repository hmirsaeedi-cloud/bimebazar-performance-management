# MPA History And Versioning Scaffold

Module: MPA  
Priority: P2 High value  
Sprint: S6

## 1. Data Model And Migrations

Migration: `db/migrations/037_mpa_history_versioning.sql`

The scaffold adds `public.mpa_history_versions`, a full snapshot table for MPA title, content, content format, plain text, visibility flags, source MPA status, version number, and comparison summary.

The existing partial unique index on `public.mpas(employee_id, cycle_id) where status <> 'archived'` remains the guard that prevents a second active MPA for the same employee and cycle.

## 2. API Routes, Validation, And RBAC

Routes are mounted under `/mpas/:id/history`:

- `GET /mpas/:id/history` requires `mpa.history_read`
- `POST /mpas/:id/history` requires `mpa.history_write`
- `POST /mpas/:id/history/:versionId/review` requires `mpa.history_write`
- `POST /mpas/:id/history/:versionId/return` requires `mpa.history_write`
- `POST /mpas/:id/history/:versionId/archive` requires `mpa.history_write`
- `POST /mpas/:id/history/:versionId/restore` requires `mpa.history_restore`
- `PATCH /mpas/:id/history/:versionId/visibility` requires `mpa.history_write`

## 3. State Machine Config

Package: `packages/mpa-history-workflow`

States:

- `captured`
- `reviewed`
- `restored`
- `returned`
- `archived`

Each state returns explicit `status`, `owner`, and `nextAction`.

## 4. Frontend Screens/Components

Temporary local screen: `temp-mpa-history.html`

The page supports selecting an MPA, capturing a version snapshot, reviewing, returning, archiving, restoring reviewed versions, and changing history visibility.

## 5. Audit Log And Notifications Hooks

Actions write immutable audit events:

- `mpa.history_captured`
- `mpa.history_reviewed`
- `mpa.history_returned`
- `mpa.history_archived`
- `mpa.history_restored`
- `mpa.history_visibility_changed`
- Restore also writes `mpa.updated` because current MPA content changes.

The API calls `notifyMpaHistoryChanged(...)` as the notification hook.

## 6. Tests And Seed Data

Tests: `packages/mpa-history-workflow/tests/mpaHistoryWorkflow.test.mjs`

Seed data creates one captured history snapshot for the first existing MPA.

## Acceptance Criteria Mapping

- Role permissions are enforced through `mpa.history_*` route middleware, seeded role permissions, and RLS.
- Create/capture, update/review, return, restore, archive, and visibility changes write audit events.
- State transitions return explicit `status`, `owner`, and `nextAction`.
- Duplicate active MPA prevention remains enforced by the existing unique index on `mpas`.
