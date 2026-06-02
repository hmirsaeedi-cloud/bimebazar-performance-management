# Immutable Audit Log Scaffold

Module: Compliance  
Priority: P1 (Critical)  
Sprint: S5  
Impact: 9/10  
Effort: 5/10  
Score: 13

## 1. Data Model And Migrations

- `public.audit_events` is hardened as an append-only log.
- New columns: `immutable_sequence`, `prev_event_hash`, `event_hash`, and `integrity_version`.
- `app_private.set_audit_event_hash()` writes a SHA-256 hash for every new audit row.
- `app_private.prevent_audit_event_mutation()` blocks updates and deletes on audit events.
- `public.audit_export_requests` tracks generated Compliance exports with `status`, `owner_role`, `next_action`, row count, payload hash, and timestamps.
- Local migration: `db/migrations/029_immutable_audit_log.sql`.

## 2. API Routes, Validation, And RBAC Middleware

- `GET /compliance/audit-events` requires `compliance.audit.read`.
- `GET /compliance/audit-events/verify` requires `compliance.audit.verify`.
- `GET /compliance/audit-exports` requires `compliance.audit.export`.
- `POST /compliance/audit-exports` requires `compliance.audit.export`.
- `POST /compliance/audit-exports/:id/verify` requires `compliance.audit.verify`.

## 3. State Machine Config

State lives in `packages/audit-log-workflow`:

- `requested`: owner `HR_ADMIN`, nextAction `generate`.
- `generated`: owner `HR_ADMIN`, nextAction `verify`.
- `verified`: owner `SYSTEM`, nextAction `null`.
- `expired`: owner `SYSTEM`, nextAction `null`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-audit-log.html`.
- The page lists recent audit events, filters by action/entity, shows event hashes, runs an integrity check, generates CSV exports, and verifies exports.

## 5. Audit Log And Notifications Hooks

- Audit verification writes `compliance.audit_integrity_verified`.
- Export generation writes `compliance.audit_export_generated`.
- Export verification writes `compliance.audit_export_verified`.
- `notifyComplianceAuditChanged` is the notification hook for S5/S6 delivery.

## 6. Tests And Seed Data

- Workflow tests cover every status shape, valid export generation/verification, invalid verify-before-generate, event fingerprinting, and hash-chain continuity.
- Migration seeds one `compliance.audit_immutable_enabled` event after immutability is enabled.

## Acceptance Criteria Mapping

- Role permissions are enforced for every Compliance route and action.
- Every create, update, submit, approve, return, override, and visibility change elsewhere continues to write audit events through the existing `writeAuditEvent` service and temporary pages.
- Compliance audit export transitions are explicit `status`, `owner`, and `nextAction` values.
- Audit rows are protected by database triggers that block update and delete.
