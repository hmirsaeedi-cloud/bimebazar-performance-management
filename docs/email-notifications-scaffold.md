# Email Notifications Scaffold

Module: Notif.  
Priority: P2 High value  
Sprint: S6

## 1. Data Model And Migrations

Migration: `db/migrations/036_email_notifications.sql`

The scaffold adds `public.email_notifications` as an email delivery queue with recipient, recipient email, subject, text/html bodies, provider metadata, linked entity, visibility, and workflow timestamps.

## 2. API Routes, Validation, And RBAC

Routes are mounted under `/notifications/email`:

- `GET /notifications/email` requires `notifications.email.read`
- `POST /notifications/email` requires `notifications.email.create`
- `PATCH /notifications/email/:id` requires `notifications.email.update`
- `POST /notifications/email/:id/submit` requires `notifications.email.submit`
- `POST /notifications/email/:id/approve` requires `notifications.email.approve`
- `POST /notifications/email/:id/queue` requires `notifications.email.send`
- `POST /notifications/email/:id/mark-sent` requires `notifications.email.send`
- `POST /notifications/email/:id/fail` requires `notifications.email.send`
- `POST /notifications/email/:id/return` requires `notifications.email.return`
- `POST /notifications/email/:id/cancel` requires `notifications.email.cancel`
- `PATCH /notifications/email/:id/visibility` requires `notifications.email.override`

## 3. State Machine Config

Package: `packages/email-notification-workflow`

States:

- `draft`
- `pending_approval`
- `approved`
- `queued`
- `sent`
- `failed`
- `returned`
- `cancelled`

Each state returns explicit `status`, `owner`, `nextAction`, and `recipientVisible`.

## 4. Frontend Screens/Components

Temporary local screen: `temp-email-notifications.html`

The page supports creating an email draft, submitting for approval, approving, queueing, marking sent, failing, returning, cancelling, and visibility override.

## 5. Audit Log And Notifications Hooks

Actions write immutable audit events:

- `notification.email.created`
- `notification.email.updated`
- `notification.email.submitted`
- `notification.email.approved`
- `notification.email.queued`
- `notification.email.sent`
- `notification.email.failed`
- `notification.email.returned`
- `notification.email.cancelled`
- `notification.email.visibility_changed`

The API calls `notifyEmailNotificationChanged(...)` as the notification hook.

## 6. Tests And Seed Data

Tests: `packages/email-notification-workflow/tests/emailNotificationWorkflow.test.mjs`

Seed data creates one draft email notification for the first active profile.

## Acceptance Criteria Mapping

- Role permissions are enforced through `notifications.email.*` route middleware, seeded role permissions, and RLS.
- Create, update, submit, approve, return, override, visibility, queue, sent, failed, and cancel actions write audit events.
- State transitions return explicit `status`, `owner`, `nextAction`, and recipient visibility.
