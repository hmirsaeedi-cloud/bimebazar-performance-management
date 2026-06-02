# HRBP Aggregated Reports & Analytics Scaffold

Module: Reports  
Sprint: S7  
Priority: P3

## 1. Data Model and Migrations

- Migration: `db/migrations/045_hrbp_aggregated_reports_analytics.sql`
- Table: `hrbp_report_snapshots`
- Stores report filters, metrics, insights, workflow state, export format, and review timestamps.

Snapshots make HRBP analytics reproducible and auditable instead of recalculating silently.

## 2. API Routes, Validation, and RBAC

- Router: `apps/api/src/reports/reports.routes.ts`
- Service: `apps/api/src/reports/reports.service.ts`
- Schemas: `apps/api/src/reports/reports.schemas.ts`

Permissions:

- `reports.read`
- `reports.create`
- `reports.generate`
- `reports.submit`
- `reports.approve`
- `reports.return`
- `reports.override`
- `reports.export`
- `reports.archive`

HRBP can create, generate, submit, read, and export. HR Admin can review, return, override, export, and archive.

## 3. State Machine Config

Workflow package: `@bimebazar/reports-workflow`

States:

- `draft`
- `generated`
- `submitted`
- `reviewed`
- `returned`
- `visibility_approved`
- `exported`
- `archived`

Each state exposes explicit `status`, `owner`, and `nextAction`.

## 4. Frontend Screens and Components

- Page: `temp-hrbp-reports.html`
- Shows KPI summary, report snapshots, insights, and workflow actions.

Aggregates include active employees, evaluation completion, visible average score, PIP/promotion flags, feedback requests, PD Chat logs, and career cases.

## 5. Audit Log and Notifications Hooks

Audit actions:

- `reports.created`
- `reports.generated`
- `reports.submitted`
- `reports.approved`
- `reports.returned`
- `reports.visibility_changed`
- `reports.exported`
- `reports.archived`

Notification hook:

- `notifyReportChanged`

## 6. Tests and Seed Data

- Workflow tests cover state completeness, generation-to-export flow, return ownership, and metric rate calculations.
- Migration seeds one generated HRBP analytics snapshot.
