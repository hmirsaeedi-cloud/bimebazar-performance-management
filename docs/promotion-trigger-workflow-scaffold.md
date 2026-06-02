# Promotion Trigger And Workflow Scaffold

Module: Promotion  
Priority: P2 High value  
Sprint: S6

## 1. Data Model And Migrations

Migration: `db/migrations/034_promotion_trigger_workflow.sql`

The scaffold adds `public.promotion_cases` with employee, manager, HRBP, optional source evaluation, current/proposed level, current/proposed title, effective date, rationale, evidence, visibility, and workflow timestamps.

## 2. API Routes, Validation, And RBAC

Routes are mounted at `/promotions`:

- `GET /promotions` requires `promotion.read`
- `POST /promotions` requires `promotion.create`
- `PATCH /promotions/:id` requires `promotion.update`
- `POST /promotions/:id/submit` requires `promotion.submit`
- `POST /promotions/:id/manager-approve` requires `promotion.approve`
- `POST /promotions/:id/hrbp-approve` requires `promotion.approve`
- `POST /promotions/:id/approve` requires `promotion.approve`
- `POST /promotions/:id/return` requires `promotion.return`
- `POST /promotions/:id/cancel` requires `promotion.cancel`
- `PATCH /promotions/:id/visibility` requires `promotion.override`

## 3. State Machine Config

Package: `packages/promotion-workflow`

States:

- `draft`
- `submitted`
- `manager_approved`
- `hrbp_approved`
- `approved`
- `returned`
- `cancelled`

Each state returns explicit `status`, `owner`, and `nextAction`.

## 4. Frontend Screens/Components

Temporary local screen: `temp-promotion.html`

The page supports creating a case and moving it through manager approval, HRBP approval, final approval, return, cancel, and visibility override.

## 5. Audit Log And Notifications Hooks

Actions write immutable audit events:

- `promotion.created`
- `promotion.updated`
- `promotion.submitted`
- `promotion.manager_approved`
- `promotion.hrbp_approved`
- `promotion.approved`
- `promotion.returned`
- `promotion.cancelled`
- `promotion.visibility_changed`

The API calls `notifyPromotionChanged(...)` as the notification hook.

## 6. Tests And Seed Data

Tests: `packages/promotion-workflow/tests/promotionWorkflow.test.mjs`

Seed data creates one draft promotion case for the first active profile.

## Acceptance Criteria Mapping

- Role permissions are enforced through `promotion.*` route middleware, seeded role permissions, and RLS.
- Create, update, submit, approve, return, cancel, and visibility changes write audit events.
- State transitions return explicit `status`, `owner`, and `nextAction`.
