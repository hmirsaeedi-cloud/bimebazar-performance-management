# Advanced Analytics (Trends, Cohorts) Scaffold

Module: Reports  
Priority: P4 (Future)  
Sprint: S10

## 1. Data Model And Migrations

- Migration: `db/migrations/058_advanced_analytics_trends_cohorts.sql`
- Table: `advanced_analytics_snapshots`
- Stores trend periods, cohort comparison rows, summary signals, insights, export format, and workflow timestamps.
- New tables include explicit grants and RLS policies for Supabase Data API access.

## 2. API Routes, Validation, And RBAC

- Router: `apps/api/src/reports/reports.routes.ts`
- Service: `apps/api/src/reports/reports.service.ts`
- Schemas: `apps/api/src/reports/reports.schemas.ts`

Routes:

- `GET /reports/advanced` requires `reports.advanced.read`
- `POST /reports/advanced` requires `reports.advanced.create`
- `GET /reports/advanced/:id` requires `reports.advanced.read`
- `POST /reports/advanced/:id/generate` requires `reports.advanced.generate`
- `POST /reports/advanced/:id/submit` requires `reports.advanced.submit`
- `POST /reports/advanced/:id/approve` requires `reports.advanced.approve`
- `POST /reports/advanced/:id/return` requires `reports.advanced.return`
- `PATCH /reports/advanced/:id/visibility` requires `reports.advanced.override`
- `POST /reports/advanced/:id/export` requires `reports.advanced.export`
- `POST /reports/advanced/:id/archive` requires `reports.advanced.archive`

## 3. State Machine Config

Workflow package: `@bimebazar/reports-workflow`

The feature reuses the reports workflow:

- `draft`: owner `HRBP`, nextAction `generate`
- `generated`: owner `HRBP`, nextAction `submit`
- `submitted`: owner `HR_ADMIN`, nextAction `approve`
- `reviewed`: owner `HR_ADMIN`, nextAction `override_visibility`
- `returned`: owner `HRBP`, nextAction `generate`
- `visibility_approved`: owner `HRBP_HR_ADMIN`, nextAction `export`
- `exported`: owner `HRBP_HR_ADMIN`, nextAction `archive`
- `archived`: owner `SYSTEM`, nextAction `null`

## 4. Frontend Screens / Components

- Page: `temp-advanced-analytics.html`
- Shows create controls for title, date range, cohort key, and interval.
- Renders KPI cards, trend bars, cohort rows, and workflow action buttons.
- Linked from the product workspace.

## 5. Audit Log And Notifications Hooks

Audit actions:

- `reports.advanced.created`
- `reports.advanced.generated`
- `reports.advanced.submitted`
- `reports.advanced.approved`
- `reports.advanced.returned`
- `reports.advanced.visibility_changed`
- `reports.advanced.exported`
- `reports.advanced.archived`

Notification hook:

- `notifyReportChanged(...)`

## 6. Tests And Seed Data

- Tests added to `packages/reports-workflow/tests/reportsWorkflow.test.mjs`.
- Coverage includes explicit workflow states, trend series, cohort comparison, and summary deltas.
- Migration seeds one generated advanced analytics snapshot.
