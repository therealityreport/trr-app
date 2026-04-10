# Final Supabase connection audit and donor transition inventory — Task 23 Plan

Repo: TRR-APP
Last updated: 2026-04-09

## Goal
Confirm the app’s live Postgres/Supabase contract, remove stale env documentation, and capture the app-visible parity surface the DeepFace reset must preserve.

## Status Snapshot
Implemented. The app’s raw Postgres runtime was already canonical. This task clarified the active server-side Supabase auth envs, removed stale browser Supabase requirements from the live contract, and removed a stale `SCREENALYTICS_API_URL` app env entry.

## Scope

### Phase 1: Env/docs cleanup
Files changed:
- `apps/web/.env.example`
- `apps/web/README.md`
- `apps/web/POSTGRES_SETUP.md`

### Phase 2: App-facing parity checklist
Document which visible admin flows still depend on backend behavior that ultimately reaches `screenalytics` today.

## App-Facing Flows To Preserve In The DeepFace Reset
- `/screenalytics` picker and its handoff into show workspaces
- Person-gallery facebank seed toggle proxy flow
- Admin image-analysis flows that surface people count / crop / thumbnail behavior through backend routes
- Admin cast-screentime flow exposed through `/admin/cast-screentime` and `/api/admin/trr-api/cast-screentime/[...path]`

## Live Env Classification
- `TRR_DB_URL`: primary server-side Postgres runtime env
- `TRR_DB_FALLBACK_URL`: optional secondary runtime fallback
- `TRR_CORE_SUPABASE_URL` and `TRR_CORE_SUPABASE_SERVICE_ROLE_KEY`: active server-side Supabase auth/admin envs
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: retired browser envs; no longer part of the active app runtime contract
- `SCREENALYTICS_API_URL`: removed from `.env.example` because no active app code reads it

## Locked Contracts
- App runtime raw Postgres remains `TRR_DB_URL` then `TRR_DB_FALLBACK_URL`.
- Server-side Supabase admin/auth stays server-only.
- Browser `NEXT_PUBLIC_SUPABASE_*` vars are not part of the live app contract.

## Acceptance Criteria
1. App docs no longer advertise stale screenalytics envs the app does not read.
2. Server-side Supabase auth/admin envs are documented as active dependencies.
3. The app-facing parity surface for the DeepFace reset is explicit.
