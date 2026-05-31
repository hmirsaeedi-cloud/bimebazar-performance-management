# Employee Export Report Scaffold

Module: Profiles  
Priority: P1 (Critical)  
Sprint: S2  
Impact: 7/10  
Effort: 3/10  
Score: 11

## 1. Data Model And Migrations

- `public.employee_export_reports` tracks export requests and generated report metadata.
- Export reports store:
  - `status`
  - `owner_role`
  - `next_action`
  - `filters`
  - `columns`
  - `row_count`
  - `file_name`
  - `requested_by`
  - `generated_at`
  - `expires_at`
- `profiles.export` controls report generation.

## 2. API Routes, Validation, And RBAC Middleware

- `POST /profiles/exports` requires `profiles.export`.
- Request validation reuses profile list filters:
  - Search
  - Business unit
  - Department
  - Team
  - Status
  - Level
- Column selection is allowlisted to avoid accidental exposure of sensitive fields.
- The route returns a CSV attachment and stores the export report audit metadata.

## 3. State Machine Config

Export state lives in `packages/profile-export-workflow`:

- `requested`: owner `HR_ADMIN`, nextAction `generate`.
- `generating`: owner `SYSTEM`, nextAction `null`.
- `ready`: owner `HR_ADMIN`, nextAction `null`.
- `failed`: owner `HR_ADMIN`, nextAction `generate`.
- `cancelled`: owner `SYSTEM`, nextAction `null`.

Every state returns explicit `status`, `owner`, and `nextAction`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-employee-export.html`.
- The page supports search/status/level filters and downloads a CSV file.
- The all-pages launcher and Profiles nav link to the export page.

## 5. Audit Log And Notification Hooks

- Export requests write `profile_export.requested`.
- Generated exports write `profile_export.generated`.
- Audit metadata includes filters, selected columns, row count, and file name.
- `notifyEmployeeExportReady` is the notification hook for later delivery.

## 6. Tests And Seed Data

- `packages/profile-export-workflow` tests state shape, generation, failure routing, and invalid transitions.
- Existing profile seed data can be exported through the temporary local page.

## Acceptance Criteria Mapping

- Role permissions are enforced through `profiles.export`.
- Export request and generation both write audit events.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
