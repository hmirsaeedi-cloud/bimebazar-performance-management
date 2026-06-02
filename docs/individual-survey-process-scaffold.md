# Individual Process (Surveys) Scaffold

Module: Process  
Priority: P2  
Sprint: S6

## 1. Data Model And Migrations

Migration `040_individual_survey_process.sql` adds:

- `individual_survey_processes`: one survey process with explicit `status`, `owner_role`, `next_action`, target employees, visibility, and locked form version.
- `individual_survey_responses`: one response per employee per survey.
- RLS and grants for authenticated users and service role.
- Granular permissions under `process.survey.*`.

The migration keeps `locked_form_template_version_id = form_template_version_id`, so in-flight surveys keep the selected form version even after template edits.

## 2. API Routes, Validation, And RBAC

Routes are mounted under `/processes/surveys/individual` and use `requirePermission`:

- `GET /processes/surveys/individual`
- `POST /processes/surveys/individual`
- `PATCH /processes/surveys/individual/:surveyId`
- `POST /processes/surveys/individual/:surveyId/start`
- `PATCH /processes/surveys/individual/:surveyId/visibility`
- `POST /processes/surveys/individual/:surveyId/complete`
- `POST /processes/surveys/individual/:surveyId/cancel`
- `PATCH /processes/surveys/individual/responses/:responseId`
- `POST /processes/surveys/individual/responses/:responseId/submit`
- `POST /processes/surveys/individual/responses/:responseId/approve`
- `POST /processes/surveys/individual/responses/:responseId/return`

Zod schemas reject empty recipient arrays before a process can be created or started.

## 3. State Machine

Package: `@bimebazar/individual-survey-process-workflow`

States always return:

```json
{ "status": "active", "owner": "EMPLOYEE", "nextAction": "submit" }
```

Core flow:

`draft -> configured -> active -> submitted -> approved -> completed`

Return flow:

`submitted -> returned -> submitted`

## 4. Frontend Scaffold

Temporary review page:

`/temp-individual-surveys.html`

It can create a draft, lock a form version, start responses, submit, approve, return, complete, cancel, and change visibility.

## 5. Audit And Notifications

Every create, update, submit, approve, return, override, and visibility action writes an `audit_events` row.

Notification hook:

`notifyIndividualSurveyChanged`

## 6. Tests And Seed Data

Workflow tests cover:

- explicit status, owner, and nextAction
- submit, approve, complete chain
- zero eligible employee guard
- form version locking

The migration seeds one configured survey when active employees and form versions exist.
