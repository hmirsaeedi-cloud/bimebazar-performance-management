# Bulk Employee Import Via Excel Scaffold

Module: Profiles  
Priority: P1 (Critical)  
Sprint: S2  
Impact: 9/10  
Effort: 5/10  
Score: 13

## 1. Data Model And Migrations

- `public.employee_import_runs` tracks one uploaded file/import attempt.
- `public.employee_import_rows` tracks validation and creation result per row.
- Import rows keep both `raw_data` and `normalized_data` for auditability.
- Import statuses:
  - `uploaded`
  - `validating`
  - `validated`
  - `failed_validation`
  - `processing`
  - `completed`
  - `completed_with_errors`
  - `cancelled`

## 2. API Routes, Validation, And RBAC Middleware

- `GET /profiles/employee-imports` requires `profiles.import_read`.
- `POST /profiles/employee-imports/preview` requires `profiles.bulk_import`.
- `POST /profiles/employee-imports/process` requires `profiles.bulk_import`.
- Validation checks:
  - Required employee identity fields.
  - Jalali or Gregorian join date.
  - Existing business unit, department, and team.
  - Existing manager email when provided.
  - Duplicate emails and employee IDs, both in the database and within the import file.

## 3. State Machine Config

State lives in `packages/bulk-import-workflow`:

- `uploaded`: owner `HR_ADMIN`, nextAction `validate`.
- `validating`: owner `SYSTEM`, nextAction `null`.
- `validated`: owner `HR_ADMIN`, nextAction `process`.
- `failed_validation`: owner `HR_ADMIN`, nextAction `fix_rows`.
- `processing`: owner `SYSTEM`, nextAction `null`.
- `completed`: owner `SYSTEM`, nextAction `null`.
- `completed_with_errors`: owner `HR_ADMIN`, nextAction `fix_rows`.
- `cancelled`: owner `SYSTEM`, nextAction `null`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-bulk-import.html`.
- Template file: `/employee-import-template.csv`, which opens cleanly in Excel.
- The temporary page supports paste-from-Excel CSV, preview validation, and direct import into Supabase.

## 5. Audit Log And Notifications Hooks

- Import run status changes write audit events.
- Each created employee writes `profile.created_from_bulk_import`.
- Later notification delivery can trigger from completed imports and generated temporary passwords.

## 6. Tests And Seed Data

- `packages/bulk-import-workflow` tests the import lifecycle, validation failure ownership, and invalid transitions.
- The CSV template includes one example row using the default org-unit seed data.

## Acceptance Criteria Mapping

- Role permissions are enforced for every bulk import route and action.
- Import run creation, validation result, processing result, and employee creation write audit events.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
