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
- A partial unique index prevents a second non-archived MPA for the same employee and cycle.

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
- It can create an MPA cycle, create a draft MPA, and move it through submit, employee approve, manager approve, activate, return, and archive actions.

## 5. Audit Log And Notifications Hooks

- API service writes audit events for cycle create, MPA create/update, submit, approve, return, activate, and archive.
- Audit metadata includes `owner`, `nextAction`, and `cycleId`.
- Notification hooks can later trigger on `mpa.submitted`, `mpa.employee_approve`, and `mpa.manager_approve`.

## 6. Tests And Seed Data

- `packages/mpa-workflow` tests state shape, the full employee approval chain, return behavior, and invalid transitions.
- The temporary local page can create seed cycles and MPAs through Supabase.

## Acceptance Criteria Mapping

- Role permissions are enforced for every MPA route and action.
- Every create, update, submit, approve, return, override/archive, and visibility-sensitive change writes an audit event.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
