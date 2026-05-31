# MPA Employee Approval Workflow Scaffold

Module: MPA  
Priority: P1 (Critical)  
Sprint: S3  
Impact: 9/10  
Effort: 4/10  
Score: 14

## 1. Data Model And Migrations

- `public.mpa_cycles` defines the performance agreement cycle window.
- `public.mpas` stores employee agreement content, owner role, workflow status, and timestamps for each approval step.
- `content_format` and `content_plain_text` support rich-text MPA authoring while preserving a searchable plain-text copy.
- `public.mpa_content_revisions` stores immutable content snapshots for draft creation and updates.
- `approval_visibility` controls whether employee-facing views can see manager/HRBP content.
- `last_return_reason` stores the latest reason when an MPA is sent back.
- `public.mpa_evaluation_attachments` links MPAs to evaluation tasks and records whether auto-attach succeeded or needs manager override.
- A partial unique index prevents a second non-archived MPA for the same employee and cycle. The API also checks this before insert so users get a readable message instead of a database error.

## 2. API Routes, Validation, And RBAC Middleware

- `GET /mpas/cycles` requires `mpa.read`.
- `POST /mpas/cycles` requires `mpa.create`.
- `GET /mpas` and `GET /mpas/:id` require `mpa.read`.
- `POST /mpas` requires `mpa.create`.
- `PATCH /mpas/:id` requires `mpa.update`.
- Workflow routes enforce dedicated permissions:
  - `POST /mpas/:id/submit`
  - `POST /mpas/:id/employee-approve`
  - `POST /mpas/:id/manager-approve`
  - `POST /mpas/:id/activate`
  - `POST /mpas/:id/return`
  - `POST /mpas/:id/archive`
- `POST /mpas/attachments/auto` requires `mpa.attach`.

## 3. State Machine Config

State lives in `packages/mpa-workflow`:

- `draft`: owner `MANAGER`, nextAction `submit`.
- `submitted`: owner `EMPLOYEE`, nextAction `employee_approve`.
- `returned`: owner `MANAGER`, nextAction `submit`.
- `employee_approved`: owner `MANAGER`, nextAction `manager_approve`.
- `manager_approved`: owner `HRBP`, nextAction `hrbp_activate`.
- `active`: owner `SYSTEM`, nextAction `null`.
- `archived`: owner `SYSTEM`, nextAction `null`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-mpa.html`.
- It can create an MPA cycle, create a rich-text draft MPA, and move it through submit, employee approve, manager approve, activate, return, and archive actions.
- The rich-text editor supports bold, italic, underline, and lists, and saves both HTML and plain text into Supabase.
- The page blocks duplicate active/non-archived MPAs for the same employee and cycle before save.
- Activating an MPA flips employee visibility for manager content and writes a dedicated visibility audit event.
- `/temp-downward-routing.html` auto-attaches the latest non-archived employee MPA to the evaluation task and shows the attachment result.

## 5. Audit Log And Notifications Hooks

- API service writes audit events for cycle create, MPA create/update, submit, approve, return, activate, and archive.
- Audit metadata includes `owner`, `nextAction`, `cycleId`, and `contentFormat` when rich text is created or updated.
- `mpa.visibility_changed` is written whenever approval visibility changes.
- `mpa.auto_attached_to_evaluation` and `mpa.auto_attach_missing` audit automatic evaluation attachment outcomes.
- `notifyMpaChanged` is the notification hook for create, update, submit, approve, return, activate, archive, and visibility changes.
- `notifyMpaAttachmentChanged` is the notification hook for evaluation attachment outcomes.

## 6. Tests And Seed Data

- `packages/mpa-workflow` tests state shape, the full employee approval chain, return behavior, and invalid transitions.
- `packages/rich-text-utils` tests rich-text normalization, plain-text extraction, and unsafe HTML stripping.
- The temporary local page can create seed cycles and MPAs through Supabase.

## Acceptance Criteria Mapping

- Role permissions are enforced for every MPA route and action.
- Every create, update, submit, approve, return, override/archive, and visibility-sensitive change writes an audit event.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
- A second non-archived MPA for the same employee and cycle is blocked until the existing MPA is archived.
