# Recurring PD Chat Scheduler Scaffold

Sprint: S10  
Module: PD Chat  
Priority: P4 Future

## 1. Data Model And Migrations

- Adds `public.pd_chat_schedules` for recurring employee-manager development conversations.
- Stores explicit workflow fields: `status`, `owner_role`, and `next_action`.
- Stores recurrence details: `cadence`, `start_at`, `next_occurrence_at`, `timezone`, `duration_minutes`, `generated_count`, and `last_generated_chat_id`.
- Enables RLS and grants authenticated access for the Supabase Data API.

## 2. API Routes, Validation, And RBAC

- Adds scheduler routes under `/pd-chats/schedules`.
- Uses dedicated permissions: `pd_chat.scheduler_read`, `pd_chat.scheduler_create`, `pd_chat.scheduler_update`, `pd_chat.scheduler_submit`, `pd_chat.scheduler_approve`, `pd_chat.scheduler_return`, `pd_chat.scheduler_override`, and `pd_chat.scheduler_archive`.
- Supports create, update, submit, approve, activate, pause, resume, return, visibility override, occurrence generation, and archive.

## 3. State Machine Config

- New package: `@bimebazar/pd-chat-scheduler-workflow`.
- States: `draft`, `submitted`, `approved`, `active`, `paused`, `returned`, `visibility_changed`, `archived`.
- Every state returns `status`, `owner`, and `nextAction`.

## 4. Frontend Screens

- Adds `temp-pd-chat-scheduler.html`.
- Lets a user select employee, manager, cadence, start time, duration, and topic.
- Shows upcoming occurrence preview and table actions for the schedule workflow.

## 5. Audit Log And Notification Hooks

- Every scheduler action writes an audit event with entity type `pd_chat_schedule`.
- Generating an occurrence also creates a normal `pd_chat_log` record and writes a `pd_chat.created` audit event.
- Adds `notifyPdChatScheduleChanged` as the S10 notification hook.

## 6. Tests And Seed Data

- Adds workflow tests for state coverage, submit-approve-activate, pause-resume, return ownership, visibility override, and recurrence generation.
- Migration seeds one draft monthly scheduler from the first active profile.
