# Upward Process Self-assessment Scaffold

Module: Process  
Priority: P1 (Critical)  
Sprint: S3  
Impact: 9/10  
Effort: 5/10  
Score: 13

## 1. Data Model And Migrations

- `public.performance_processes` remains the campaign-level process record.
- `public.process_participants` stores eligible employees resolved from org filters.
- `public.process_self_assessments` stores one employee self-assessment task per process participant.
- Each self-assessment keeps `status`, `owner_role`, `next_action`, `responses`, `visibility`, return/approval timestamps, and the locked form schema copied from the configured process.
- `unique (process_id, employee_id)` prevents duplicate self-assessment tasks for the same employee in one process.

## 2. API Routes, Validation, And RBAC Middleware

- `GET /processes/:id/self-assessments` requires `process.read`.
- `POST /processes/:id/participants/:participantId/self-assessment/start` requires `process.submit`.
- `PATCH /processes/self-assessments/:selfAssessmentId` requires `process.submit`.
- `POST /processes/self-assessments/:selfAssessmentId/submit` requires `process.submit`.
- `POST /processes/self-assessments/:selfAssessmentId/return` requires `process.return`.
- `POST /processes/self-assessments/:selfAssessmentId/approve` requires `process.approve`.
- `POST /processes/self-assessments/:selfAssessmentId/complete` requires `process.approve`.
- `PATCH /processes/self-assessments/:selfAssessmentId/visibility` requires `process.override`.

## 3. State Machine Config

State lives in `packages/self-assessment-workflow`:

- `assigned`: owner `EMPLOYEE`, nextAction `start`.
- `in_progress`: owner `EMPLOYEE`, nextAction `submit`.
- `submitted`: owner `MANAGER`, nextAction `manager_approve`.
- `returned`: owner `EMPLOYEE`, nextAction `submit`.
- `manager_approved`: owner `HRBP`, nextAction `complete`.
- `completed`: owner `SYSTEM`, nextAction `null`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-self-assessment.html`.
- It lists active self-assessment processes, eligible participants, and employee self-assessment tasks.
- HR Admin can start a task, submit sample answers, return it, manager approve it, complete it, and flip review visibility.

## 5. Audit Log And Notifications Hooks

- API service writes audit events for create, update, submit, approve, return, complete, and visibility changes.
- Audit metadata includes `processId`, `owner`, `nextAction`, response keys, and locked form version details where relevant.
- `notifySelfAssessmentChanged` is the notification hook for self-assessment create, update, submit, return, approve, complete, and visibility changes.

## 6. Tests And Seed Data

- `packages/self-assessment-workflow` tests state shape, submit/approve flow, return flow, visibility override, and invalid approval.
- Seed flow: create/publish a self-assessment form, create/configure/start a self-assessment process, then start participant tasks from `/temp-self-assessment.html`.

## Acceptance Criteria Mapping

- Role permissions are enforced for every Process and self-assessment route/action.
- Every create, update, submit, approve, return, override, and visibility change writes an audit event.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
- Processes still cannot start when org filters produce zero eligible employees.
- In-flight self-assessment tasks keep the locked form schema/version even after template edits.
