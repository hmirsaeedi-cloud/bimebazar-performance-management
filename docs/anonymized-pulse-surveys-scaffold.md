# Anonymized Pulse Surveys Scaffold

Sprint: S10  
Module: Process  
Priority: P4 Future

## 1. Data Model And Migrations

- Adds `public.pulse_survey_processes` for anonymous pulse survey setup and aggregate release.
- Adds `public.pulse_survey_responses` with hashed respondent codes instead of employee IDs.
- Stores locked form version fields so in-flight pulse surveys keep their selected form version after template edits.
- Enforces a nonzero eligible audience and a minimum response count of at least 3.

## 2. API Routes, Validation, And RBAC

- Adds Process routes under `/processes/surveys/pulse`.
- Uses dedicated permissions: `process.pulse.read`, `create`, `update`, `start`, `submit`, `approve`, `return`, `override`, `release`, `complete`, and `cancel`.
- Release and approval are blocked until the anonymity guard passes.

## 3. State Machine Config

- New package: `@bimebazar/pulse-survey-workflow`.
- States: `draft`, `configured`, `active`, `anonymity_review`, `approved`, `returned`, `released`, `completed`, `visibility_changed`, `cancelled`.
- Every state returns `status`, `owner`, and `nextAction`.

## 4. Frontend Screens

- Adds `temp-pulse-surveys.html`.
- Lets HR create a pulse survey, start it, add anonymous sample responses, approve, release aggregates, change visibility, complete, or cancel.

## 5. Audit Log And Notifications Hooks

- Every create, update, submit, approve, return, release, override, visibility change, complete, and cancel writes an audit event.
- Adds `notifyPulseSurveyChanged` as the S10 notification hook.

## 6. Tests And Seed Data

- Adds workflow tests for state coverage, full release flow, return ownership, visibility override, zero-eligible guard, anonymity release guard, and aggregation.
- Migration seeds one configured S10 pulse survey if form templates and active profiles exist.
