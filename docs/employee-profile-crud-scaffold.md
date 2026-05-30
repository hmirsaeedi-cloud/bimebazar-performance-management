# Employee Profile CRUD Scaffold

Sprint: S1  
Priority: P1 Critical  
Module: Profiles

## Scope

This scaffold implements manual employee profile management for HR Admin and scoped HRBP users:

- Supabase-backed employee profile data model.
- Business Unit → Department → Team hierarchy.
- Manual create, read, update, and deactivate profile flows.
- Supabase Auth user creation for newly created employees.
- RBAC middleware for every profile route.
- Immutable audit entries for create/update/deactivate actions.
- Profile status state machine with `status`, `owner`, and `nextAction`.
- Temporary local HR Admin UI at `/temp-profiles.html`.

## Build Order

1. Apply `db/migrations/002_employee_profile_crud.sql`.
2. Seed/default org units from `db/seeds/profile_seed.json`.
3. Use `packages/profile-workflow` for profile lifecycle decisions.
4. Mount `profileRouter` from `apps/api/src/profiles/profile.routes.ts`.
5. Build the permanent Next.js screens from the temporary profile page workflow.
6. Add integration tests with a Supabase local or hosted test project.

## API Surface

- `GET /profiles/org-units` requires `org_units.read`.
- `GET /profiles` requires `profiles.read`.
- `POST /profiles` requires `profiles.create`.
- `GET /profiles/:id` requires `profiles.read`.
- `PATCH /profiles/:id` requires `profiles.update`.
- `POST /profiles/:id/deactivate` requires `profiles.deactivate`.

## Acceptance Criteria Mapping

- Role permissions are enforced by `requirePermission` in `apps/api/src/middleware/rbac.ts`.
- Validation lives in `apps/api/src/profiles/profile.schemas.ts`.
- Audit writes are called from `apps/api/src/profiles/profile.service.ts`.
- State transitions live in `packages/profile-workflow/src/profileWorkflow.mjs`.
- Supabase RLS policies are included in `db/migrations/002_employee_profile_crud.sql`.

## PRD Edge Cases Covered

- Cascading org consistency is validated: selected team must belong to selected department and BU.
- Manager/team/department/BU fields are explicit profile references for routing later workflows.
- Deactivation is a state transition and writes an audit event.
- Manager change is audited, preserving data needed for future process ownership rules.

## Next Hardening

- Add circular manager detection before bulk import and before manager updates.
- Add server-side HRBP scope checks for updates beyond RLS.
- Replace the temporary HTML screen with the permanent Next.js employee settings page.
- Add welcome email delivery once the notifications module is implemented.
