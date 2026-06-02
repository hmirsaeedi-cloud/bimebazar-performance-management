# In-app Notifications System Scaffold

Module: Notif.  
Priority: P1 Critical  
Sprint: S5

## 1. Data Model And Migrations

Migration: `db/migrations/030_in_app_notifications.sql`

The scaffold adds `public.notifications` for in-app inbox delivery. Each row has an explicit workflow state:

- `status`: `unread`, `read`, `archived`
- `owner_role`: `RECIPIENT` or `SYSTEM`
- `next_action`: `mark_read`, `archive`, or `null`

It also stores `recipient_user_id`, `actor_user_id`, `priority`, `title`, `body`, optional linked entity fields, timestamps, and metadata. RLS limits normal users to their own inbox while HR Admin can inspect all notification rows.

## 2. API Routes, Validation, And RBAC

Routes are mounted at `/notifications`:

- `GET /notifications` requires `notifications.read`
- `POST /notifications` requires `notifications.create`
- `PATCH /notifications/:id` requires `notifications.update`
- `POST /notifications/:id/mark-read` requires `notifications.mark_read`
- `POST /notifications/:id/archive` requires `notifications.archive`

Validation lives in `apps/api/src/notifications/notification.schemas.ts`. Service logic lives in `apps/api/src/notifications/notification.service.ts`.

## 3. State Machine Config

Package: `packages/notification-workflow`

The state machine exposes `getNotificationState`, `transitionNotificationState`, `notificationStatuses`, and `notificationActions`. Every transition returns the explicit `status`, `owner`, and `nextAction` values.

## 4. Frontend Screens/Components

Temporary local screen: `temp-notifications.html`

The screen lets HR create an in-app notification, filter the inbox, mark a notification as read, archive it, and verify the workflow fields visually.

## 5. Audit Log And Notifications Hooks

Every API action writes to `public.audit_events`:

- `notification.created`
- `notification.updated`
- `notification.marked_read`
- `notification.archived`

The temporary page also writes the same audit events when testing directly against Supabase.

## 6. Tests And Seed Data

Tests: `packages/notification-workflow/tests/notificationWorkflow.test.mjs`

Seed data creates one welcome notification for the first active profile. Role permissions are seeded for Employee, Manager, Next-level Manager, HRBP, and HR Admin according to the intended action scope.

## Acceptance Criteria Mapping

- Role permissions are enforced through API `requirePermission(...)`, seeded `permissions`, `role_permissions`, and RLS.
- Create, update, mark-read, and archive actions write immutable audit events.
- Every state transition is represented as explicit `status`, `owner_role`, and `next_action` values.
