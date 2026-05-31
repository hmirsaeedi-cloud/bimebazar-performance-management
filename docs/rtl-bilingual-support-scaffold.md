# RTL + Bilingual Support Scaffold

Module: Core  
Priority: P1 (Critical)  
Sprint: S1  
Impact: 9/10  
Effort: 7/10  
Score: 11

## 1. Data Model And Migrations

- Store language preferences on `public.profiles`:
  - `preferred_language`: `fa` by default.
  - `text_direction`: `rtl` by default.
  - `language_preference_status`: `defaulted` by default.
- Keep Persian and English labels in application translation dictionaries, not hardcoded across pages.
- Add Core permissions:
  - `core.language.read`
  - `core.language.update`
  - `core.language.override`
- Persian defaults to RTL. English defaults to LTR.

## 2. API Routes, Validation, And RBAC Middleware

- `GET /core/language` requires `core.language.read`.
- `PATCH /core/language` requires `core.language.update`.
- `PATCH /core/language/users/:userId` requires `core.language.override`.
- Validation accepts only:
  - `preferredLanguage`: `fa`, `en`
  - `textDirection`: `rtl`, `ltr`
- If direction is omitted, the API derives it from language.

## 3. State Machine Config

Language preference state lives in `packages/language-preferences-workflow`:

- `defaulted`: owner `EMPLOYEE`, nextAction `user_update`.
- `user_configured`: owner `EMPLOYEE`, nextAction `user_update`.
- `hr_override_pending`: owner `HR_ADMIN`, nextAction `approve_hr_override`.
- `hr_overridden`: owner `HR_ADMIN`, nextAction `user_update`.

Every state returns explicit `status`, `owner`, and `nextAction`.

## 4. Frontend Screens And Components

- Temporary language settings page: `/temp-rtl.html`.
- The page switches `html[lang]` and `html[dir]` live for Persian/English preview.
- The page launcher links to Language + RTL beside Calendar Settings.
- Next.js user profile data includes language, text direction, and language preference status.

## 5. Audit Log And Notification Hooks

- User updates write `core.language_preferences.updated`.
- HR Admin overrides write `core.language_preferences.overridden`.
- Audit metadata includes `owner`, `nextAction`, previous preferences, and next preferences.
- `notifyLanguagePreferenceChanged` is a stable hook for later in-app/email notifications.

## 6. Tests And Seed Data

- `packages/language-preferences-workflow` tests state shape, user update, HR override approval, and invalid approval.
- New profiles default to Persian RTL through migration defaults and profile creation payloads.

## Acceptance Criteria Mapping

- Role permissions are enforced for every Core language route and action.
- Every user update and HR override writes an audit event; future submit/approve/return flows that alter language visibility should use the same audit metadata pattern.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
