# Bravo Import + Cast Eligibility + Videos/News — Task 6 Plan

Repo: TRR-APP
Last updated: February 11, 2026

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
