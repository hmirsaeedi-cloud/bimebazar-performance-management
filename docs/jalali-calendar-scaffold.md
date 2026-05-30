# Jalali Calendar Throughout Scaffold

Module: Foundation  
Priority: P1 (Critical)  
Sprint: S1

## 1. Data Model And Migrations

- Store dates in Supabase as PostgreSQL `date` / ISO `YYYY-MM-DD`.
- Add profile preferences:
  - `preferred_calendar`: `jalali` by default.
  - `preferred_locale`: `fa-IR` by default.
  - `date_display_timezone`: `Asia/Tehran` by default.
- Keep Jalali conversion in application utilities, not in scattered UI code.

## 2. API Routes, Validation, And RBAC Middleware

- Profile create, update, and deactivate requests accept Jalali dates such as `1403-01-01`.
- API validation converts Jalali input to Gregorian ISO before writing to Supabase.
- Existing profile RBAC permissions still protect create, update, list, read, deactivate, and org-unit routes.

## 3. State Machine Config

Calendar handling is a foundation service, so it does not introduce a new approval workflow. Features using date transitions must still emit:

- `status`: the feature-specific state.
- `owner`: the accountable role.
- `nextAction`: the next expected action.

## 4. Frontend Screens And Components

- Temporary profile admin page now asks for a Jalali join date.
- The Next.js user profile query includes calendar and locale preferences.
- Future date pickers should use the shared `@bimebazar/calendar-utils` package.

## 5. Audit Log And Notification Hooks

- Profile create, update, and deactivate audit events remain unchanged.
- Any future visibility change caused by calendar-sensitive deadlines must write an audit event with the rendered Jalali date in metadata.

## 6. Tests And Seed Data

- `packages/calendar-utils` covers Jalali-to-Gregorian conversion, Gregorian-to-Jalali conversion, round trips, and invalid dates.
- Existing seeded profiles default to Jalali calendar, Persian locale, and Tehran timezone through the migration defaults.
