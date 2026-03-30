# Show refresh full pipeline gallery media — Task 13 Plan

Repo: TRR-APP
Last updated: 2026-03-27

## Goal
Show refresh full pipeline gallery media

## Status Snapshot
Implemented and validated.

## Scope

### Phase 1: Implement
Keep the header refresh control modal-only, update its wording to point to the
Health Center, and extend full refresh so it runs unified refresh plus a gallery
media fast pass using the backend `skip_cast_photos` contract.

Files to change:
- `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- `apps/web/tests/show-refresh-health-center-wiring.test.ts`

## Out of Scope
- Items owned by other repos unless explicitly required.

## Locked Contracts
- Keep shared API/schema contracts synchronized across affected repos.

## Acceptance Criteria
1. TRR-APP changes complete and validated.
2. Cross-repo dependency order is respected.
3. Fast checks pass for TRR-APP.
4. Task docs remain synchronized.

## Delivered
- Updated Health Center opener copy to `Open Refresh Center` / `View Refresh Center`.
- Fixed fast photo mode payload drift so auto-count is skipped in fast mode.
- Added full-refresh orchestration for unified refresh followed by gallery media fast pass.
- Updated frontend wiring tests for the gallery pass and explicit opener copy.
