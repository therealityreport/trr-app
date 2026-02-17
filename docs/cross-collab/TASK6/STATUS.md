# Status — Task 6 (Bravo Import + Cast Eligibility + Videos/News)

Repo: TRR-APP
Last updated: February 17, 2026

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

- February 17, 2026: Fixed person fandom ownership leakage and added deduced-family fallback for missing fandom pages.
  - Files:
    - `apps/web/src/lib/server/trr-api/fandom-ownership.ts`
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
    - `apps/web/src/app/api/admin/trr-api/people/[personId]/fandom/route.ts`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/tests/fandom-person-ownership.test.ts`
    - `apps/web/tests/person-fandom-route.test.ts`
  - Changes:
    - Enforced strict person-level fandom matching (no last-name-only pass-through).
    - Filtered person-gallery fandom images when source page owner does not match the requested person.
    - Added show-scoped inferred family fallback (`Mom/Dad/Brother/Sister/Sibling`) from cast-matrix role metadata when verified fandom profile data is unavailable.
    - Passed `showId` from people page to fandom route for scoped inference.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/lib/server/trr-api/trr-shows-repository.ts' 'src/lib/server/trr-api/fandom-ownership.ts' 'src/app/api/admin/trr-api/people/[personId]/fandom/route.ts' 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'tests/fandom-person-ownership.test.ts' 'tests/person-fandom-route.test.ts'` (pass; warning-only)
    - `pnpm -C apps/web exec vitest run tests/fandom-person-ownership.test.ts tests/person-fandom-route.test.ts` (pass)
    - `pnpm -C apps/web exec tsc -p tsconfig.json --noEmit --pretty false` (pass)

- February 17, 2026: Added cast-matrix sync admin workflow and season-scoped role filtering semantics.
  - Added new proxy route:
    - `POST /api/admin/trr-api/shows/[showId]/cast-matrix/sync`
    - file: `apps/web/src/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route.ts`
  - Updated show admin cast tab:
    - `Sync Cast Roles (Wiki/Fandom)` button
    - sync result panel with counts + unmatched names + missing season evidence
    - file: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - component: `apps/web/src/components/admin/CastMatrixSyncPanel.tsx`
  - Updated season filter role behavior to rely on scoped role response + global season-0 roles:
    - `apps/web/src/lib/admin/cast-role-filtering.ts`
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Updated links display to highlight person `bravo_profile` links with explicit badge while preserving review actions:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/show-cast-matrix-sync-proxy-route.test.ts tests/cast-matrix-sync-panel.test.tsx tests/cast-role-season-filtering.test.ts` (pass)
    - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)
    - `pnpm -C apps/web exec eslint src/app/admin/trr-shows/[showId]/page.tsx src/components/admin/CastMatrixSyncPanel.tsx src/lib/admin/cast-role-filtering.ts src/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route.ts` (warnings only; no errors)

- February 13, 2026: Implemented thumbnail-first gallery delivery + `Profile Pictures` category wiring across show/season/person.
  - Added `profile_picture` content type in advanced filters:
    - `apps/web/src/lib/admin/advanced-filters.ts`
    - `apps/web/src/components/admin/AdvancedFilterDrawer.tsx`
    - `apps/web/src/lib/gallery-filter-utils.ts` (includes legacy fallback for `context_type=profile` / `context_section=bravo_profile`)
  - Added `Profile Pictures` gallery sections:
    - Show assets page: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - Season assets page: `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - Person gallery: `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - Added thumbnail-first URL preference and render batching:
    - card URL precedence now includes `thumb_url` before larger URLs
    - Load More batching on show/season/person gallery grids
  - Added server-side source/pagination support in gallery proxy routes:
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/assets/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/route.ts`
    - `apps/web/src/app/api/admin/trr-api/people/[personId]/photos/route.ts`
  - Updated repository cast-photo precedence + fallback robustness:
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
    - Cast thumbnail/source precedence now prefers `profile_picture` (season-scoped first), then legacy Bravo profile fallback.
    - Removed reliance on missing `v_cast_photos.thumbnail_focus_*` columns in fallback query.
    - Added source-filter pagination options for show/season/person gallery fetches.
  - Validation:
    - `pnpm -C apps/web exec eslint ...` on touched files (pass; warnings only)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)

- February 12, 2026: Added person canonical-profile source-order controls (`tmdb -> fandom -> manual`) on the person admin page.
  - Added reorder UI (`Up`/`Down`) with `Save Order` / `Reset`.
  - Added persistence via `PATCH /api/admin/trr-api/people/[personId]` with repository update to `core.people.external_ids.canonical_profile_source_order`.
  - Canonical field resolution now uses saved source order instead of hardcoded priority.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/app/api/admin/trr-api/people/[personId]/route.ts' 'src/lib/server/trr-api/trr-shows-repository.ts'` (pass; warning-only)
    - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

- February 12, 2026: Fixed slow show-detail load by removing Bravo data from initial blocking fetch path.
  - Show page initial load no longer waits on `bravo/videos` + `bravo/news` requests.
  - Bravo data now lazy-loads only when needed (`NEWS` tab, `ASSETS -> VIDEOS`, or Health Center open), with in-flight request dedupe and manual force-refresh.
  - File:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Validation:
    - `npm run lint -- 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only)
    - `npx tsc --noEmit --pretty false` (pass)

- February 12, 2026: Removed cast photo lookup dependency on missing legacy columns.
  - `getPreferredCastPhotoMap` no longer selects `thumbnail_focus_x|y|zoom|crop_mode` from `core.v_cast_photos`, preventing repeated DB errors (`column ... does not exist`) and stabilizing cast fetch performance.
  - File:
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - Validation:
    - `npm run lint -- 'src/lib/server/trr-api/trr-shows-repository.ts'` (warning-only)

- February 12, 2026: Moved show-page health tooling into a dedicated popup launched by a health icon button under `Sync by Bravo`.
  - Popup includes `Content Health`, `Sync Pipeline`, `Operations Inbox`, and `Refresh Log`.
  - Removed inline health/pipeline/inbox sections from main show content area to reduce clutter.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`

- February 12, 2026: Implemented image-variant consumption + slug/breadcrumb routing layer updates from plan docs.
  - Show/season galleries now prefer persisted variant URLs (`crop_display_url/display_url` for cards, `crop_detail_url/detail_url` for lightbox) with original fallback.
  - Added server slug resolver endpoint:
    - `GET /api/admin/trr-api/shows/resolve-slug?slug=...`
  - Show + season pages now resolve non-UUID show URL slugs before API calls (supports `/admin/trr-shows/the-valley-persian-style` path shape).
  - Added breadcrumb alias routes:
    - `/admin/trr-shows/[showId]/media-gallery|media-videos|media-brand`
    - `/admin/trr-shows/[showId]/season-{n}/{tab}`
  - Added show-page ops UX slice:
    - `Content Health` strip
    - deterministic `Sync Pipeline` panel
    - `Operations Inbox` task queue.

- February 11, 2026: Improved image-import auto tagging and duplicate-link source attribution.
  - For `Cast Photos` + `OFFICIAL SEASON ANNOUNCEMENT`, import now auto-tags cast members when caption/context text includes their names (used when no explicit cast dropdown selection is set).
  - Duplicate linking now stores `source_url/source_domain` context from the active scrape URL.
  - Existing duplicate links now merge incoming context metadata when re-linked (instead of no-op), so source attribution can be repaired without unlinking.
  - `Link`/`Link All` now verifies media assets via direct SQL instead of Supabase PostgREST to avoid false failures.
  - Drawer now surfaces duplicate-link errors inline (not only console logs) when a link fails.
  - Show/season/person asset source normalization now prefers link-context source URL so source filters (e.g. `deadline.com`) include linked duplicates as expected.
  - Files:
    - `apps/web/src/components/admin/ImageScrapeDrawer.tsx`
    - `apps/web/src/lib/server/trr-api/media-links-repository.ts`
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
- February 11, 2026: Tightened image-import cast dropdown eligibility.
  - Cast member options now require `episodes_in_season > (season_episode_count / 2)`.
  - Applied to season/show image import drawer cast dropdown generation.
  - Group Picture continues to map to all eligible Full-time cast under this rule.
  - File: `apps/web/src/components/admin/ImageScrapeDrawer.tsx`
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
- February 12, 2026: Show gallery image bucketing and source-domain visibility fix for imported/link-only assets.
  - `Assets > Images` now classifies sections with explicit buckets: `Backdrops`, `Show Posters`, `Season Posters`, `Episode Stills`, `Cast Photos & Promos`, and `Other`.
  - `Cast Photos & Promos` now shows only assets tagged `kind=cast` or `kind=promo` (official cast/promo media).
  - Generic cast portraits/headshots and non-official cast rows are moved into the new `Other` section instead of polluting Cast Photos.
  - Added domain normalization fallback in scrape source parsing so `source_domain`/domain-like values normalize to host form (e.g. `deadline.com`) for source filtering and display.
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - Validation:
    - `pnpm -C apps/web lint 'src/app/admin/trr-shows/[showId]/page.tsx' src/lib/server/trr-api/trr-shows-repository.ts` (pass; pre-existing warnings only)

- February 12, 2026: Finished remaining Image Storage + Admin Suggestions plan items in app layer.
  - Person gallery now consumes persisted variant URLs (`display/detail/crop`) for cards + lightbox, with original fallback.
  - Season page now includes:
    - season eligibility guardrail (`Eligible` vs `Placeholder`) with explicit override toggle,
    - episode coverage matrix (still/description/air date/runtime),
    - archive-footage cast split section (excluded from active episode count),
    - gallery diagnostics panel (missing variants, oversized, unclassified, top sources) with quick filters.
  - Season cast API proxy now supports `include_archive_only=true` to return archive-footage-only cast rows for UI.
  - Files:
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route.ts`
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route.ts' 'src/lib/server/trr-api/trr-shows-repository.ts'` (pass; warning-only)
    - `pnpm -C apps/web exec next build --webpack` (pass)
- February 12, 2026: Implemented Show Admin overhaul pass in app layer.
  - Show page now defaults to `Overview`, with edit gating (`Edit` -> `Save/Cancel`) for show metadata.
  - Added Links intelligence UI with grouped link sections and pending review actions (discover/approve/reject/edit/delete).
  - Added Cast intelligence controls (sort/filter by episodes/season/name, has image, credit, role chips, role assignment + role catalog management).
  - Added inline `Clear Filters` action in show gallery toolbar and corrected heading to `Show Gallery`.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/lib/admin/gallery-diagnostics.ts' 'tests/gallery-diagnostics.test.ts'` (warnings only)
    - `pnpm -C apps/web exec vitest run tests/gallery-diagnostics.test.ts` (5 passed)
    - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)
