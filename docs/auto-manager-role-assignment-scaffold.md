# Auto Manager Role Assignment Scaffold

Sprint: S1  
Priority: P1 Critical  
Module: RBAC

## Scope

This scaffold assigns the computed `MANAGER` role from reporting relationships:

- If a profile has one or more active direct reports, create or reactivate `profile_roles` row `MANAGER` with `assignment_type = computed`.
- If a profile has zero active direct reports, revoke the computed `MANAGER` role.
- Manual `MANAGER` role assignment remains controlled by HR Admin and is not automatically revoked.

## Build Order

1. Apply `db/migrations/004_auto_manager_role_assignment.sql`.
2. Use `packages/manager-role-workflow` for manager-role lifecycle decisions.
3. Call `syncComputedManagerRole` after profile create/update/deactivate when `manager_id` changes.
4. Expose `POST /rbac/sync-manager-roles` for HR Admin reconciliation.
5. Add a scheduled job later for nightly sync.

## API Surface

- `POST /rbac/sync-manager-roles` requires `rbac.sync_manager_roles`.

## Acceptance Criteria Mapping

- RBAC route is protected by `requirePermission`.
- Assignment/revocation writes audit events when the computed role changes.
- State transitions live in `packages/manager-role-workflow/src/managerRoleWorkflow.mjs`.
- Supabase functions live in `db/migrations/004_auto_manager_role_assignment.sql`.

## PRD Edge Case Notes

- Manager exit/deactivation can be detected because deactivation triggers resync of that manager and their former manager chain.
- Reassignment of in-flight forms is intentionally left for Process Engine S2/S5; this scaffold records the role change and audit trail needed by that later workflow.
