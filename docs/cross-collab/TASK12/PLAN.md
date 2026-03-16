# Cast Screen-Time Analytics — Task 12 Plan

Repo: TRR-APP
Last updated: 2026-03-16

## Goal
Cast Screen-Time Analytics

## Status Snapshot
The admin surface now supports persisted suggestion and unknown-review actions, title-card match review, cache/progress visibility, and an env-backed rollback gate while preserving promo assets as independent reports.

## Scope

### Phase 7: Closure Tooling
Close the remaining app-owned cast-screentime gaps by adding a real feature-flag rollback gate and an explicit operator acceptance checklist for deployed validation.

Files to change:
- `apps/web/src/app/admin/cast-screentime/page.tsx`
- `apps/web/src/app/admin/cast-screentime/CastScreentimePageClient.tsx`
- `apps/web/src/app/api/admin/trr-api/cast-screentime/[...path]/route.ts`
- `apps/web/src/lib/server/admin/cast-screentime-access.ts`
- `apps/web/tests/cast-screentime-proxy-route.test.ts`
- `docs/cross-collab/TASK12/OPERATOR_ACCEPTANCE_CHECKLIST.md`
- `docs/cross-collab/TASK12/ACCEPTANCE_REPORT.md`

Delivered behavior:
- add an env-backed server-side gate for the cast-screentime admin page and proxy routes
- make rollback verification concrete through an operator acceptance checklist
- keep canonical/promo separation while making the new lane explicitly hideable for cutover rollback

## Out of Scope
- Items owned by other repos unless explicitly required.

## Locked Contracts
- Keep shared API/schema contracts synchronized across affected repos.
- UI reads and writes only through TRR-APP proxy routes to `TRR-Backend`.
- No screenalytics UI embedding or direct browser-to-screenalytics calls.

## Acceptance Criteria
1. TRR-APP changes complete and validated.
2. Cross-repo dependency order is respected.
3. Fast checks pass for TRR-APP.
4. Task docs remain synchronized.
