# PD Chat Logging Scaffold

Module: PD Chat  
Priority: P1 (Critical)  
Sprint: S4  
Impact: 8/10  
Effort: 4/10  
Score: 12

## 1. Data Model And Migrations

- `public.pd_chat_logs` stores employee/manager development conversations.
- Each log carries `process_id`, `employee_id`, `manager_id`, optional `evaluation_id`, `topic`, `messages`, `visibility`, timestamps, and return reason.
- `messages` is JSONB so the first scaffold can capture structured author, role, body, time, and visibility without adding a separate message table too early.
- Local migration: `db/migrations/027_pd_chat_logging.sql`.

## 2. API Routes, Validation, And RBAC Middleware

- `GET /pd-chats` and `GET /pd-chats/:id` require `pd_chat.read`.
- `POST /pd-chats` requires `pd_chat.create`.
- `PATCH /pd-chats/:id` requires `pd_chat.update`.
- `POST /pd-chats/:id/submit` requires `pd_chat.submit`.
- `POST /pd-chats/:id/approve` requires `pd_chat.approve`.
- `POST /pd-chats/:id/return` requires `pd_chat.return`.
- `PATCH /pd-chats/:id/visibility` requires `pd_chat.override`.
- `POST /pd-chats/:id/archive` requires `pd_chat.archive`.

## 3. State Machine Config

State lives in `packages/pd-chat-workflow`:

- `draft`: owner `EMPLOYEE`, nextAction `update`.
- `active`: owner `EMPLOYEE_MANAGER`, nextAction `submit`.
- `submitted`: owner `MANAGER`, nextAction `approve`.
- `manager_reviewed`: owner `MANAGER`, nextAction `override_visibility`.
- `returned`: owner `EMPLOYEE`, nextAction `update`.
- `visibility_approved`: owner `EMPLOYEE_MANAGER`, nextAction `archive`.
- `archived`: owner `SYSTEM`, nextAction `null`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-pd-chat.html`.
- The page can create a chat, append messages, submit for manager review, approve, return, share HRBP visibility, and archive.
- The table shows topic, employee, manager, status, owner, next action, and latest messages.

## 5. Audit Log And Notifications Hooks

- API service writes audit events for create, update, submit, approve, return, visibility change, and archive.
- Audit metadata includes `owner`, `nextAction`, `processId`, `evaluationId`, `messageCount`, and visibility changes.
- `notifyPdChatChanged` is the notification hook for lifecycle changes.

## 6. Tests And Seed Data

- `packages/pd-chat-workflow` tests state shape, manager review path, return behavior, invalid approval, and message normalization.
- Migration seeds one sample PD Chat when an active profile exists.

## Acceptance Criteria Mapping

- Role permissions are enforced for every PD Chat route and action.
- Every create, update, submit, approve, return, override, and visibility change writes an audit event.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
