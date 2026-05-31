# Jalali Calendar Throughout Scaffold

Module: Core  
Priority: P1 (Critical)  
Sprint: S1  
Impact: 10/10  
Effort: 6/10  
Score: 14

## 1. Data Model And Migrations

- Store dates in Supabase as PostgreSQL `date` / ISO `YYYY-MM-DD`.
- Add profile preferences:
  - `preferred_calendar`: `jalali` by default.
  - `preferred_locale`: `fa-IR` by default.
  - `date_display_timezone`: `Asia/Tehran` by default.
- Add `calendar_preference_status`:
  - `defaulted`
  - `user_configured`
  - `hr_override_pending`
  - `hr_overridden`
- Add Core permissions:
  - `core.calendar.read`
  - `core.calendar.update`
  - `core.calendar.override`
- Keep Jalali conversion in application utilities, not in scattered UI code.

## 2. API Routes, Validation, And RBAC Middleware

- Profile create, update, and deactivate requests accept Jalali dates such as `1403-01-01`.
- API validation converts Jalali input to Gregorian ISO before writing to Supabase.
- Existing profile RBAC permissions still protect create, update, list, read, deactivate, and org-unit routes.
- `GET /core/calendar` requires `core.calendar.read`.
- `PATCH /core/calendar` requires `core.calendar.update`.
- `PATCH /core/calendar/users/:userId` requires `core.calendar.override`.
- Core preference payload validation enforces supported calendars, locales, and timezones.

## 3. State Machine Config

Calendar preference state lives in `packages/calendar-preferences-workflow`:

- `defaulted`: owner `EMPLOYEE`, nextAction `user_update`.
- `user_configured`: owner `EMPLOYEE`, nextAction `user_update`.
- `hr_override_pending`: owner `HR_ADMIN`, nextAction `approve_hr_override`.
- `hr_overridden`: owner `HR_ADMIN`, nextAction `user_update`.

Every state returns explicit `status`, `owner`, and `nextAction`.

## 4. Frontend Screens And Components

- Temporary profile admin page now asks for a Jalali join date.
- Temporary calendar settings page: `/temp-calendar.html`.
- The Next.js user profile query includes calendar and locale preferences.
- Future date pickers should use the shared `@bimebazar/calendar-utils` package.

## 5. Audit Log And Notification Hooks

- Profile create, update, and deactivate audit events remain unchanged.
- Any future visibility change caused by calendar-sensitive deadlines must write an audit event with the rendered Jalali date in metadata.
- Calendar preference updates write:
  - `core.calendar_preferences.updated`
  - `core.calendar_preferences.overridden`
- Audit metadata includes `owner`, `nextAction`, previous preferences, and next preferences.
- `notifyCalendarPreferenceChanged` is a stable hook for the later notification system.

## 6. Tests And Seed Data

- `packages/calendar-utils` covers Jalali-to-Gregorian conversion, Gregorian-to-Jalali conversion, round trips, and invalid dates.
- `packages/calendar-preferences-workflow` covers preference states, user update, HR override approval, and invalid transitions.
- Existing seeded profiles default to Jalali calendar, Persian locale, and Tehran timezone through the migration defaults.

## Acceptance Criteria Mapping

- Role permissions are enforced for every Core calendar route and action.
- Every update and HR override writes an audit event, and future submit/approve/return flows that depend on calendar visibility should include rendered Jalali metadata.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.
