# Team Health Score Scaffold

Sprint 10 adds a Dashboard Team Health Score that blends completion, performance, feedback, PIP risk, and overdue task signals into a reviewed score snapshot.

## Data Model And Migration

- Migration: `db/migrations/053_team_health_score.sql`
- Table: `team_health_scores`
- The score is unique per `team_id` and `cycle`.
- Metrics and score contributions are stored as JSONB for audit-friendly explanation.

## API, Validation, And RBAC

Dashboard routes added:

- `GET /dashboard/team-health`
- `POST /dashboard/team-health`
- `PATCH /dashboard/team-health/:id`
- `POST /dashboard/team-health/:id/calculate`
- `POST /dashboard/team-health/:id/submit`
- `POST /dashboard/team-health/:id/approve`
- `POST /dashboard/team-health/:id/activate`
- `POST /dashboard/team-health/:id/return`
- `PATCH /dashboard/team-health/:id/visibility`
- `POST /dashboard/team-health/:id/archive`

Permissions:

- `dashboard.team_health.read`
- `dashboard.team_health.create`
- `dashboard.team_health.update`
- `dashboard.team_health.submit`
- `dashboard.team_health.approve`
- `dashboard.team_health.return`
- `dashboard.team_health.override`
- `dashboard.team_health.archive`

## State Machine

Package: `@bimebazar/team-health-workflow`

Every state returns:

- `status`
- `owner`
- `nextAction`

Main path:

`draft -> submitted -> approved -> active`

Control paths:

- calculate
- return to manager
- visibility override
- archive

## Frontend Scaffold

Local page:

- `temp-team-health.html`

It lets a user create a score from metrics, recalculate it, review it, activate it, and inspect contribution values.

## Audit And Notifications

Audit action names:

- `dashboard.team_health.created`
- `dashboard.team_health.updated`
- `dashboard.team_health.calculated`
- `dashboard.team_health.submitted`
- `dashboard.team_health.approved`
- `dashboard.team_health.activated`
- `dashboard.team_health.returned`
- `dashboard.team_health.visibility_changed`
- `dashboard.team_health.archived`

Notification hook:

- `notifyTeamHealthChanged`

## Tests And Seed Data

Tests cover:

- state shape
- submit/approve/activate
- return ownership
- visibility override
- weighted score and health band calculation
