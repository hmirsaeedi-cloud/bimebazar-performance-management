# Feedback Anonymity And Min-Response Guard Scaffold

Module: Feedback  
Priority: P3  
Sprint: S7

## 1. Data Model And Migrations

Migration `043_feedback_anonymity_min_response_guard.sql` extends feedback with:

- `min_response_count`
- `anonymity_status`
- `anonymity_checked_at`
- `responses_released_at`
- `min_response_guard_reason`
- response release metadata

Anonymous responses stay guarded until `response_count >= min_response_count`.

## 2. API Routes, Validation, And RBAC

New Feedback actions:

- `POST /feedback/:id/anonymity/review`
- `POST /feedback/:id/anonymity/release`

Permissions:

- `feedback.anonymity_review`
- `feedback.anonymity_release`

Existing Feedback routes keep their existing RBAC.

## 3. State Machine

The request workflow remains:

`draft -> open -> completed -> closed`

Anonymous privacy state is explicit:

`collecting -> guarded -> releasable -> released`

Zero-response anonymous requests can still be extended or closed.

## 4. Frontend Scaffold

Temporary page:

`/temp-feedback.html`

It now shows the anonymity guard state, minimum response count, review action, and release action.

## 5. Audit And Notifications

Audit events include:

- `feedback.anonymity_checked`
- `feedback.anonymity_released`
- `feedback.visibility_changed`

Response submission audits include min-response guard metadata.

## 6. Tests And Seed Data

Workflow tests cover:

- deactivated users excluded from recipient search through active-only query
- anonymous zero-response extend/close rule
- anonymous response release blocked before minimum response count
- explicit anonymity guard status
