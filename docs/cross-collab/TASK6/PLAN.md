# Bravo Import + Cast Eligibility + Videos/News — Task 6 Plan

Repo: TRR-APP
Last updated: February 25, 2026

## Goal

Wire admin proxy routes and UI for persisted Bravo content, and enforce default cast eligibility (`minEpisodes=1`) in app-facing show cast responses.

## Scope

1. Add proxy routes:
- `POST /api/admin/trr-api/shows/[showId]/import-bravo/preview`
- `POST /api/admin/trr-api/shows/[showId]/import-bravo/commit`
- `GET /api/admin/trr-api/shows/[showId]/bravo/videos`
- `GET /api/admin/trr-api/shows/[showId]/bravo/news`
2. Show page updates (`[showId]/page.tsx`):
- `Sync by Bravo` button under `Refresh`
- import/sync modal with URL, previewed description/airs, selectable image list
- top-level `NEWS` tab
- assets sub-tabs: `IMAGES`, `VIDEOS`, `BRAND`
3. Season page updates (`seasons/[seasonNumber]/page.tsx`):
- top-level `VIDEOS` tab sourced from persisted Bravo videos filtered by season
4. Person page updates (`people/[personId]/page.tsx`):
- add `VIDEOS` and `NEWS` tabs
- cover-photo fallback includes `profile_image_url['bravo']`
5. Cast eligibility:
- show cast route defaults to min-episodes filtering
- repository show/season cast outputs exclude no-episode-evidence members

## Out of Scope

- screenalytics runtime changes
- live scraping in UI render path

## Acceptance Criteria

1. Bravo proxy routes work with admin auth and backend service token.
2. Show/season/person pages render persisted Bravo news/videos tabs.
3. Show page has `Sync by Bravo` under `Refresh` and import modal workflow.
4. Show cast defaults to `minEpisodes=1` behavior.
5. App targeted tests pass for new route behavior.

## RHOSLC Closeout Follow-up (2026-02-24)

- Consume stabilized show/season stream behavior with request-id/heartbeat diagnostics.
- Complete RHOSLC manual closeout in normal + degraded modes.
- Person refresh-stream first-event behavior resolved and re-verified (normal + degraded evidence captured).
- Closeout decision: **GO**.

## Fandom Sync Type Stabilization Addendum (2026-02-25)

- Stabilize Fandom sync type safety in app-only scope without backend contract changes.
- Add deterministic typecheck lanes excluding generated `.next*` artifacts:
  - `apps/web/tsconfig.typecheck.json`
  - `apps/web/tsconfig.typecheck.fandom.json`
- Consolidate duplicate Fandom Sync payload/section interfaces into shared module:
  - `apps/web/src/lib/admin/fandom-sync-types.ts`
- Apply shared types to:
  - `apps/web/src/components/admin/FandomSyncModal.tsx`
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - Fandom import proxy routes (person + season preview/commit).
- Add targeted CI gate:
  - `pnpm run typecheck:fandom` in `TRR-APP/.github/workflows/web-tests.yml` full lane.
