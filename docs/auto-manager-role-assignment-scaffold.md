# Auto Manager Role Assignment Scaffold

Sprint: S1  
Priority: P1 Critical  
Module: RBAC

## Scope

This scaffold assigns the computed `MANAGER` role from reporting relationships:

- If a profile has one or more active direct reports, create or reactivate `profile_roles` row `MANAGER` with `assignment_type = computed`.
- If a profile has zero active direct reports, revoke the computed `MANAGER` role.
- Manual `MANAGER` role assignment remains controlled by HR Admin and is not automatically revoked.

## 1. Data Model And Migrations

- Apply `db/migrations/004_auto_manager_role_assignment.sql`.
- Apply `db/migrations/005_profile_roles_manual_computed_coexist.sql`.
- Computed manager roles live in `public.profile_roles` with:
  - `role_code = 'MANAGER'`
  - `assignment_type = 'computed'`
  - `status = 'active' | 'revoked'`
- Manual `MANAGER` assignments coexist as separate `assignment_type = 'manual'` rows and are never auto-revoked.
- `app_private.active_direct_report_count(manager_user_id uuid)` counts active direct reports.
- `app_private.sync_computed_manager_role(manager_user_id uuid)` mirrors the same database-level behavior for later scheduled jobs.

## 2. API Routes, Validation, And RBAC Middleware

- `POST /rbac/sync-manager-roles` requires `rbac.sync_manager_roles`.
- Request body is validated:

```json
{
  "reason": "Manual HR Admin manager-role resync"
}
```

- The API calls `syncAllComputedManagerRoles`, which:
  - checks active employees and referenced managers,
  - assigns computed `MANAGER` when direct reports exist,
  - revokes computed `MANAGER` when no active direct reports remain,
  - leaves manual roles untouched.

## 3. State Machine Config

State lives in `packages/manager-role-workflow`:

- `not_manager`: owner `SYSTEM`, nextAction `direct_report_added`.
- `active_manager`: owner `SYSTEM`, nextAction `direct_report_removed`.
- `revoked_manager`: owner `SYSTEM`, nextAction `direct_report_added`.

Actions:

- `direct_report_added`
- `direct_report_removed`
- `resync_manager_role`
- `override_manager_role`

Every state object returns explicit `status`, `owner`, and `nextAction`.

## 4. Frontend Screens And Components

- Temporary local page: `/temp-rbac.html`.
- It shows manager candidates, active direct report counts, computed role status, and last sync changes.
- It is reachable from the product workspace and the temporary Profiles page.

## 5. Audit Log And Notifications Hooks

- When a computed role changes, the service writes:
  - `rbac.manager_role_auto_assigned`
  - `rbac.manager_role_auto_revoked`
- Manual full resync writes:
  - `rbac.manager_roles_resynced`
- Audit metadata includes:
  - `owner`
  - `nextAction`
  - `assignmentType`
  - `roleCode`
  - `directReportCount`
  - checked/changed summary for full syncs
- `notifyManagerRoleChanged` is a stable hook for the later in-app notifications module.

## API Surface

- `POST /rbac/sync-manager-roles` requires `rbac.sync_manager_roles`.

## 6. Tests And Seed Data

- `packages/manager-role-workflow/tests/managerRoleWorkflow.test.mjs` covers:
  - every state shape,
  - auto-assignment,
  - auto-revocation,
  - HR Admin override state,
  - invalid transitions.
- `db/seeds/manager_role_seed.json` describes the initial direct-report scenario.

## Acceptance Criteria Mapping

- Role permissions are enforced for every RBAC route and action through `requirePermission`.
- Every computed-role assignment, revocation, override/resync summary, and visibility-sensitive role status change writes an audit event.
- State transitions are represented as explicit `status`, `owner`, and `nextAction` values.

## PRD Edge Case Notes

- Manager exit/deactivation can be detected because deactivation triggers resync of that manager and their former manager chain.
- Reassignment of in-flight forms is intentionally left for Process Engine S2/S5; this scaffold records the role change and audit trail needed by that later workflow.
