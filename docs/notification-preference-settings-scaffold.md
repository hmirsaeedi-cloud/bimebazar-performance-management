# Notification Preference Settings Scaffold

Sprint: S8  
Module: Notifications  
Priority: P3 Moderate

## 1. Data Model and Migrations

- Adds `notification_preferences`.
- Stores one preference record per user.
- Captures channel toggles:
  - in-app
  - email
  - push
  - SMS
- Captures digest frequency, quiet hours, visibility, and workflow timestamps.
- Enables RLS and grants Data API access to `authenticated`.

## 2. API Routes, Validation, and RBAC Middleware

- `GET /notifications/preferences`
- `PATCH /notifications/preferences/:id`
- `POST /notifications/preferences/:id/submit`
- `POST /notifications/preferences/:id/approve`
- `POST /notifications/preferences/:id/return`
- `POST /notifications/preferences/:id/override`
- `PATCH /notifications/preferences/:id/visibility`

Permissions:

- `notifications.preferences.read`
- `notifications.preferences.update`
- `notifications.preferences.submit`
- `notifications.preferences.approve`
- `notifications.preferences.return`
- `notifications.preferences.override`

## 3. State Machine Config

Every state returns explicit:

- `status`
- `owner`
- `nextAction`

States:

- `defaulted`
- `customized`
- `submitted`
- `approved`
- `returned`
- `overridden`

## 4. Frontend Screens and Components

- Adds `temp-notification-preferences.html`.
- Lets HR/admin inspect active users, create defaults, update channels, submit, approve, return, override, and change visibility.

## 5. Audit Log and Notifications Hooks

Audit events:

- `notification.preference.created`
- `notification.preference.updated`
- `notification.preference.submitted`
- `notification.preference.approved`
- `notification.preference.returned`
- `notification.preference.overridden`
- `notification.preference.visibility_changed`

Notification hook:

- `notifyNotificationPreferenceChanged`

## 6. Tests and Seed Data

- Adds workflow tests for state coverage, submit/approve, return, override, visibility changes, and normalization.
- Migration seeds default preferences for active users.

## Acceptance Criteria Coverage

- RBAC permissions guard every preference route.
- All preference actions write audit events.
- All state transitions use explicit `status`, `owner`, and `nextAction`.
