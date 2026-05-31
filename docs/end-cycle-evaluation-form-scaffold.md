# End-cycle Evaluation Form Scaffold

Module: Evaluation  
Priority: P1 (Critical)  
Sprint: S4  
Impact: 10/10  
Effort: 7/10  
Score: 13

## 1. Data Model And Migrations

- `public.end_cycle_evaluations` stores one end-cycle evaluation per employee/process.
- Each evaluation keeps `status`, `owner_role`, `next_action`, `answers`, `score`, `visibility`, timestamps, return reason, reviewer assignments, `review_chain`, and a locked form schema.
- `next_level_manager_id`, `head_reviewer_id`, and `hrbp_id` make the NL -> Head -> HRBP chain explicit on each evaluation.
- `nl_approved_at`, `head_approved_at`, and `hrbp_approved_at` record the exact approval handoff timing.
- `score_engine_version` and `score_calculated_at` track the current score calculation.
- `public.evaluation_score_snapshots` stores each score calculation result for audit/debug history.
- A seeded published form template, `end_cycle_evaluation_default`, provides weighted Results and Behaviors sections.
- `unique (process_id, employee_id)` prevents duplicate evaluation records for the same process participant.

## 2. API Routes, Validation, And RBAC Middleware

- `GET /evaluations` and `GET /evaluations/:id` require `evaluation.read`.
- `POST /evaluations` requires `evaluation.create`.
- `PATCH /evaluations/:id` requires `evaluation.update`.
- `POST /evaluations/:id/score` requires `evaluation.read`.
- `POST /evaluations/:id/submit` requires `evaluation.submit`.
- `POST /evaluations/:id/approve` requires `evaluation.approve`.
- `POST /evaluations/:id/next-level-approve` requires `evaluation.approve`.
- `POST /evaluations/:id/head-approve` requires `evaluation.approve`.
- `POST /evaluations/:id/hrbp-approve` requires `evaluation.approve`.
- `POST /evaluations/:id/return` requires `evaluation.return`.
- `POST /evaluations/:id/complete` requires `evaluation.approve`.
- `PATCH /evaluations/:id/visibility` requires `evaluation.override`.

## 3. State Machine Config

State lives in `packages/end-cycle-evaluation-workflow`:

- `draft`: owner `MANAGER`, nextAction `update_draft`.
- `in_progress`: owner `MANAGER`, nextAction `submit`.
- `submitted`: owner `NEXT_LEVEL_MANAGER`, nextAction `next_level_approve`.
- `nl_approved`: owner `HEAD`, nextAction `head_approve`.
- `head_approved`: owner `HRBP`, nextAction `hrbp_approve`.
- `hrbp_approved`: owner `HRBP`, nextAction `override_visibility`.
- `returned`: owner `MANAGER`, nextAction `submit`.
- `approved`: owner `HRBP`, nextAction `override_visibility` for backward compatibility.
- `visibility_approved`: owner `HRBP`, nextAction `complete`.
- `completed`: owner `SYSTEM`, nextAction `null`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-end-cycle-evaluation.html`.
- The page can create a draft, save sample answers, submit, approve through NL -> Head -> HRBP, return, reveal score visibility, and complete.
- The page shows the assigned next-level manager, head reviewer, HRBP, current step, owner, and next action.
- Before submit, score is hidden. After submit, section contribution and total weighted score are shown.
- The page records a score snapshot whenever answers are saved or submitted.

## 5. Audit Log And Notifications Hooks

- API service writes audit events for create, update, submit, next-level approval, head approval, HRBP approval, return, complete, and visibility changes.
- Audit metadata includes `owner`, `nextAction`, `reviewChain`, `answerKeys`, `scoreVisible`, `scoreEngineVersion`, `scoreMode`, process ID, and locked form version details.
- `notifyEvaluationChanged` is the notification hook for evaluation lifecycle changes.

## 6. Tests And Seed Data

- `packages/end-cycle-evaluation-workflow` tests state shape, NL -> Head -> HRBP approval flow, blocked early HRBP approval, hidden score before submit, section contribution after submit, required scale `0`, and invalid approval.
- Seed data is included in the migration as a published end-cycle evaluation template.

## Acceptance Criteria Mapping

- Role permissions are enforced for every Evaluation route and action.
- Every create, update, submit, approve, return, override, and visibility change writes an audit event.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
- Weighted score shows section contribution after submission, while manager sees no computed score before submit.
- A required scale answer of `0` is valid only when intentionally selected, not as a missing default.
