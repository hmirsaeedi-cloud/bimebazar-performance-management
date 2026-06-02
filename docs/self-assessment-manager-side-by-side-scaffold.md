# Self-assessment vs. Manager Side-by-side Scaffold

Sprint: S9  
Module: Evaluation  
Priority: P4 Future

## 1. Data Model and Migrations

- Adds `evaluation_comparisons`.
- Links:
  - `process_self_assessments`
  - `end_cycle_evaluations`
  - employee, manager, HRBP, process, and locked form version
- Stores self answers, manager answers, side-by-side rows, alignment summary, hidden/visible score payloads, and visibility state.
- Enables RLS and grants authenticated Data API access.

## 2. API Routes, Validation, and RBAC Middleware

- `GET /evaluations/comparisons`
- `POST /evaluations/comparisons`
- `PATCH /evaluations/comparisons/:comparisonId`
- `POST /evaluations/comparisons/:comparisonId/submit`
- `POST /evaluations/comparisons/:comparisonId/approve`
- `POST /evaluations/comparisons/:comparisonId/return`
- `PATCH /evaluations/comparisons/:comparisonId/visibility`
- `POST /evaluations/comparisons/:comparisonId/complete`

Permissions:

- `evaluation.comparison.read`
- `evaluation.comparison.create`
- `evaluation.comparison.update`
- `evaluation.comparison.submit`
- `evaluation.comparison.approve`
- `evaluation.comparison.return`
- `evaluation.comparison.override`
- `evaluation.comparison.complete`

## 3. State Machine Config

Every state returns:

- `status`
- `owner`
- `nextAction`

States:

- `draft`
- `in_review`
- `submitted`
- `approved`
- `returned`
- `visibility_approved`
- `completed`

## 4. Frontend Screens and Components

- Adds `temp-side-by-side-evaluation.html`.
- Lets reviewers choose a self-assessment and manager evaluation, generate comparison rows, view answer differences, submit, approve, return, approve visibility, and complete.

## 5. Audit Log and Notification Hooks

Audit events:

- `evaluation.comparison.created`
- `evaluation.comparison.updated`
- `evaluation.comparison.submitted`
- `evaluation.comparison.approved`
- `evaluation.comparison.returned`
- `evaluation.comparison.visibility_changed`
- `evaluation.comparison.completed`

Notification hook:

- `notifyEvaluationComparisonChanged`

## 6. Tests and Seed Data

- Adds workflow tests for state coverage, submit/approve/visibility/complete, return, row comparison, and alignment summary.
- Seed data is intentionally created from existing self-assessment and end-cycle records through the temporary page to avoid pairing mismatched employees.

## Acceptance Criteria Coverage

- RBAC permissions guard every comparison route.
- Every workflow action writes an audit event.
- State transitions use explicit `status`, `owner`, and `nextAction`.
- Score payloads stay hidden until submit; submitted comparisons reveal weighted section contribution.
- Required scale answer `0` remains valid only when intentionally selected through the existing weighted score engine.
