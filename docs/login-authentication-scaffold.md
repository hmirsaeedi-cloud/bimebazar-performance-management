# Login & Authentication Scaffold

Sprint: S1  
Priority: P1 Critical  
Module: Auth

## Scope

This scaffold establishes the first authentication slice for the BimeBazar Performance Management platform:

- Email/password login and logout through Supabase Auth.
- Session introspection through Supabase SSR clients and `auth.getClaims()`.
- Account creation by HR Admin only through trusted Supabase Admin calls.
- Central RBAC middleware for every auth route.
- Immutable audit events for auth and account lifecycle actions.
- A simple status/owner/nextAction state machine for account onboarding and login.
- Next.js login and current-user UI shells.
- Private Supabase Storage bucket scaffolding for profile documents.

## Build Order

1. Create a Supabase project and set the values in `.env.example`.
2. Apply `db/migrations/001_supabase_auth_foundation.sql`.
3. Create the seed HR Admin through Supabase Auth Admin, then insert its `public.profiles` row.
4. Mount `authRouter` in the Express app for trusted admin actions.
5. Use the Next.js Supabase clients in `apps/web/lib/supabase` for browser and server session work.
6. Keep authorization data in `public.profiles` and `auth.users.raw_app_meta_data`, not user-editable metadata.
7. Add integration tests once a Supabase local or hosted project is connected.

## Acceptance Criteria Mapping

- Role permissions are enforced by `requirePermission` in `apps/api/src/middleware/rbac.ts` after loading permissions from Supabase.
- Audit writes are centralized through `writeAuditEvent` and inserted into `public.audit_events`.
- State transitions are declared in `packages/auth-workflow/src/authWorkflow.mjs`.

## Supabase Security Notes

- `public.profiles` references `auth.users(id)` with `on delete cascade`.
- Every public table in the migration has RLS enabled.
- The private `profile-documents` bucket is protected through `storage.objects` policies.
- Upsert-style Storage replacement requires insert, select, and update policy coverage.
- New Supabase projects may not expose public tables to the Data API automatically; the migration includes explicit grants for `authenticated` and `service_role`.
- Deactivation updates platform status immediately, but existing JWTs can remain valid until expiry. Keep JWT expiry short for sensitive production use.
