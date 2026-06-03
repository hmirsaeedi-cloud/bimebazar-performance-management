# Real-time Feedback / Kudos Feed Scaffold

Sprint: S10  
Module: Feedback  
Priority: P4 Future

## 1. Data Model And Migrations

- Adds `public.kudos_feed_items`.
- Stores explicit `status`, `owner_role`, and `next_action`.
- Uses `recipient_user_ids` and `tags` arrays for feed filtering.
- Enables RLS, Data API grants, and adds the table to the Supabase Realtime publication.

## 2. API Routes, Validation, And RBAC

- Adds routes under `/feedback/feed`.
- Uses dedicated permissions: `feedback.kudos.read`, `create`, `update`, `submit`, `approve`, `return`, `override`, `publish`, and `archive`.
- Reuses the active-recipient validation so deactivated users are excluded from recipient selection.

## 3. State Machine Config

- New package: `@bimebazar/kudos-feed-workflow`.
- States: `draft`, `submitted`, `approved`, `published`, `returned`, `visibility_changed`, `archived`.
- Every state returns `status`, `owner`, and `nextAction`.

## 4. Frontend Screens

- Adds `temp-kudos-feed.html`.
- Supports creating kudos, submitting for review, approving, publishing, returning, changing visibility, and archiving.
- Auto-refreshes the feed; the database table is prepared for Supabase Realtime subscription.

## 5. Audit Log And Notification Hooks

- Every create, update, submit, approve, publish, return, visibility change, and archive writes an audit event.
- Adds `notifyKudosFeedChanged` as the S10 notification hook.

## 6. Tests And Seed Data

- Adds workflow tests for state coverage, submit-approve-publish, return ownership, visibility override, message normalization, and active-recipient requirement.
- Migration seeds one draft kudos item using active profiles only.
