# MPA Auto-attach To Evaluation Scaffold

Module: MPA  
Priority: P1 (Critical)  
Sprint: S3  
Impact: 8/10  
Effort: 4/10  
Score: 12

## 1. Data Model And Migrations

- `public.mpa_evaluation_attachments` stores the link between an MPA and an evaluation task.
- Supported evaluation types are `downward_evaluation` and `self_assessment`.
- `process_downward_evaluations.attached_mpa_id` and `process_self_assessments.attached_mpa_id` provide direct lookup from evaluation screens.
- `unique (evaluation_type, evaluation_id)` prevents multiple active attachment rows for the same evaluation.
- The existing `mpas(employee_id, cycle_id) where status <> 'archived'` guard still prevents a second non-archived MPA for the same employee and cycle.

## 2. API Routes, Validation, And RBAC Middleware

- `POST /mpas/attachments/auto` requires `mpa.attach`.
- Request body includes `employeeId`, optional `processId`, optional `cycleId`, `evaluationType`, and `evaluationId`.
- `mpa.attach` is granted to `MANAGER`, `HRBP`, and `HR_ADMIN`.

## 3. State Machine Config

State lives in `packages/mpa-attachment-workflow`:

- `matched`: owner `SYSTEM`, nextAction `auto_attach`.
- `attached`: owner `SYSTEM`, nextAction `null`.
- `missing_mpa`: owner `MANAGER`, nextAction `override_attach`.
- `detached`: owner `MANAGER`, nextAction `override_attach`.

## 4. Frontend Screens And Components

- `/temp-downward-routing.html` auto-attaches an MPA after a downward evaluation task starts.
- The evaluation table shows the attached MPA title/status or “No MPA attached.”
- Missing matches are shown as `missing_mpa` so managers know an override or MPA creation is needed.

## 5. Audit Log And Notifications Hooks

- `mpa.auto_attached_to_evaluation` is written when a matching non-archived MPA is found.
- `mpa.auto_attach_missing` is written when no eligible MPA exists.
- Audit metadata includes `mpaId`, `processId`, `cycleId`, `evaluationType`, `evaluationId`, `owner`, `nextAction`, and `matchStrategy`.
- `notifyMpaAttachmentChanged` is the notification hook for attachment outcomes.

## 6. Tests And Seed Data

- `packages/mpa-attachment-workflow` tests state shape, auto-attach, missing MPA routing, override attach, and invalid detach.
- Seed flow: create/activate an MPA, create/start a downward process, then start a downward evaluation task. The page will attach the employee’s latest non-archived MPA.

## Acceptance Criteria Mapping

- Role permissions are enforced for the MPA attachment route/action.
- Auto-attach and missing-match outcomes write audit events.
- Attachment transitions use explicit `status`, `owner`, and `nextAction`.
- The existing MPA uniqueness guard still prevents duplicate non-archived MPAs for the same employee/cycle.
