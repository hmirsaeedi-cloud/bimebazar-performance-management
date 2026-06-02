# Admin Form Movement With Audit Reason Scaffold

Sprint: S8  
Module: Process  
Priority: P3 Moderate

## 1. Data Model and Migrations

- Adds admin movement fields to `process_form_instances`:
  - `admin_moved_at`
  - `admin_moved_by`
  - `admin_move_reason`
  - `admin_move_from_status`
  - `admin_move_to_status`
- Adds `process.admin_move` permission.
- Assigns `process.admin_move` to `HR_ADMIN`.
- Keeps the original `form_template_version_id`, `locked_form_version_number`, and `locked_form_schema` unchanged so in-flight processes remain tied to their selected form version.

## 2. API Routes, Validation, and RBAC Middleware

- Adds `POST /processes/form-instances/:formInstanceId/admin-move`.
- Requires `process.admin_move`.
- Validates:
  - target status is one of `assigned`, `in_progress`, `submitted`, `approved`, `returned`, or `closed`
  - audit reason is required and at least 12 characters

## 3. State Machine Config

- Adds `ADMIN_MOVE` action to the process form instance workflow.
- Admin movement always resolves to an explicit state shape:
  - `status`
  - `owner`
  - `nextAction`
- Supported target states:
  - `assigned`: owner `EMPLOYEE`, next action `update`
  - `in_progress`: owner `EMPLOYEE`, next action `submit`
  - `submitted`: owner `MANAGER`, next action `approve`
  - `approved`: owner `HRBP`, next action `close`
  - `returned`: owner `EMPLOYEE`, next action `update`
  - `closed`: owner `SYSTEM`, next action `null`

## 4. Frontend Screens and Components

- Refines `temp-process-form-instances.html`.
- Adds an Admin move action on every form instance row.
- Admin can choose a target status and must enter a reason before the move is saved.
- The table now shows latest admin movement from/to status and reason.

## 5. Audit Log and Notification Hooks

- Writes immutable audit action `process.form_instance.admin_moved`.
- Stores the audit reason in the audit event `reason` column and metadata.
- Stores movement fields on the form instance for fast table review.
- Calls the process form instance notification hook with `admin_moved`.

## 6. Tests and Seed Data

- Adds workflow tests for valid and invalid admin movement.
- Migration seeds one existing process form instance with a placeholder admin movement note, only when one exists.

## Acceptance Criteria Coverage

- RBAC enforced by `process.admin_move`.
- Admin movement writes immutable audit event with reason.
- Every moved target state has explicit `status`, `owner`, and `nextAction`.
- Existing process eligibility and locked form version behavior remain unchanged.
