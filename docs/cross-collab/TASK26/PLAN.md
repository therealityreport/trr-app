# Concerns remediation and Screenalytics contract lock — Task 26 Plan

Repo: TRR-APP
Last updated: 2026-04-09

## Goal
Adopt the backend-owned retirement contract in the admin UI, remove capped gallery retrieval assumptions, and replace the most brittle source-shape tests with behavior-oriented coverage.

## Status Snapshot
Pending backend and transitional Screenalytics contract changes.

## Scope

### Phase 1: Gallery + admin adoption
Consume backend cursor-based gallery responses and remove UI assumptions tied to capped limit/offset loops.

Files to change:
- `apps/web/src/lib/admin/paginated-gallery-fetch.ts`
- `apps/web/src/app/api/admin/trr-api/shows/[showId]/assets/route.ts`
- `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/route.ts`
- `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`

### Phase 2: Brittle test reduction
Replace source-shape tests cited in `CONCERNS.md` with shared helper or behavior-oriented tests so refactors stop failing on file text alone.

Files to change:
- `apps/web/tests/show-gallery-pagination.test.ts`
- `apps/web/tests/show-settings-links-fandom-visibility.test.ts`
- `apps/web/tests/show-bravo-video-thumbnail-wiring.test.ts`

## Out of Scope
- Inventing app-only backend contracts.
- Keeping capped gallery retrieval as a hidden client-side safety limit.

## Locked Contracts
- Backend gallery reads are producer-owned and now cursor-based.
- `screenalytics` retirement is the target state; any remaining app references should point at the TRR-APP workspace surface, not the old peer runtime UI.

## Acceptance Criteria
1. Admin gallery loading no longer depends on a fixed page-cap loop.
2. Shared helper tests replace the cited brittle source-text tests.
3. `pnpm -C apps/web run lint && pnpm -C apps/web exec next build --webpack && pnpm -C apps/web run test:ci` pass.
4. Task docs remain synchronized.
