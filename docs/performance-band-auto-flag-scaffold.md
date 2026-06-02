# Performance Band Auto-Flag Scaffold

Module: Evaluation  
Priority: P3  
Sprint: S7

## 1. Data Model And Migrations

Migration `041_performance_band_auto_flag.sql` adds `performance_band_flags`.

Each row stores:

- linked end-cycle evaluation
- employee, manager, HRBP, process
- `flag_type`: `pip`, `promotion`, or `none`
- submitted weighted score and section contributions
- thresholds used for classification
- explicit `status`, `owner_role`, and `next_action`
- visibility controls
- conversion metadata for future PIP/Promotion linkage

## 2. API Routes, Validation, And RBAC

Routes live under `/evaluations/band-flags` and use `evaluation.band_flags.*` permissions:

- read
- create/generate
- update
- submit
- approve
- return
- override visibility
- convert
- dismiss

## 3. State Machine

Package: `@bimebazar/performance-band-workflow`

Flow:

`detected -> under_review -> approved -> converted`

Alternative paths:

`under_review -> returned -> detected`

`detected/under_review/approved -> dismissed`

Every state returns explicit `status`, `owner`, and `nextAction`.

## 4. Frontend Scaffold

Temporary review page:

`/temp-performance-band-flags.html`

It can create a demo submitted score, generate a PIP/Promotion flag, and move the flag through review actions.

## 5. Audit And Notifications

Every create, update, submit, approve, return, visibility override, convert, and dismiss writes an audit event.

Notification hook:

`notifyPerformanceBandFlagChanged`

## 6. Tests And Seed Data

Workflow tests cover:

- explicit status, owner, nextAction
- review to conversion flow
- PIP, Promotion, and neutral score classification
- guard that flags run only after submitted weighted score is visible
