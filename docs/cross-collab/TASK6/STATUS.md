# Status — Task 6 (Bravo Import + Cast Eligibility + Videos/News)

Repo: TRR-APP
Last updated: February 11, 2026

## Phase Status

| Phase | Description | Status | Notes |
|------:|-------------|--------|-------|
| 1 | Bravo proxy routes | Implemented | New show-level bravo preview/commit/videos/news route handlers |
| 2 | Show page Bravo + tab changes | Implemented | Sync button/modal, NEWS tab, assets `IMAGES/VIDEOS/BRAND` |
| 3 | Season videos tab | Implemented | Added `VIDEOS` tab with persisted bravo videos by season |
| 4 | Person videos/news tabs | Implemented | Added tabs + Bravo profile-image fallback |
| 5 | Cast eligibility defaults | Implemented | show cast route + repository gating changes |
| 6 | Targeted tests | Implemented | cast default + bravo proxy route tests passing |

## Blockers

None.

## Recent Activity

- February 11, 2026: Sync-by-Bravo season selector now excludes placeholder seasons without eligibility evidence.
  - Eligible season rule: `episode_count > 1` OR known premiere date.
  - Updated show page modal dropdown/default season logic so placeholder seasons (e.g., RHOSLC S7 with no premiere and no episode evidence) are not selectable.
  - Added empty-state handling (`No eligible seasons`) and guardrails in preview/commit.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- February 11, 2026: Updated image import drawer metadata controls to remove manual people tagging and add kind-aware third dropdown behavior.
  - For `Cast Photos`, third dropdown now lists season cast members (Full-time/Friends) plus `Group Picture (All Full-time)`.
  - For `Logo`, third dropdown now uses `SOURCE` / `SHOW` options.
  - Removed per-image `Tag People` control and manual asset name entry from the import flow.
  - File: `apps/web/src/components/admin/ImageScrapeDrawer.tsx`
- February 11, 2026: Refresh log completion UX refinement.
  - Completed topic cards now collapse to one-line status rows (e.g. `SHOWS: Done ✔️`) and automatically move to the bottom.
  - Active/incomplete topics remain expanded above with sub-jobs.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- February 11, 2026: Optimized full show refresh orchestration to reduce long runtimes.
  - Full `Refresh` now runs cast credits without per-person deep profile/media refresh (removes duplicate heavy sync step).
  - Full `Refresh` photo step now runs in fast mode:
    - reduced media crawl depth (`limit_per_source=20`, `imdb_mediaindex_max_pages=6`)
    - skips `auto-count` and `word detection` during this path
  - Cast-tab refresh still supports deep cast profile/media sync when explicitly triggered.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- February 11, 2026: Redesigned show refresh log UX for readability.
  - Refresh log now renders fixed topic containers once each: `SHOWS`, `SEASONS`, `EPISODES`, `PEOPLE`, `MEDIA`, `BRAVOTV`.
  - Each topic includes nested sub-job updates under a single category card (instead of repeated flat category rows).
  - Added message normalization (UUID redaction in log lines) and latest-status summary per topic.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- February 11, 2026: Wired Bravo workflow updates into the `BRAVOTV` topic log bucket.
  - Preview/commit now write explicit Bravo status lines (`loading`, `ready`, `complete`, `failed`).
- February 11, 2026: Added Sync-by-Bravo preflight gating on show page.
  - `Sync by Bravo` is now blocked until synced seasons, episodes, and cast are present.
  - UI shows explicit missing prerequisites (e.g. `missing: seasons, episodes, cast`).
  - Preview/commit errors now surface backend `detail` messages.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- February 11, 2026: Added in-depth refresh activity log on show page header.
  - While refresh is running, clicking or hovering `Refresh` opens a live stage log panel with counts/percentages.
  - Log entries stream from existing refresh SSE progress stages and include target-level completion/failure summaries.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- February 11, 2026: Verification for this update:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only; pre-existing `no-img-element`)
  - `pnpm -C apps/web exec vitest run tests/show-cast-route-default-min-episodes.test.ts tests/show-bravo-videos-proxy-route.test.ts` (`3 passed`)
- February 11, 2026: Implemented proxy/UI/repository updates and added route tests.
- February 11, 2026: Validation complete:
  - `pnpm -C apps/web exec vitest run tests/show-cast-route-default-min-episodes.test.ts tests/show-bravo-videos-proxy-route.test.ts` (3 passed)
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/cast/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/import-bravo/commit/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/bravo/videos/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/bravo/news/route.ts' 'src/lib/server/trr-api/trr-shows-repository.ts'` (warnings only)
  - `pnpm -C apps/web exec tsc --noEmit` currently fails on pre-existing `TS1501` at `src/lib/server/trr-api/trr-shows-repository.ts:844`
- February 11, 2026: Import-by-Bravo modal now separates preview content into `Show Images`, `News`, and `Videos`, includes posted dates, and adds season filter defaulting to latest season available.
- February 11, 2026: Import-by-Bravo modal now shows a `Cast Member URLs` section (name + canonical URL, with discovered URL fallback) before preview `News` and `Videos` sections.
- February 11, 2026: Fixed Sync-by-Bravo modal preview UX failure mode in `/admin/trr-shows/[showId]`:
  - split loading state (`Previewing...` vs `Syncing...`) so Preview no longer appears to run a commit.
  - moved preview error/notice surface directly under URL input (previously easy to miss at bottom).
  - retain existing preview data on failed retries instead of clearing immediately.
  - filtered `Show Images` candidates to exclude images already tied to preview News/Videos, preventing accidental import of article/video thumbnails.
- February 11, 2026: Sync-by-Bravo modal `Show Images` now supports per-image media-type selection before commit.
  - Added type dropdown on each candidate (`Poster`, `Backdrop`, `Logo`, `Episode Still`, `Cast`, `Promo`, `Intro`, `Reunion`, `Other`).
  - Commit payload now sends `selected_show_images: [{url, kind}]` (while still including `selected_show_image_urls[]` for compatibility).
  - Added default type inference from image alt/url (`logo`, `key art/poster`, `backdrop`, etc.) so users can quickly adjust instead of classifying from scratch.
- February 11, 2026: Updated Sync-by-Bravo popup to a 2-step workflow.
  - Step 1 (Preview/Edit): bottom primary action now `Next` (instead of immediate sync).
  - Step 2 (Confirm): shows cast members being synced + selected show images (with chosen kind/type) before final commit.
  - Footer actions are now step-aware (`Cancel/Next` then `Back/Sync by Bravo`).
- February 11, 2026: Moved show `Logos` gallery block from Assets `Images` sub-tab to Assets `Brand` sub-tab.
  - `Images` now excludes the `Logos` section.
  - `Brand` now shows `Logos` grid above `ShowBrandEditor`.
  - Added Brand-view gallery load path so logos appear even if Images view wasn't opened first.
- February 11, 2026: Sync-by-Bravo preview/commit now sends season context for video import.
  - Preview payload includes `season_number` defaulted to latest known show season.
  - Commit payload includes `season_number` from selected preview season (fallback to latest season).
  - This scopes Bravo video ingest to the working season (e.g., Summer House Season 10).
- February 11, 2026: Fixed runtime `ReferenceError` in show detail page (`defaultSyncBravoSeasonNumber` used before initialization).
  - Moved `defaultSyncBravoSeasonNumber` memo above `previewSyncByBravo`/`commitSyncByBravo` callbacks.
  - Removed duplicate lower-scope declaration.
- February 11, 2026: Sync-by-Bravo modal now auto-fills Bravo URL from show name slug and auto-runs preview when opened.
  - Added inferred URL helper (`https://www.bravotv.com/{slug}` from show name).
  - Removed manual `Bravo Show URL` input from Step 1.
  - Step 1 now starts with `Show Name` and data sections (Description/Airs/Images/News/Videos) plus `Refresh Preview` button.
  - Step 2 header block now shows `Show Name` (no raw URL field).
