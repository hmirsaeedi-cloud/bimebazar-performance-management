# Downward Process Routing Chain Scaffold

Module: Process  
Priority: P1 (Critical)  
Sprint: S3  
Impact: 10/10  
Effort: 8/10  
Score: 12

## 1. Data Model And Migrations

- `public.performance_processes` remains the campaign-level process record.
- `public.process_participants` stores eligible employees resolved from org filters.
- `public.process_downward_evaluations` stores one routed manager evaluation per process participant.
- Each downward evaluation keeps `status`, `owner_role`, `next_action`, manager responses, reviewer responses, visibility flags, timestamps, return reason, and the locked form schema copied from the configured process.
- `unique (process_id, employee_id)` prevents duplicate downward evaluations for the same employee in one process.

## 2. API Routes, Validation, And RBAC Middleware

- `GET /processes/:id/downward-evaluations` requires `process.read`.
- `POST /processes/:id/participants/:participantId/downward-evaluation/start` requires `process.submit`.
- `PATCH /processes/downward-evaluations/:downwardEvaluationId` requires `process.submit`.
- `POST /processes/downward-evaluations/:downwardEvaluationId/submit` requires `process.submit`.
- `POST /processes/downward-evaluations/:downwardEvaluationId/next-level-approve` requires `process.approve`.
- `POST /processes/downward-evaluations/:downwardEvaluationId/hrbp-approve` requires `process.approve`.
- `POST /processes/downward-evaluations/:downwardEvaluationId/return` requires `process.return`.
- `POST /processes/downward-evaluations/:downwardEvaluationId/complete` requires `process.approve`.
- `PATCH /processes/downward-evaluations/:downwardEvaluationId/visibility` requires `process.override`.

## 3. State Machine Config

State lives in `packages/downward-routing-workflow`:

- `assigned`: owner `MANAGER`, nextAction `start`.
- `manager_draft`: owner `MANAGER`, nextAction `submit`.
- `manager_submitted`: owner `NEXT_LEVEL_MANAGER`, nextAction `next_level_approve`.
- `next_level_review`: owner `HRBP`, nextAction `hrbp_approve`.
- `hrbp_review`: owner `HRBP`, nextAction `complete`.
- `returned_to_manager`: owner `MANAGER`, nextAction `submit`.
- `completed`: owner `SYSTEM`, nextAction `null`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-downward-routing.html`.
- It lists active downward evaluation processes, eligible participants, and routed evaluation tasks.
- HR Admin can start routing, submit manager responses, next-level approve, HRBP approve, return to manager, complete, and flip visibility.

## 5. Audit Log And Notifications Hooks

- API service writes audit events for create, update, submit, approve, return, complete, and visibility changes.
- Audit metadata includes `processId`, `owner`, `nextAction`, routing chain, response keys, and locked form version details where relevant.
- `notifyDownwardEvaluationChanged` is the notification hook for routing events.

## 6. Tests And Seed Data

- `packages/downward-routing-workflow` tests state shape, manager-to-next-level-to-HRBP chain, return behavior, visibility override, and invalid HRBP approval.
- Seed flow: publish a downward evaluation form, create/configure/start a downward process, then start routing tasks from `/temp-downward-routing.html`.

## Acceptance Criteria Mapping

- Role permissions are enforced for every Process and downward evaluation route/action.
- Every create, update, submit, approve, return, override, and visibility change writes an audit event.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
- Processes still cannot start when org filters produce zero eligible employees.
- In-flight downward evaluations keep the locked form schema/version even after template edits.
