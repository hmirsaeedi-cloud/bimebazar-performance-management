# Visual Org Chart On Profile Scaffold

Sprint 9 adds a visual org chart snapshot for employee profiles. It uses existing manager relationships in `profiles.manager_id` and stores a reviewed chart snapshot that can be displayed on profile pages.

## Data Model And Migration

- Migration: `db/migrations/051_visual_org_chart_on_profile.sql`
- Table: `profile_org_charts`
- Each chart is tied to a `root_profile_id`.
- The `snapshot` JSONB stores nodes, reporting-line edges, generation time, max depth, and direct-report count.

## API, Validation, And RBAC

Profiles routes added:

- `GET /profiles/org-charts`
- `POST /profiles/org-charts`
- `GET /profiles/org-charts/:id`
- `PATCH /profiles/org-charts/:id`
- `POST /profiles/org-charts/:id/refresh`
- `POST /profiles/org-charts/:id/submit`
- `POST /profiles/org-charts/:id/approve`
- `POST /profiles/org-charts/:id/activate`
- `POST /profiles/org-charts/:id/return`
- `PATCH /profiles/org-charts/:id/visibility`
- `POST /profiles/org-charts/:id/archive`

Permissions:

- `profiles.org_chart_read`
- `profiles.org_chart_create`
- `profiles.org_chart_update`
- `profiles.org_chart_submit`
- `profiles.org_chart_approve`
- `profiles.org_chart_return`
- `profiles.org_chart_override`
- `profiles.org_chart_archive`

## State Machine

Package: `@bimebazar/profile-org-chart-workflow`

Every state returns:

- `status`
- `owner`
- `nextAction`

Main path:

`draft -> submitted -> approved -> active`

Additional paths:

- refresh snapshot
- return to revision
- visibility override
- archive

## Frontend Scaffold

Local page:

- `temp-profile-org-chart.html`

It shows a manager, profile employee, and direct reports in simple visual levels with workflow controls.

## Audit And Notifications

Audit action names:

- `profile_org_chart.created`
- `profile_org_chart.updated`
- `profile_org_chart.refreshed`
- `profile_org_chart.submitted`
- `profile_org_chart.approved`
- `profile_org_chart.activated`
- `profile_org_chart.returned`
- `profile_org_chart.visibility_changed`
- `profile_org_chart.archived`

Notification hook:

- `notifyProfileOrgChartChanged`

## Tests And Seed Data

Tests cover:

- state shape
- submit/approve/activate
- refresh behavior
- visibility override
- snapshot generation from manager relationships

Seed data creates one draft chart from the first active profile.
