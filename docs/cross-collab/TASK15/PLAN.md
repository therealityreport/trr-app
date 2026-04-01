# Credits slug and IMDb refresh — Task 15 Plan

Repo: TRR-APP
Last updated: 2026-03-30

## Goal
Credits slug and IMDb refresh

## Status Snapshot
Implementation complete; targeted app validation passed.

## Scope

### Phase 1: Implement
Implement the `/credits` slug, `/cast` redirects, new credits proxy, show/season crew row rendering, and person-credit cast classification fixes.

Files to change:
- `apps/web/src/lib/admin/show-admin-routes.ts`
- `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
- `apps/web/src/app/admin/trr-shows/[showId]/[showSection]/page.tsx`
- `apps/web/src/app/admin/trr-shows/[showId]/[showSection]/[seasonTab]/page.tsx`
- `apps/web/src/app/api/admin/trr-api/shows/[showId]/credits/route.ts`
- `apps/web/src/app/api/admin/trr-api/people/[personId]/credits/route.ts`
- `apps/web/src/lib/server/trr-api/trr-show-read-route-cache.ts`
- `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`

## Out of Scope
- Items owned by other repos unless explicitly required.

## Locked Contracts
- Keep shared API/schema contracts synchronized across affected repos.

## Acceptance Criteria
1. TRR-APP changes complete and validated.
2. Cross-repo dependency order is respected.
3. Fast checks pass for TRR-APP.
4. Task docs remain synchronized.
