# Feedback Request Basic Scaffold

Module: Feedback  
Priority: P2 High value  
Sprint: S5

## 1. Data Model And Migrations

Migration: `db/migrations/032_feedback_request_basic.sql`

The scaffold adds:

- `public.feedback_requests`
- `public.feedback_request_recipients`
- `public.feedback_responses`

Requests carry explicit workflow fields:

- `status`: `draft`, `open`, `extended`, `completed`, `closed`
- `owner_role`: `REQUESTER`, `RECIPIENTS`, `SYSTEM`
- `next_action`: `submit_request`, `submit_response`, `close`, or `null`

## 2. API Routes, Validation, And RBAC

Routes are mounted at `/feedback`:

- `GET /feedback` requires `feedback.read`
- `GET /feedback/recipients` requires `feedback.read`
- `POST /feedback` requires `feedback.create`
- `PATCH /feedback/:id` requires `feedback.update`
- `POST /feedback/:id/submit` requires `feedback.submit`
- `POST /feedback/:id/respond` requires `feedback.submit`
- `POST /feedback/:id/extend` requires `feedback.extend`
- `POST /feedback/:id/close` requires `feedback.close`
- `PATCH /feedback/:id/visibility` requires `feedback.override`

Recipient search only returns active profiles, and the service rejects deactivated recipient IDs.

## 3. State Machine Config

Package: `packages/feedback-workflow`

The state machine exposes `getFeedbackState`, `transitionFeedbackState`, and `canResolveAnonymousZeroResponseRequest`.

## 4. Frontend Screens/Components

Temporary local screen: `temp-feedback.html`

The page supports creating requests, submitting them, responding, extending anonymous zero-response requests, closing requests, and changing visibility.

## 5. Audit Log And Notifications Hooks

Actions write immutable audit events:

- `feedback.created`
- `feedback.updated`
- `feedback.submitted`
- `feedback.response_submitted`
- `feedback.extended`
- `feedback.closed`
- `feedback.visibility_changed`

The API calls `notifyFeedbackChanged(...)` as the notification hook.

## 6. Tests And Seed Data

Tests: `packages/feedback-workflow/tests/feedbackWorkflow.test.mjs`

Seed data creates one draft anonymous feedback request for the first active profile.

## Acceptance Criteria Mapping

- Role permissions are enforced with `feedback.*` route middleware, seeded role permissions, and RLS.
- Create, update, submit/response, extend/close, and visibility changes write audit events.
- State transitions return explicit `status`, `owner`, and `nextAction`.
- Deactivated users are excluded from recipient search and anonymous zero-response requests can be extended or closed.
