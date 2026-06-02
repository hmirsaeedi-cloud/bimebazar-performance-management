# PD Chat Auto-Attach to Evaluations Scaffold

Module: PD Chat  
Sprint: S7  
Priority: P3

## 1. Data Model and Migrations

- Migration: `db/migrations/044_pd_chat_auto_attach_to_evaluation.sql`
- New table: `pd_chat_evaluation_attachments`
- Adds attachment columns to `pd_chat_logs`
- Adds `attached_pd_chat_id` to:
  - `end_cycle_evaluations`
  - `mid_cycle_evaluations`
  - `process_downward_evaluations`

The attachment row is unique per evaluation through `(evaluation_type, evaluation_id)`.

## 2. API Routes, Validation, and RBAC

- Permission: `pd_chat.attach`
- Roles: `MANAGER`, `HRBP`, `HR_ADMIN`
- Route: `POST /pd-chat/attachments/auto`
- Validation: `pdChatAttachmentSchema`

The route checks for a non-archived PD Chat for the same employee and matching process/evaluation context.

## 3. State Machine Config

Attachment states live in `@bimebazar/pd-chat-workflow`:

- `matched`: owner `SYSTEM`, next action `auto_attach`
- `attached`: owner `SYSTEM`, next action `null`
- `missing_chat`: owner `MANAGER`, next action `override_attach`
- `detached`: owner `MANAGER`, next action `override_attach`

## 4. Frontend Screens and Components

- Page: `temp-pd-chat.html`
- Adds evaluation selection when creating a chat.
- Adds attachment status in the chat table.
- Adds an Auto attach action for eligible chats.

## 5. Audit Log and Notifications Hooks

Every attach/missing outcome writes an audit event:

- `pd_chat.auto_attached_to_evaluation`
- `pd_chat.auto_attach_missing`

Notification hook:

- `notifyPdChatAttachmentChanged`

## 6. Tests and Seed Data

- Workflow tests cover attachment states, matched auto-attach, and missing-chat routing.
- Migration includes seed attachment data when existing PD Chat and evaluation records can be matched.
