# HRIS API Integration Scaffold

Sprint 10 adds an HRIS API integration scaffold for connecting external employee systems to BimeBazar Performance Management.

## Data Model And Migration

- Migration: `db/migrations/052_hris_api_integration.sql`
- Tables:
  - `hris_integrations`
  - `hris_sync_runs`

The integration stores provider, base URL, auth mode, field mapping, visibility, last preview, and sync summary. Secrets are intentionally not stored in the browser scaffold; production should store API credentials in server-only secret storage.

## API, Validation, And RBAC

Core routes added:

- `GET /core/hris`
- `POST /core/hris`
- `GET /core/hris/:id`
- `PATCH /core/hris/:id`
- `POST /core/hris/:id/preview`
- `POST /core/hris/:id/submit`
- `POST /core/hris/:id/approve`
- `POST /core/hris/:id/activate`
- `POST /core/hris/:id/sync/start`
- `POST /core/hris/:id/sync/complete`
- `POST /core/hris/:id/sync/fail`
- `POST /core/hris/:id/return`
- `PATCH /core/hris/:id/visibility`
- `POST /core/hris/:id/archive`

Permissions:

- `core.hris.read`
- `core.hris.create`
- `core.hris.update`
- `core.hris.submit`
- `core.hris.approve`
- `core.hris.return`
- `core.hris.override`
- `core.hris.sync`
- `core.hris.archive`

## State Machine

Package: `@bimebazar/hris-integration-workflow`

Every state returns:

- `status`
- `owner`
- `nextAction`

Main path:

`draft -> submitted -> approved -> active -> sync_running -> sync_completed`

Control paths:

- failed sync
- returned for revision
- visibility override
- archive

## Frontend Scaffold

Local page:

- `temp-hris-integration.html`

The page can create a connection, preview records, submit/approve/activate the integration, and simulate sync completion or failure.

## Audit And Notifications

Audit action names:

- `core.hris.created`
- `core.hris.updated`
- `core.hris.previewed`
- `core.hris.submitted`
- `core.hris.approved`
- `core.hris.activated`
- `core.hris.sync_started`
- `core.hris.sync_completed`
- `core.hris.sync_failed`
- `core.hris.returned`
- `core.hris.visibility_changed`
- `core.hris.archived`

Notification hook:

- `notifyHrisIntegrationChanged`

## Tests And Seed Data

Tests cover:

- state shape
- submit/approve/activate/sync
- failed sync ownership
- visibility override
- sync preview validation for missing email and external employee ID

Seed data creates one draft custom HRIS sandbox integration.
