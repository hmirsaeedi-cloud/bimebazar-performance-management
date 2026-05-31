# Process Engine - Create And Configure Scaffold

Module: Process  
Priority: P1 (Critical)  
Sprint: S2  
Impact: 10/10  
Effort: 7/10  
Score: 13

## 1. Data Model And Migrations

- `public.performance_processes` stores the process definition, JSON config, eligibility filter, form version pointers, schedule, and workflow state.
- `public.process_participants` stores the resolved employees for a configured process.
- Processes keep `form_template_version_id`, so in-flight processes retain the exact form version even after later template edits.
- Configuration locks `locked_form_template_version_id`, `locked_form_version_number`, and `locked_form_schema` as a snapshot for in-flight process safety.
- `configured_participant_count`, `configured_at`, and `started_at` support audit and operational review.

## 2. API Routes, Validation, And RBAC Middleware

- `GET /processes` requires `process.read`.
- `POST /processes` requires `process.create`.
- `GET /processes/:id` requires `process.read`.
- `PATCH /processes/:id` requires `process.update`.
- `POST /processes/:id/configure` requires `process.configure`.
- `POST /processes/:id/start` requires `process.start`.
- `POST /processes/:id/pause` requires `process.pause`.
- `POST /processes/:id/resume` requires `process.start`.
- `POST /processes/:id/complete` requires `process.complete`.
- `POST /processes/:id/cancel` requires `process.cancel`.

- Configure requires a selected form template version.
- Start re-checks participant count and refuses to start when no non-excluded participants exist.
- Selected form template version must belong to the selected form template.

## 3. State Machine Config

State lives in `packages/process-engine-workflow`:

- `draft`: owner `HR_ADMIN`, nextAction `configure`.
- `configured`: owner `HR_ADMIN`, nextAction `schedule`.
- `scheduled`: owner `SYSTEM`, nextAction `start`.
- `active`: owner `HRBP`, nextAction `complete`.
- `paused`: owner `HRBP`, nextAction `resume`.
- `completed`: owner `SYSTEM`, nextAction `null`.
- `cancelled`: owner `SYSTEM`, nextAction `null`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-process-engine.html`.
- It can create draft processes, resolve eligible employees, configure participants, and move processes through the engine.
- It displays participant count and locks the selected form version when configuring.

## 5. Audit Log And Notifications Hooks

- API service writes audit events for create, update, configure, schedule, start, pause, resume, complete, and cancel.
- Visibility config changes also write `process.visibility_changed`.
- Audit metadata includes `owner`, `nextAction`, process type, and participant count where relevant.
- `notifyProcessChanged` can later drive in-app/email process notifications.

## 6. Tests And Seed Data

- `packages/process-engine-workflow` tests state shape, configure/start, pause/resume, and invalid transitions.
- The temporary local page uses existing profiles, teams, and published form templates as seed inputs.

## Acceptance Criteria Mapping

- Role permissions are enforced for every Process route and action.
- Every create, update, configure, submit/start, approve/equivalent, return/equivalent, override/cancel, and visibility-sensitive change writes an audit event.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
- Processes cannot start when org filters produce zero eligible employees.
- In-flight processes keep their selected form version through the locked form snapshot.
