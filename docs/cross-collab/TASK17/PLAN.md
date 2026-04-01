# Supabase trust-boundary hardening — Task 17 Plan

Repo: TRR-APP
Last updated: 2026-03-30

## Goal
Supabase trust-boundary hardening

## Status Snapshot
Implemented on 2026-03-30 for the app-owned migration slices. Survey schema unification remains deferred because app and backend survey tables are not contract-compatible yet.

## Scope

### Phase 1: Implement
Move app traffic off the direct server-side Supabase lane wherever a backend-owned surface exists:
- route `/api/shows/list` through TRR-Backend instead of the deleted `supabase-trr-core` client
- keep `supabase-trr-admin` only for auth shadow-mode verification
- move Flashback admin quiz/event mutations behind app-owned server routes that use Postgres
- keep end-user Flashback gameplay on its current browser-safe path for now

Files to change:
- `apps/web/src/app/api/shows/list/route.ts`
- `apps/web/src/lib/server/supabase-trr-core.ts`
- `apps/web/src/app/admin/games/flashback/page.tsx`
- `apps/web/src/app/api/admin/flashback/**`
- `apps/web/src/lib/server/admin/flashback-admin-repository.ts`
- `apps/web/tests/flashback-admin-routes.test.ts`

## Out of Scope
- Items owned by other repos unless explicitly required.
- Regenerating every generated admin inventory artifact in the same wave as this runtime migration.
- Survey schema cutover from `firebase_surveys` or normalized app tables to backend `surveys.*` without a dedicated compatibility migration.

## Locked Contracts
- Keep shared API/schema contracts synchronized across affected repos.
- `/api/shows/list` must consume backend `/api/v1/shows/list`.
- Flashback admin CRUD is server-owned; browser direct writes from the admin page are no longer the contract.

## Acceptance Criteria
1. TRR-APP changes complete and validated.
2. Cross-repo dependency order is respected.
3. Targeted app lint/tests pass for the changed routes and admin page.
4. Task docs remain synchronized.
