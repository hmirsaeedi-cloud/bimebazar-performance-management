# Role-Based Access Control Scaffold

Sprint: S1  
Priority: P1 Critical  
Module: RBAC

## Scope

This scaffold implements the PRD's five role model:

- `EMPLOYEE`
- `MANAGER`
- `NEXT_LEVEL_MANAGER`
- `HRBP`
- `HR_ADMIN`

Users can hold multiple active roles at once through `public.profile_roles`. Permissions are derived from the union of all active role assignments.

## Build Order

1. Apply `db/migrations/003_rbac_five_roles.sql`.
2. Use `packages/rbac-workflow` for assignment lifecycle decisions.
3. Load users through `apps/api/src/db/repository.ts` so assigned roles become permissions.
4. Mount `rbacRouter` from `apps/api/src/rbac/rbac.routes.ts`.
5. Build a permanent Next.js RBAC settings page for HR Admin.
6. Add integration tests with a Supabase local or hosted test project.

## API Surface

- `GET /rbac` requires `rbac.read`.
- `GET /rbac/users/:userId/roles` requires `rbac.read`.
- `POST /rbac/users/:userId/roles` requires `rbac.assign_role`.
- `DELETE /rbac/users/:userId/roles/:role` requires `rbac.revoke_role`.

## Acceptance Criteria Mapping

- Role permissions are enforced by `requirePermission` on every RBAC route.
- Role assignment/revocation writes audit events through `writeAuditEvent`.
- State transitions live in `packages/rbac-workflow/src/rbacWorkflow.mjs`.
- Supabase RLS policies for `profile_roles` are in `db/migrations/003_rbac_five_roles.sql`.

## Notes

- `profiles.role_code` remains as a primary/default role for compatibility.
- `profile_roles` is the source for additive roles.
- `app_private.current_user_role()` prioritizes HR Admin, HRBP, Next Level Manager, Manager, then Employee.
- The next roadmap feature, auto manager role assignment, should write computed `MANAGER` rows into `profile_roles`.
