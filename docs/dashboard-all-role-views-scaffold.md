# Dashboard All Role Views Scaffold

Module: Dashboard  
Priority: P1 Critical  
Sprint: S5

## 1. Data Model And Migrations

Migration: `db/migrations/031_dashboard_all_role_views.sql`

The scaffold adds `public.dashboard_preferences` for storing per-user dashboard layout preferences across four views:

- `employee`
- `manager`
- `hrbp`
- `hr_admin`

Every preference row carries explicit workflow fields:

- `status`: `defaulted`, `customized`, `override_pending`, `overridden`
- `owner_role`: `USER` or `HR_ADMIN`
- `next_action`: `update` or `approve_override`

## 2. API Routes, Validation, And RBAC

Routes are mounted at `/dashboard`:

- `GET /dashboard` requires `dashboard.read`
- `PATCH /dashboard/preferences` requires `dashboard.update`
- `POST /dashboard/preferences/override` requires `dashboard.override`

Validation lives in `apps/api/src/dashboard/dashboard.schemas.ts`. Service logic lives in `apps/api/src/dashboard/dashboard.service.ts`.

## 3. State Machine Config

Package: `packages/dashboard-workflow`

The workflow resolves the user into one of four dashboard views. `NEXT_LEVEL_MANAGER` uses the manager dashboard because both roles primarily manage approval queues.

## 4. Frontend Screens/Components

Temporary local screen: `temp-dashboard.html`

The page includes view tabs for Employee, Manager, HRBP, and HR Admin, metric cards, notification/activity feeds, and layout preference controls.

## 5. Audit Log And Notifications Hooks

Dashboard preference writes create immutable audit events:

- `dashboard.created`
- `dashboard.updated`
- `dashboard.override_approved`

The API calls `notifyDashboardChanged(...)` as the notification hook.

## 6. Tests And Seed Data

Tests: `packages/dashboard-workflow/tests/dashboardWorkflow.test.mjs`

Seed data creates a default dashboard preference for every active profile.

## Acceptance Criteria Mapping

- Role permissions are enforced through `dashboard.read`, `dashboard.update`, `dashboard.override`, route middleware, seeded role permissions, and RLS.
- Create, update, and override actions write immutable audit events.
- Every state transition returns explicit `status`, `owner`, and `nextAction` values.
