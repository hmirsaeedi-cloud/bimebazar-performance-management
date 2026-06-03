# OKR / Goal Cascading Scaffold

Sprint: S9  
Module: Goals  
Priority: P4 Future

## 1. Data Model and Migrations

- Adds `goals`.
- Supports parent-child goal cascading through `parent_goal_id` and `cascade_path`.
- Stores owner, cycle, goal type, weighted key results, progress, visibility, workflow timestamps, and return reason.
- Enables RLS and grants authenticated Data API access.

## 2. API Routes, Validation, and RBAC Middleware

- `GET /goals`
- `POST /goals`
- `PATCH /goals/:id`
- `POST /goals/:id/submit`
- `POST /goals/:id/approve`
- `POST /goals/:id/activate`
- `POST /goals/:id/return`
- `PATCH /goals/:id/visibility`
- `POST /goals/:id/complete`
- `POST /goals/:id/archive`

Permissions:

- `goals.read`
- `goals.create`
- `goals.update`
- `goals.submit`
- `goals.approve`
- `goals.return`
- `goals.override`
- `goals.complete`
- `goals.archive`

## 3. State Machine Config

Every state returns:

- `status`
- `owner`
- `nextAction`

States:

- `draft`
- `submitted`
- `approved`
- `returned`
- `active`
- `visibility_changed`
- `completed`
- `archived`

## 4. Frontend Screens and Components

- Adds `temp-goals.html`.
- Lets HR/admin create parent and child OKRs, update key-result progress, submit, approve, activate, return, override visibility, complete, and archive.

## 5. Audit Log and Notification Hooks

Audit events:

- `goals.created`
- `goals.updated`
- `goals.submitted`
- `goals.approved`
- `goals.activated`
- `goals.returned`
- `goals.visibility_changed`
- `goals.completed`
- `goals.archived`

Notification hook:

- `notifyGoalChanged`

## 6. Tests and Seed Data

- Adds workflow tests for state coverage, submit/approve/activate/complete, return, visibility change, weighted progress, and cascade paths.
- Migration seeds one company OKR for active users when available.

## Acceptance Criteria Coverage

- RBAC permissions guard every Goals route.
- Every workflow action writes an audit event.
- State transitions use explicit `status`, `owner`, and `nextAction`.
