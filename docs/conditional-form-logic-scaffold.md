# Conditional Form Logic Scaffold

Sprint 9 adds conditional form logic for reviewed rule sets that can show, hide, require, or make questions optional based on earlier answers.

## Data Model And Migration

- Migration: `db/migrations/050_conditional_form_logic.sql`
- Table: `form_conditional_logic_rules`
- Rule sets are locked to both `form_template_id` and `form_template_version_id` so in-flight forms keep the logic they started with.
- Rules are stored as JSONB with explicit source question, operator, and target effects.

## API, Validation, And RBAC

Forms routes added:

- `GET /forms/conditional-logic`
- `POST /forms/conditional-logic`
- `PATCH /forms/conditional-logic/:id`
- `POST /forms/conditional-logic/:id/submit`
- `POST /forms/conditional-logic/:id/approve`
- `POST /forms/conditional-logic/:id/activate`
- `POST /forms/conditional-logic/:id/return`
- `PATCH /forms/conditional-logic/:id/visibility`
- `POST /forms/conditional-logic/:id/archive`
- `POST /forms/conditional-logic/:id/preview`

Permissions:

- `forms.conditional_read`
- `forms.conditional_create`
- `forms.conditional_update`
- `forms.conditional_submit`
- `forms.conditional_approve`
- `forms.conditional_return`
- `forms.conditional_override`
- `forms.conditional_archive`

## State Machine

Package: `@bimebazar/form-conditional-logic-workflow`

Every state returns:

- `status`
- `owner`
- `nextAction`

Main path:

`draft -> submitted -> approved -> active`

Supported control paths:

- return to revision
- visibility override
- archive

## Frontend Scaffold

Local page:

- `temp-conditional-logic.html`

It lets HR users create a rule set, preview answers, move it through review, override visibility, and write audit events.

## Audit And Notifications

Audit action names:

- `form_conditional_logic.created`
- `form_conditional_logic.updated`
- `form_conditional_logic.submitted`
- `form_conditional_logic.approved`
- `form_conditional_logic.activated`
- `form_conditional_logic.returned`
- `form_conditional_logic.visibility_changed`
- `form_conditional_logic.archived`

Notification hook:

- `notifyFormConditionalLogicChanged`

## Tests And Seed Data

Tests cover:

- state shape
- submit/approve/activate
- return
- visibility override
- show/hide/require/optional rule evaluation
- intentionally selected `0` as a valid answer

Seed rule:

- `show_manager_comment_for_low_score`
