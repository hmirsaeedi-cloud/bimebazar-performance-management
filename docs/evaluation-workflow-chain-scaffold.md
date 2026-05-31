# Evaluation Workflow Chain Scaffold

Module: Evaluation  
Priority: P1 (Critical)  
Sprint: S4  
Impact: 10/10  
Effort: 8/10  
Score: 12

## 1. Data Model And Migrations

- `public.end_cycle_evaluations` now carries reviewer assignments for `next_level_manager_id`, `head_reviewer_id`, and `hrbp_id`.
- `review_chain` stores explicit steps and the current owner step.
- `nl_approved_at`, `head_approved_at`, and `hrbp_approved_at` create a timestamped approval trail.
- Check constraints allow `submitted`, `nl_approved`, `head_approved`, `hrbp_approved`, `visibility_approved`, and `completed`.

## 2. API Routes, Validation, And RBAC Middleware

- `POST /evaluations/:id/next-level-approve` requires `evaluation.approve`.
- `POST /evaluations/:id/head-approve` requires `evaluation.approve`.
- `POST /evaluations/:id/hrbp-approve` requires `evaluation.approve`.
- Return, visibility override, completion, score calculation, create, update, and submit keep their existing Evaluation permissions.
- Create validation accepts optional `nextLevelManagerId` and `headReviewerId`.

## 3. State Machine Config

- `submitted`: owner `NEXT_LEVEL_MANAGER`, nextAction `next_level_approve`.
- `nl_approved`: owner `HEAD`, nextAction `head_approve`.
- `head_approved`: owner `HRBP`, nextAction `hrbp_approve`.
- `hrbp_approved`: owner `HRBP`, nextAction `override_visibility`.
- `returned`: owner `MANAGER`, nextAction `submit`.
- `completed`: owner `SYSTEM`, nextAction `null`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-end-cycle-evaluation.html`.
- The table shows the assigned NL reviewer, Head reviewer, HRBP, current step, owner, next action, score state, and available workflow buttons.
- Scores remain hidden until manager submit, then weighted section contributions are visible during approval.

## 5. Audit Log And Notifications Hooks

- Audit events are written for submit, NL approval, Head approval, HRBP approval, return, visibility change, and completion.
- Notification hook actions now include `next_level_approved`, `head_approved`, and `hrbp_approved`.
- Audit metadata includes `reviewChain`, `owner`, `nextAction`, process ID, score visibility, and score engine version.

## 6. Tests And Seed Data

- Workflow tests cover the full NL -> Head -> HRBP route and block early HRBP approval.
- Existing seed evaluation template continues to provide weighted Results and Behaviors sections.

## Acceptance Criteria Mapping

- Role permissions are enforced on every Evaluation route and action.
- Every create, update, submit, approve, return, override, and visibility change writes an audit event.
- State transitions are explicit `status`, `owner`, and `nextAction` values.
- Weighted score stays hidden before submit and shows section contribution after submission.
- A required scale answer of `0` is valid only when intentionally selected.
