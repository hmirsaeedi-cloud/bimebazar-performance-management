# Mid-cycle Evaluation Scaffold

Module: Evaluation  
Priority: P1 (Critical)  
Sprint: S4  
Impact: 8/10  
Effort: 5/10  
Score: 11

## 1. Data Model And Migrations

- `public.mid_cycle_evaluations` stores one mid-cycle checkpoint evaluation per employee/process.
- Each evaluation keeps `status`, `owner_role`, `next_action`, `answers`, `score`, `visibility`, timestamps, return reason, and locked form schema.
- `public.mid_cycle_score_snapshots` stores score calculation history without mixing it into end-cycle score snapshots.
- A seeded published form template, `mid_cycle_evaluation_default`, provides weighted Progress and Support sections.
- Local migration: `db/migrations/028_mid_cycle_evaluation.sql`.

## 2. API Routes, Validation, And RBAC Middleware

- `GET /mid-cycle-evaluations` and `GET /mid-cycle-evaluations/:id` require `evaluation.read`.
- `POST /mid-cycle-evaluations` requires `evaluation.create`.
- `PATCH /mid-cycle-evaluations/:id` requires `evaluation.update`.
- `POST /mid-cycle-evaluations/:id/score` requires `evaluation.read`.
- `POST /mid-cycle-evaluations/:id/submit` requires `evaluation.submit`.
- `POST /mid-cycle-evaluations/:id/manager-approve` requires `evaluation.approve`.
- `POST /mid-cycle-evaluations/:id/hrbp-approve` requires `evaluation.approve`.
- `POST /mid-cycle-evaluations/:id/return` requires `evaluation.return`.
- `PATCH /mid-cycle-evaluations/:id/visibility` requires `evaluation.override`.
- `POST /mid-cycle-evaluations/:id/complete` requires `evaluation.approve`.

## 3. State Machine Config

State lives in `packages/mid-cycle-evaluation-workflow`:

- `draft`: owner `MANAGER`, nextAction `update_draft`.
- `in_progress`: owner `MANAGER`, nextAction `submit`.
- `submitted`: owner `MANAGER`, nextAction `manager_approve`.
- `manager_approved`: owner `HRBP`, nextAction `hrbp_approve`.
- `hrbp_approved`: owner `HRBP`, nextAction `override_visibility`.
- `returned`: owner `MANAGER`, nextAction `update_draft`.
- `visibility_approved`: owner `HRBP`, nextAction `complete`.
- `completed`: owner `SYSTEM`, nextAction `null`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-mid-cycle-evaluation.html`.
- The page can create a draft, save sample answers, submit, manager approve, HRBP approve, return, reveal score visibility, and complete.
- Before submit, score is hidden. After submit, section contribution and total weighted score are shown.

## 5. Audit Log And Notifications Hooks

- API service writes audit events for create, update, submit, manager approval, HRBP approval, return, complete, and visibility changes.
- Audit metadata includes `owner`, `nextAction`, `answerKeys`, `scoreVisible`, `scoreEngineVersion`, `scoreMode`, process ID, and locked form version details.
- `notifyMidCycleEvaluationChanged` is the notification hook for mid-cycle lifecycle changes.

## 6. Tests And Seed Data

- `packages/mid-cycle-evaluation-workflow` tests state shape, manager-to-HRBP flow, hidden score before submit, section contribution after submit, required scale `0`, and invalid HRBP approval.
- Seed data is included in the migration as a published mid-cycle evaluation template.

## Acceptance Criteria Mapping

- Role permissions are enforced for every Evaluation route and action.
- Every create, update, submit, approve, return, override, and visibility change writes an audit event.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
- Weighted score shows section contribution after submission, while manager sees no computed score before submit.
- A required scale answer of `0` is valid only when intentionally selected, not as a missing default.
