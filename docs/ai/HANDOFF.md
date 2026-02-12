# Session Handoff (TRR-APP)

Purpose: persistent state for multi-turn AI agent sessions in `TRR-APP`. Update before ending a session or requesting handoff.

## Latest Update (2026-02-11)

- February 12, 2026: Implemented responsive Figma-style circle rank-order UI (`figma-rank-circles`) for survey rank questions.
  - Circle ranking (`uiVariant: circle-ranking`) now uses a dedicated layout preset in `RankOrderInput`:
    - `apps/web/src/components/survey/RankOrderInput.tsx`
  - `FlashbackRanker` now supports `layoutPreset?: "legacy" | "figma-rank-circles"`:
    - New responsive 2/3/4-column numbered slot grid (mobile/tablet/desktop)
    - Bottom unranked tray with mobile horizontal scroll + snap
    - Viewport-aware picker (mobile bottom sheet, desktop popover)
    - Legacy behavior preserved for non-Figma preset and rectangle/classic ranking
    - File: `apps/web/src/components/flashback-ranker.tsx`
  - Rank-order catalog copy updated to reflect grid + responsive tray behavior:
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - Tests added:
    - `apps/web/tests/rank-order-input.test.tsx`
    - `apps/web/tests/flashback-ranker.test.tsx`
  - Test setup improved to strip `unoptimized` from mocked `next/image` props:
    - `apps/web/tests/setup.ts`
  - Validation:
    - `pnpm -C apps/web run lint` (pass, warnings only)
    - `pnpm -C apps/web run test:ci` (pass)
    - `pnpm -C apps/web exec next build --webpack` (pass)

- February 12, 2026: Added cast fallback + warning behavior when episode-credit evidence is missing/stale.
  - Show cast API now supports fallback metadata and behavior:
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/cast/route.ts`
    - Returns `cast_source` (`episode_evidence` or `show_fallback`) and `eligibility_warning`.
    - Falls back to `getCastByShowId` only when default eligibility yields empty and `minEpisodes` is not explicitly provided.
  - Season cast API now supports fallback metadata and behavior:
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route.ts`
    - Returns `cast_source` (`season_evidence` or `show_fallback`) and `eligibility_warning`.
    - Falls back to show-level cast when season evidence is empty and `include_archive_only=false`.
  - Repository robustness update:
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
    - `getShowCastWithStats` now includes `eligible_total_episodes` in the initial query and uses it as a fallback total.
  - Show and season cast tabs now render warning banners in fallback mode:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - Image import cast options now honor season fallback mode (do not enforce >50% season-episode threshold when fallback is active):
    - `apps/web/src/components/admin/ImageScrapeDrawer.tsx`
  - Tests added/updated:
    - `apps/web/tests/show-cast-route-default-min-episodes.test.ts`
    - `apps/web/tests/season-cast-route-fallback.test.ts`
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/show-cast-route-default-min-episodes.test.ts tests/season-cast-route-fallback.test.ts` (5 tests passed)
    - `pnpm -C apps/web exec eslint ...` on touched files (warnings only; no errors)

- February 12, 2026: Fixed slow `/admin/trr-shows/[showId]` page load caused by blocking Bravo reads.
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx` now lazy-loads Bravo videos/news only when needed (`NEWS`, `ASSETS -> VIDEOS`, or Health Center open).
  - Initial page load path no longer waits for Bravo endpoints; request dedupe added for concurrent Bravo loads; manual refresh now force-fetches.
  - Validation:
    - `npm run lint -- 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only)
    - `npx tsc --noEmit --pretty false` (pass)

- February 12, 2026: Removed fragile cast-photo view column dependency.
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts` no longer selects missing `thumbnail_focus_*` fields from `core.v_cast_photos`, eliminating recurring DB errors in cast fetches.
  - Validation:
    - `npm run lint -- 'src/lib/server/trr-api/trr-shows-repository.ts'` (warning-only)

- February 12, 2026: Show page health UX moved into a dedicated popup launched by a health icon button under `Sync by Bravo`.
  - Popup now contains:
    - Content Health
    - Sync Pipeline
    - Operations Inbox
    - Refresh Log
  - Removed the inline Content Health/Pipeline/Inbox blocks from the main show page content area.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Validation: `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only, no errors)

- February 12, 2026: Implemented plan-driven image-variant consumption, slug resolution, and breadcrumb alias routing.
  - `SeasonAsset` payload now carries variant URL fields (`display_url`, `detail_url`, `crop_display_url`, `crop_detail_url`, `original_url`) resolved from media metadata.
  - Show/season admin galleries now render variant URLs by default and keep original as lightbox fallback.
  - Added slug resolver API:
    - `apps/web/src/app/api/admin/trr-api/shows/resolve-slug/route.ts`
  - Show + season pages now resolve non-UUID route values before loading data.
  - Added readable alias routes:
    - `apps/web/src/app/admin/trr-shows/[showId]/[showSection]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/[seasonSlug]/[seasonTab]/page.tsx`
  - Added show-page ops UX enhancements:
    - Content Health strip
    - Sync Pipeline status panel
    - Operations Inbox queue.
  - Validation:
    - `pnpm -C apps/web run lint` (warnings only)
    - `pnpm -C apps/web exec next build --webpack` (pass)

- February 12, 2026: season social dashboard ingest defaults updated for Instagram backfill reliability.
  - In `apps/web/src/components/admin/season-social-analytics-section.tsx`, `runIngest` payload now:
    - raises default `max_posts_per_target` from `25` to `1500`
    - for Instagram specifically, uses `max_posts_per_target=5000`
    - for Instagram specifically, uses `max_comments_per_post=0` (post-count backfill first)
  - Goal: avoid artificial 25-post cap and unblock full Instagram post population on Social tab.
  - Validation: `pnpm -C apps/web exec eslint src/components/admin/season-social-analytics-section.tsx --max-warnings=0`

- Image import improvements for season announcements + duplicate linking:
  - For `Cast Photos` with `season_announcement` mode (`OFFICIAL SEASON ANNOUNCEMENT` context), import now auto-tags cast when caption/context text contains cast names and no explicit cast selection is set.
  - Duplicate-link requests now send source metadata (`source_url`, `source_page_url`, `source_domain`) from the current scrape URL.
  - Existing links now merge incoming context metadata when link already exists, so source attribution can be updated on re-link.
  - `Link`/`Link All` media-asset existence verification now uses direct SQL (`core.media_assets`) instead of Supabase PostgREST, preventing false link failures in local/workspace environments.
  - Duplicate-link failures now show as inline drawer errors (not just console logs).
  - Asset source normalization now prefers link-context source URL for media-links rows so source-domain filters (e.g., `deadline.com`) include linked duplicates.
  - Files:
    - `apps/web/src/components/admin/ImageScrapeDrawer.tsx`
    - `apps/web/src/app/api/admin/trr-api/media-links/route.ts`
    - `apps/web/src/lib/server/trr-api/media-links-repository.ts`
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - Validation: `pnpm -C apps/web run lint -- src/app/api/admin/trr-api/media-links/route.ts src/components/admin/ImageScrapeDrawer.tsx src/lib/server/trr-api/media-links-repository.ts src/lib/server/trr-api/trr-shows-repository.ts` (1 pre-existing warning in repository)
- Image import cast-dropdown eligibility update:
  - Cast dropdown now includes only members appearing in more than half of the selected season's episodes (`episodes_in_season > total_episodes/2`).
  - Enforced in season/show import drawer by combining season-cast counts with season episode totals.
  - File: `apps/web/src/components/admin/ImageScrapeDrawer.tsx`
  - Validation: `pnpm -C apps/web run lint -- src/components/admin/ImageScrapeDrawer.tsx`
- Sync-by-Bravo season eligibility guard update on show page:
  - Season dropdown/default now includes only seasons with `>1` episodes or a known premiere date.
  - Placeholder seasons with no premiere/episode evidence are excluded from selection.
  - Added modal empty-state (`No eligible seasons`) and blocked preview/commit with explicit error when no eligible season exists.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Validation: `pnpm -C apps/web run lint -- 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only)
- Image import drawer metadata UX update:
  - Removed manual people tagging + freeform asset-name entry from `Import Images`.
  - Third dropdown is now image-kind aware:
    - `Cast Photos` => season cast dropdown (`Full-time` + `Friend`) with `Group Picture (All Full-time)`.
    - `Logo` => `SOURCE` / `SHOW`.
  - Cast options are loaded from show cast roles filtered by selected season cast membership.
  - File: `apps/web/src/components/admin/ImageScrapeDrawer.tsx`
  - Validation: `pnpm -C apps/web run lint -- src/components/admin/ImageScrapeDrawer.tsx`
- Refresh log completion behavior update:
  - When a topic finishes, it now collapses to a one-line row like `SHOWS: Done ✔️`.
  - Completed topics automatically move to the bottom of the log; active topics stay expanded above.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Full refresh pipeline optimization on show page:
  - `Refresh` now avoids duplicate deep cast profile/media sync in the full run.
  - `Refresh` now uses photo fast-mode (`limit_per_source=20`, `imdb_mediaindex_max_pages=6`, skip auto-count, skip word detection).
  - Explicit cast refresh path still allows deep person profile/media sync when needed.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Refresh log redesign on show page:
  - Replaced flat repeated log list with grouped topic containers shown once each:
    - `SHOWS`, `SEASONS`, `EPISODES`, `PEOPLE`, `MEDIA`, `BRAVOTV`
  - Each topic now contains nested sub-job updates and latest status summary.
  - Log lines are normalized for readability (UUID-like ids redacted to `person`).
  - Bravo preview/commit events now appear in `BRAVOTV`.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Show page Sync-by-Bravo gating added:
  - `Sync by Bravo` now requires synced seasons + episodes + cast before opening the workflow.
  - Missing prerequisites are shown inline in the header.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Show page refresh visibility improved:
  - Clicking/hovering the running header `Refresh` button opens a live in-depth refresh log panel.
  - Log includes stage messages, counts, and percentages from streamed progress events.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Error handling update:
  - Sync-by-Bravo preview/commit now surfaces backend `detail` messages (not just `error` fields).
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Validation for this update:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (2 pre-existing warnings)
  - `pnpm -C apps/web exec vitest run tests/show-cast-route-default-min-episodes.test.ts tests/show-bravo-videos-proxy-route.test.ts` (`3 passed`)

## Goal

- Fix TRR-APP dev "infinite loading" + admin TRR-Core pages failing after moving into the multi-repo workspace.
- Admin IA updates: dashboard containers + per-show ASSETS (Media/Brand) + normalized survey responses under each show.

## Status

- Added a local-dev admin tool for cross-repo visibility:
  - `/admin/dev-dashboard` (UI) + `/api/admin/dev-dashboard` (admin-only API)
  - Shows git branches/commits/changes/worktrees + GitHub PRs via `gh`
  - Scans outstanding work signals: `docs/cross-collab/TASK*/PLAN.md` and `~/.claude/plans/*.md` (last 10 days only; TODO container intentionally removed for now)
  - Server helpers: `apps/web/src/lib/server/admin/shell-exec.ts` (allowlisted `execFile`) + `apps/web/src/lib/server/admin/dev-dashboard-service.ts`
  - UI shows dates for branches/worktrees/tasks/claude plans; worktrees attempt to resolve commit dates even when `git worktree` reports a zero HEAD hash.
- Multi-person tagged image dedupe shipped (TASK3):
  - People gallery now dedupes by canonical identity (not `hosted_url` only) and prefers `media_links` rows on collisions.
  - Implementation: `apps/web/src/lib/server/trr-api/person-photo-utils.ts#dedupePhotosByCanonicalKeysPreferMediaLinks`
  - Wired in: `apps/web/src/lib/server/trr-api/trr-shows-repository.ts#getPhotosByPersonId`
  - Tests: `apps/web/tests/person-photo-utils.test.ts`
- Fixed dev hang where `/_next/image` would stall in this workspace by disabling Next.js image optimization in development only:
  - `apps/web/next.config.ts` → `images.unoptimized: true` when `NODE_ENV=development`
- Fixed noisy/broken Google sign-in in dev:
  - `apps/web/src/lib/firebase.ts` avoids `console.error` on benign popup-cancel/block cases (prevents Next dev overlay), returns `boolean` for success, and auto-redirects `127.0.0.1` → `localhost` on `auth/unauthorized-domain`
  - callers updated to only redirect to `/auth/complete` when sign-in actually succeeds
  - host detection helper: `apps/web/src/lib/debug.ts`
- Fixed admin auth mismatch between client and server:
  - `apps/web/src/lib/server/auth.ts` now accepts admin by `uid OR email OR displayName` allowlists (server env + NEXT_PUBLIC env), and includes a no-service-account fallback token verification via Google Identity Toolkit when needed.
- Fixed admin `/admin/trr-shows/[showId]` failing to fetch seasons/cast:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx` parses API errors and surfaces them in UI (uses `console.warn` instead of `console.error` to avoid dev overlay spam).
- Worked around Supabase PostgREST outage (`PGRST002` schema cache error) by moving TRR Core data access off `@supabase/supabase-js` and onto direct Postgres (`DATABASE_URL`) via `apps/web/src/lib/server/postgres.ts`:
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `apps/web/src/lib/server/trr-api/media-links-repository.ts`
  - `apps/web/src/lib/server/admin/cast-photo-tags-repository.ts`
  - `apps/web/src/lib/server/admin/images-repository.ts`
- Addressed Codex review regressions in direct-Postgres admin queries:
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts` restores `episodes_in_season` for season cast via `core.v_season_cast` (with fallbacks)
  - `apps/web/src/lib/server/admin/cast-photo-tags-repository.ts` fixes `people_ids` lookup/upsert to use `text[]` (matches `admin.cast_photo_people_tags.people_ids`)
- Fixed runtime `toFixed` crashes caused by Postgres `NUMERIC` values coming back as strings:
  - `apps/web/src/lib/server/postgres.ts` parses NUMERIC into JS numbers globally
  - defensive formatting in admin pages:
    - `apps/web/src/app/admin/trr-shows/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`

Admin dashboard + per-show assets + survey responses (this session):
- Admin dashboard containers updated:
  - `/admin` renamed “TRR Shows” card to “Shows”
  - removed homepage cards for `/admin/scrape-images`, `/admin/survey-responses`, `/admin/shows`
  - added container cards + placeholder pages:
    - `/admin/users`, `/admin/games`, `/admin/social-media`, `/admin/groups`, `/admin/settings`
  - file: `apps/web/src/app/admin/page.tsx`
- Shows search page UX/copy updates:
  - Editorial coverage section title is now just “Shows” (no “Added” label)
  - Real Housewives shows display acronyms (prefers `alternative_names`, falls back to title-derived)
  - Covered/added show cards include the latest season poster thumbnail (best-effort fetch)
  - Search results covered badge is icon-only (no “Added” text)
  - Added “Sync from Lists” button to trigger TRR-Backend list import + metadata enrichment:
    - UI: `apps/web/src/app/admin/trr-shows/page.tsx`
    - Proxy API: `apps/web/src/app/api/admin/trr-api/shows/sync-from-lists/route.ts` (10m timeout)
  - file: `apps/web/src/app/admin/trr-shows/page.tsx`
- Per-show Gallery tab renamed to **ASSETS** (with alias support for `?tab=gallery`) and split into Media/Brand subviews:
  - file: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Media view: existing gallery + import images unchanged
  - Brand view: new editor component (palette/fonts/assets + season overrides + cast portraits)
    - component: `apps/web/src/components/admin/ShowBrandEditor.tsx`
  - Assets now include show-level posters/backdrops/logos alongside season/episode/cast media:
    - New API route: `apps/web/src/app/api/admin/trr-api/shows/[showId]/assets/route.ts`
    - New repo function: `apps/web/src/lib/server/trr-api/trr-shows-repository.ts#getAssetsByShowId`
    - Raised asset fetch caps and default limit to `500` (previously defaulted to `20` and had low SQL `LIMIT`s, causing missing gallery items)
  - Added per-tab “Refresh” buttons (synchronous) that run TRR-Backend sync scripts:
    - UI: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - Proxy API: `apps/web/src/app/api/admin/trr-api/shows/[showId]/refresh/route.ts` (10m timeout)
- Show landing page cleanup:
  - hides placeholder seasons (no dates available or <= 1 episode)
  - season badge uses the filtered season count (so placeholders aren’t “counted”)
  - show page tab bar is now hidden; seasons are the primary landing experience
  - each season row includes pill links (always visible under the row) that deep-link to the season page tabs:
    - `Seasons & Episodes`, `Assets`, `Cast`, `Surveys`, `Social Media`, `Details`
  - “Season #” is a link to the season page; expanding/collapsing does not refetch/reload the page
  - file: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Season page tabs expanded (and show-level tools moved here):
  - `/admin/trr-shows/[showId]/seasons/[seasonNumber]` tabs:
    - `Seasons & Episodes`, `Assets`, `Cast`, `Surveys`, `Social Media`, `Details`
  - Assets tab includes Media/Brand toggle (Brand renders `ShowBrandEditor`)
  - Season assets “Assign TMDb Backdrops” drawer:
    - Drawer now previews unmirrored TMDb backdrops (uses `display_url = hosted_url ?? source_url`)
    - Assign mirrors selected assets to S3 via TRR-Backend then links them to the season as `kind=backdrop`
    - API routes moved off Supabase/PostgREST and onto direct Postgres:
      - `apps/web/src/app/api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops/route.ts`
      - `apps/web/src/app/api/admin/trr-api/seasons/[seasonId]/assign-backdrops/route.ts`
  - Cast member links include `seasonNumber` so the person page can route “Back” correctly
  - file: `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
- Surveys section supports season scoping:
  - file: `apps/web/src/components/admin/surveys-section.tsx`
- Brand storage linked to TRR show UUID via new DB columns:
  - migration: `apps/web/db/migrations/022_link_brand_shows_to_trr.sql`
  - server repo updates: `apps/web/src/lib/server/shows/shows-repository.ts`
  - new admin lookup API: `apps/web/src/app/api/admin/shows/by-trr-show/[trrShowId]/route.ts`
- Normalized survey responses moved into the normalized survey editor flow:
  - show Surveys list now deep-links “Responses” into `/admin/surveys/[surveyKey]?tab=responses`
    - file: `apps/web/src/components/admin/surveys-section.tsx`
  - survey editor gained a Responses tab backed by `/api/admin/normalized-surveys/...`:
    - file: `apps/web/src/app/admin/surveys/[surveyKey]/page.tsx`
  - added CSV export endpoint:
    - `apps/web/src/app/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/export/route.ts`
  - added tests:
    - `apps/web/tests/admin-shows-by-trr-show-route.test.ts`
    - `apps/web/tests/normalized-survey-export-route.test.ts`

Fast checks (this session):
- `pnpm -C apps/web run lint` (pass; warnings only)
- `pnpm -C apps/web exec next build --webpack` (pass)
- `pnpm -C apps/web run test:ci` (pass)

## Notes / Constraints

- Workspace dev runner (`/Users/thomashulihan/Projects/TRR/make dev`) provides:
  - `TRR_API_URL` (default `http://127.0.0.1:8000`)
  - `SCREENALYTICS_API_URL` (default `http://127.0.0.1:8001`)
- In the multi-repo workspace, `make dev/stop/logs` from this repo delegates to the workspace root (`../Makefile`).
- TRR-Backend routes are under `/api/v1/*` and TRR-APP normalizes the base automatically.
- `apps/web/next.config.ts` changes require a Next dev server restart to take effect (restart `make dev` if you still see `/_next/image` behavior).

## Next Steps

1. If PostgREST comes back, decide whether to keep the direct Postgres approach (faster, fewer moving parts) or switch back to supabase-js for TRR Core reads.
2. Spot-check admin pages:
   - `/admin/trr-shows` (search + rating render)
   - `/admin/trr-shows/[showId]` (seasons + cast + ratings)
   - `/admin/trr-shows/[showId]/seasons/[seasonNumber]` (episode ratings)

## Verification Commands

```bash
pnpm -C apps/web run lint
pnpm -C apps/web exec next build --webpack
pnpm -C apps/web run test:ci
```

---

Last updated: 2026-02-10
Updated by: Claude Opus 4.6

Workspace integration (this session):
- Integrated all unmerged branches and stashes onto main:
  - Font page restructured into CDN/Google/Font Stacks categories with live preview (`apps/web/src/app/admin/fonts/page.tsx`)
  - Survey builder: new `SurveyQuestionsEditor` component, `TwoAxisGridInput`, answer mapping, question completion logic, section grouping, UI templates
  - Admin media: season cast survey roles migration, scrape image enhancements, image lightbox/scrape drawer updates
  - API routes: survey-cast endpoint, scrape preview, media asset updates
  - Tests: 7 new test files (surveys, two-axis grid, gallery delete, question completion)
  - Idempotent migrations for survey tables (014, 019, 020, 022)
- Cleaned up: 5 stashes dropped (all redundant), 4 local branches deleted (all squash-merged or obsolete)
- Note: survey `[surveyKey]/page.tsx` "Questions" tab not yet wired — `SurveyQuestionsEditor` component exists but isn't connected to the tab navigation (main has "Responses" tab only)
People photo gallery UX (this session):
- Removed the header-level "Refresh Images" button on `/admin/trr-shows/people/[personId]`; refresh is now only in the Gallery tab.
- Person refresh streams now pass show context (`showId`/`showName`) when available so “This Show” filtering works across all sources.
- `ImageLightbox` metadata now uses label `CREATED` and displays `WORDS` / `NO WORDS` when word-id metadata is present.

Admin gallery improvements (this session):
- Fixed SSE progress parsing to handle CRLF-delimited SSE frames so refresh progress bars update live.
  - `/admin/trr-shows/[showId]` and `/admin/trr-shows/people/[personId]`
- Season gallery: only trust normalized `kind` for backdrop grouping (avoids Season Poster showing under Backdrops).
- Backdrops: show/season Backdrops sections now only show TMDb backdrops.
- Assets tab: added a `Logos` section for show-level assets (`kind=logo`).
- Brand assets safety: `survey_shows` schema is now idempotently ensured (adds missing `trr_show_id` + `fonts`) to avoid `column trr_show_id does not exist` runtime errors.
  - `apps/web/src/lib/server/shows/shows-repository.ts`
- Added Archive + Star controls in `ImageLightbox`, persisted via new TRR-Backend proxy routes:
  - `POST /api/admin/trr-api/assets/archive`
  - `POST /api/admin/trr-api/assets/star`
- Import Images: added Season Announcement import mode metadata fields:
  - `Source Logo` dropdown and optional `Asset Name` per image
  - Persists `context_section/context_type` and other fields via backend scrape importer.

Season assets gallery update (this session):
- `/admin/trr-shows/[showId]/seasons/[seasonNumber]?tab=assets` now classifies and renders episode stills as a dedicated `Episode Stills` section even when imported rows come through as `type=season` (using content-type inference from `kind/context`).
- Season poster grouping now excludes those inferred episode still assets, preventing stills from being mixed into `Season Posters`.
- File: `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`

Shows page thumbnail fixes (this session):
- `/admin/trr-shows` covered-show thumbnails now normalize poster URLs (absolute URL, protocol-relative URL, and TMDb path fallback) before rendering.
- Added show-level poster fallback (`/api/admin/trr-api/shows/[showId]`) when the latest season lacks a usable poster URL.
- Increased thumbnail size while keeping a strict `4:5` aspect ratio.
- Poster selection now picks the most recent season with a usable poster URL (instead of stopping at the first season row with any poster-ish field).
- Covered-show card names now wrap (no truncation), and each card shows `Total Episodes` below the name.
- Fixed covered-show poster/totals loader race: request tracking is now ref-based so the effect no longer cancels its own in-flight fetches on state updates.
- Seasons lookup failures no longer abort the full card data fetch; show-level fallback + total-episodes lookup still run.
- Moved search UI above Editorial Coverage and converted search results into a live typeahead dropdown under the search input (no separate full-page results grid).
- File: `apps/web/src/app/admin/trr-shows/page.tsx`

Show/season admin refresh + header UX updates (this session):
- Show page tabs are now visible and placed directly under the header stats chips: `Seasons`, `Media`, `Cast`, `Surveys`, `Social`, `Details`.
- Show header now supports branding:
  - network logo badge (with text fallback) above the title line
  - show logo replacement for the text title when `show.logo_url` exists (falls back to show name if unavailable)
- Show page refresh behavior now supports one-click full refresh (`Refresh`) that runs show info + seasons/episodes + media/photos + cast/credits.
- `Refresh Seasons & Episodes` flow now also triggers photo refresh with `skip_mirror=false` to mirror images to S3 as part of the workflow.
- Season cast tab now includes a `Refresh` button that triggers backend cast refresh (`cast_credits`) and reloads season cast.
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`

Refresh progress UX overhaul (this session):
- Added live, stage-mapped progress feedback to every refresh action on show/season admin pages.
- Show page (`/admin/trr-shows/[showId]`):
  - Added human-readable stage mappings for refresh streams (show info, seasons, episodes, cast credits, show media, season media, episode media, cast media, mirroring, cleanup).
  - Added global header progress bar so top-level `Refresh` always shows active stage/message/counts regardless of tab.
  - Improved stream progress parsing to prefer `stage_current/stage_total` when available.
  - `Refresh Person` now uses the stream endpoint and renders per-card progress bars with live stage text and counts.
- Season page (`/admin/trr-shows/[showId]/seasons/[seasonNumber]`):
  - `Refresh Images` now runs the show photos stream endpoint (real refresh) instead of only re-fetching local assets.
  - Added progress bar + status text for season media refresh.
  - Season cast refresh now uses the stream endpoint and shows live progress bar + stage text.
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`

Fast checks (this session):
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (pass; 2 pre-existing `no-img-element` warnings)
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx'` (pass)

Cast tab refresh progress visibility fix (this session):
- `/admin/trr-shows/[showId]?tab=cast` now shows the active global refresh progress bar while any show refresh is running (not only when `cast_credits` target is currently active).
- This fixes the UX gap where cast refresh completed with notice text but no visible progress bar during earlier phases of full refresh.
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`

Cast refresh deep-sync update (this session):
- Show page Cast refresh now performs:
  1) cast credits sync
  2) per-cast-member profile/media sync (TMDb/IMDb/Fandom) via person refresh endpoints
  3) cast list reload
- Cast refresh notice now includes cast profile/media success/failure counts.
- Show Cast tab `Refresh` button now triggers cast-only refresh (instead of full show refresh).
- Season page Cast refresh now performs cast credits sync + per-cast-member TMDb/IMDb/Fandom profile/media sync with progress and failure accounting.
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`

Text overlay metadata UX update (this session):
- Lightbox now always shows a `TEXT OVERLAY` field (no longer hidden when unknown).
- Value now renders as `YES (Contains Text)`, `NO (No Text)`, or `UNKNOWN`.
- Advanced filter text-overlay chips now use explicit yes/no wording:
  - `YES (CONTAINS TEXT)`
  - `NO (NO TEXT)`
- Files:
  - `apps/web/src/components/admin/ImageLightbox.tsx`
  - `apps/web/src/components/admin/AdvancedFilterDrawer.tsx`
- Verification:
  - `pnpm -C apps/web run lint -- src/components/admin/ImageLightbox.tsx src/components/admin/AdvancedFilterDrawer.tsx` passed

Person gallery thumbnail crop controls (this session):
- Implemented 4:5 person thumbnails on `/admin/trr-shows/people/[personId]` for:
  - Overview photo preview cards
  - Gallery tab cards
- Added deterministic auto-centering heuristics for thumbnail framing:
  - portrait/square: `50% 30%`
  - landscape: `50% 35%`
  - unknown dims: `50% 32%`
- Removed hover zoom scaling from person gallery thumbnails and replaced with deterministic transform from persisted zoom only.
- Added persisted per-image thumbnail crop model (`thumbnail_crop`) with manual focal point + zoom:
  - media links: stored in `core.media_links.context.thumbnail_crop`
  - cast photos: stored in `core.cast_photos.metadata.thumbnail_crop`
- Added top-level thumbnail crop fields to person photo payload mapping:
  - `thumbnail_focus_x`, `thumbnail_focus_y`, `thumbnail_zoom`, `thumbnail_crop_mode`
  - file: `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
- Added new API endpoint for crop persistence:
  - `PUT /api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop`
  - file: `apps/web/src/app/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop/route.ts`
- Added server repository helpers for JSONB crop upserts/removals:
  - file: `apps/web/src/lib/server/admin/person-thumbnail-crops-repository.ts`
- Added person-page lightbox controls in the tag panel:
  - sliders for X/Y/Zoom
  - `Save Manual Crop` and `Reset to Auto`
  - optimistic UI updates for grid + lightbox state
  - files:
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/thumbnail-crop-state.ts`
- Added shared thumbnail crop utility module:
  - file: `apps/web/src/lib/thumbnail-crop.ts`
- Added tests:
  - `apps/web/tests/thumbnail-crop-utils.test.ts`
  - `apps/web/tests/thumbnail-crop-state.test.ts`
  - `apps/web/tests/person-thumbnail-crop-route.test.ts`
  - `apps/web/tests/person-gallery-thumbnail-wiring.test.ts`

Verification (this session):
- `pnpm -C TRR-APP/apps/web run lint` (pass, warnings only)
- `pnpm -C TRR-APP/apps/web exec next build --webpack` (pass)
- `pnpm -C TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/thumbnail-crop-utils.test.ts tests/thumbnail-crop-state.test.ts tests/person-thumbnail-crop-route.test.ts tests/person-gallery-thumbnail-wiring.test.ts` (pass)

Note:
- Running the full suite still shows an existing unrelated failure in `tests/show-gallery-delete-wiring.test.ts` that predates this thumbnail-crop work.

Person refresh progress phase mapping update (this session):
- Person page `Refresh Images` progress now maps backend stage IDs into stable UI phases:
  - `SYNCING`
  - `MIRRORING`
  - `COUNTING`
  - `FINDING TEXT`
- Added a final thumbnail-only phase during post-refresh reload:
  - `CENTERING/CROPPING`
- Progress label now always shows the phase name, with backend detail message displayed below it.
- No source image mutation was added; this remains thumbnail framing only.
- Files:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/people/[personId]/refresh-progress.ts`
  - `apps/web/tests/person-refresh-progress.test.ts`

Verification (this session):
- `pnpm -C TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/person-refresh-progress.test.ts tests/person-gallery-thumbnail-wiring.test.ts tests/thumbnail-crop-utils.test.ts tests/thumbnail-crop-state.test.ts tests/person-thumbnail-crop-route.test.ts` (pass)
- `pnpm -C TRR-APP/apps/web run lint` (pass, warnings only; pre-existing warnings remain)

Person gallery solo auto-crop tuning (this session):
- Auto thumbnail framing now applies a solo-person profile when inferred people count is exactly `1` (auto mode only):
  - Portrait/square solo: `object-position: 50% 28%`, `zoom: 1.10`
  - Landscape solo: `object-position: 50% 32%`, `zoom: 1.12`
- Manual thumbnail crop still takes precedence over all auto heuristics.
- Wired person-count-aware auto framing into person gallery thumbnail rendering.
- Files:
  - `apps/web/src/lib/thumbnail-crop.ts`
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/tests/thumbnail-crop-utils.test.ts`

Verification (this session):
- `pnpm -C TRR-APP/apps/web run lint -- 'src/app/admin/trr-shows/people/[personId]/page.tsx' src/lib/thumbnail-crop.ts tests/thumbnail-crop-utils.test.ts` (pass)
- `pnpm -C TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/thumbnail-crop-utils.test.ts` (pass)

Recount mirror-fallback robustness (this session):
- Person page recount flow no longer fails immediately when mirror fallback fails (e.g., Fandom static.wikia 404).
- New behavior:
  - Run auto-count first.
  - If it fails, attempt mirror as best-effort.
  - Retry auto-count regardless of mirror success/failure.
  - Surface auto-count failure as primary error; include mirror failure as secondary detail when present.
- This prevents `Mirror failed: Failed to download source_url ... 404` from masking recount results.
- File:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`

Verification (this session):
- `pnpm -C TRR-APP/apps/web run lint -- 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass)
- `pnpm -C TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/person-gallery-thumbnail-wiring.test.ts tests/thumbnail-crop-utils.test.ts` (pass)

Person lightbox crop-overlay + refresh progress reliability update (this session):
- Added live thumbnail viewport overlay on the lightbox image while adjusting crop sliders in `TagPeoplePanel`.
  - Overlay represents the 4:5 thumbnail framing area (including zoom and focus point) over the full-size preview.
  - Overlay is shown when metadata panel is open and crop controls are active.
- Added pure helper for viewport math:
  - `resolveThumbnailViewportRect(...)` in `apps/web/src/lib/thumbnail-crop.ts`.
- Added sync-stage counter tracker to ensure Refresh Images shows `SYNCING ##/##` stage progress in a one-by-one job progression style.
  - Added tracker utilities in `apps/web/src/app/admin/trr-shows/people/[personId]/refresh-progress.ts`.
  - Person page now applies tracker counts for SYNCING while retaining backend counts for MIRRORING/COUNTING/FINDING TEXT.
- Removed 5-minute abort timeout on person refresh proxy routes to avoid premature `Backend fetch failed: operation aborted due to timeout` during long-running refresh jobs.
  - `apps/web/src/app/api/admin/trr-api/people/[personId]/refresh-images/stream/route.ts`
  - `apps/web/src/app/api/admin/trr-api/people/[personId]/refresh-images/route.ts`
- Files:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/src/components/admin/ImageLightbox.tsx`
  - `apps/web/src/app/admin/trr-shows/people/[personId]/refresh-progress.ts`
  - `apps/web/src/lib/thumbnail-crop.ts`
  - `apps/web/tests/thumbnail-crop-utils.test.ts`
  - `apps/web/tests/person-refresh-progress.test.ts`

Verification (this session):
- `pnpm -C TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/thumbnail-crop-utils.test.ts tests/person-refresh-progress.test.ts tests/person-gallery-thumbnail-wiring.test.ts` (pass)
- `pnpm -C TRR-APP/apps/web run lint -- src/components/admin/ImageLightbox.tsx 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/app/admin/trr-shows/people/[personId]/refresh-progress.ts' src/lib/thumbnail-crop.ts 'src/app/api/admin/trr-api/people/[personId]/refresh-images/stream/route.ts' 'src/app/api/admin/trr-api/people/[personId]/refresh-images/route.ts' tests/thumbnail-crop-utils.test.ts tests/person-refresh-progress.test.ts` (pass)

Person refresh timeout handling hardening (this session):
- Person page refresh fallback now treats timeout-like backend errors as non-fatal instead of throwing to the UI.
- Behavior change in `handleRefreshImages`:
  - If stream fails and fallback refresh also returns timeout-style errors (`aborted due to timeout`, `timed out`, `timeout`), UI now sets a clear long-running refresh message and still proceeds to reload current page data.
  - Non-timeout fallback errors still throw as before.
- File:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`

Verification (this session):
- `pnpm -C TRR-APP/apps/web run lint -- 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass)
- `pnpm -C TRR-APP/apps/web exec tsc --noEmit -p tsconfig.json` (pass)

Person refresh numbered phase label update (this session):
- Refresh progress header now includes explicit phase counts in-label, e.g. `SYNCING 1/5`.
- Numbering now appears immediately on refresh start with baseline `SYNCING 0/1` (instead of blank counts before first backend progress event).
- Same immediate numbering behavior is used when stream fallback starts.
- File:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`

Verification (this session):
- `pnpm -C TRR-APP/apps/web run lint -- 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass)
- `pnpm -C TRR-APP/apps/web exec tsc --noEmit -p tsconfig.json` (pass)

Person gallery media view + auto-count config fix (this session):
- Person page media filter controls now use explicit labels and scopes in `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`:
  - Current show pill now displays acronym/name directly (e.g. `RHOSLC`) instead of `This Show (...)`
  - Added dedicated `WWHL` filter pill (`galleryShowFilter = "wwhl"`)
  - Added `Other Shows` filter pill plus dropdown to select a specific other show/event (`selectedOtherShowKey`) or all other shows/events
  - Updated filter pipeline to support:
    - `wwhl` matches via text/acronym/metadata show-name heuristics
    - `other-shows` either broad match or selected-show-specific match by show id/name/acronym
- Verified checks for this change:
  - `pnpm -C apps/web run lint -- 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass)
  - `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)
- Local runtime fix for auto-count connection refusal:
  - Updated local backend env `TRR-Backend/.env` from `SCREENALYTICS_API_URL=http://localhost:8888` to `SCREENALYTICS_API_URL=http://127.0.0.1:8001`
  - Confirmed Screenalytics API is reachable at `http://127.0.0.1:8001/vision/people-count` (HTTP 405 on GET / expected JSON error on invalid POST image URL).

Person gallery metadata refresh + crop overlay reliability (this session):
- Added `Refresh` action in lightbox quick actions (next to Archive/Star) in `apps/web/src/components/admin/ImageLightbox.tsx`.
  - Runs parent-provided job callback and surfaces action errors inline in metadata panel.
  - Action is available in both the top quick-actions row and the lower Actions section.
- Person page now wires lightbox refresh job execution in `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`:
  - For cast photos: force `auto-count` + force `detect-text-overlay`.
  - For media assets: force `auto-count` + force `detect-text-overlay`.
  - Reloads person photos after job run and refreshes current lightbox photo metadata/crop preview state.
- Improved crop guide overlay visibility in `apps/web/src/components/admin/ImageLightbox.tsx`:
  - Overlay no longer depends on metadata panel toggle state.
  - Added natural image size fallback (`onLoad`) when DB width/height is missing, so preview frame can still render.

Validation run:
- `pnpm -C apps/web run lint -- src/components/admin/ImageLightbox.tsx 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass; existing warning remains unrelated)
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)

Main media gallery scrape-import enhancements (this session):
- Show admin media tab now exposes `Import Images` in main gallery mode (`All Seasons`) and opens the scrape drawer in show context.
  - File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- `ImageScrapeDrawer` now supports three contexts: `season`, `show`, and `person`.
  - Added season selector for show-context imports with explicit `N/A` option.
  - Added content-type controls (bulk + per-image), including `OFFICIAL SEASON ANNOUNCEMENT`.
  - Show-context payloads now send `entity_type="show"` with optional season metadata when selected.
  - File: `apps/web/src/components/admin/ImageScrapeDrawer.tsx`
- Admin scrape proxy validators now accept show imports.
  - Files:
    - `apps/web/src/app/api/admin/scrape/import/route.ts`
    - `apps/web/src/app/api/admin/scrape/import/stream/route.ts`

Verification (this session):
- `pnpm -C apps/web exec eslint 'src/components/admin/ImageScrapeDrawer.tsx' 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/api/admin/scrape/import/route.ts' 'src/app/api/admin/scrape/import/stream/route.ts'`
  - Pass with 2 pre-existing warnings in `src/app/admin/trr-shows/[showId]/page.tsx` (`@next/next/no-img-element`), no new errors.
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)

Show admin branding + details editing updates (this session):
- Import Media (show context) now supports `Logo` as an image kind while keeping season/person options unchanged.
  - File: `apps/web/src/components/admin/ImageScrapeDrawer.tsx`
- Brand Kit now includes `Default Poster`, `Default Backdrop`, and `Default Logo` selectors sourced from show media assets.
  - Persisted in show brand JSON (`survey_shows.fonts`) as:
    - `defaultPosterAssetId`, `defaultPosterUrl`
    - `defaultBackdropAssetId`, `defaultBackdropUrl`
    - `defaultLogoAssetId`, `defaultLogoUrl`
  - File: `apps/web/src/components/admin/ShowBrandEditor.tsx`
- Show Details tab is now editable with save support for:
  - Display Name (`core.shows.name`)
  - Nickname + Alt Names (merged into `core.shows.alternative_names`)
  - Description and Premiere Date
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/route.ts`
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
- Added TRR show update support in app server layer:
  - `PUT /api/admin/trr-api/shows/[showId]`
  - supports details fields + optional primary image UUID setters.

Verification (this session):
- `pnpm -C apps/web exec eslint 'src/components/admin/ImageScrapeDrawer.tsx' 'src/components/admin/ShowBrandEditor.tsx' 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/route.ts' 'src/lib/server/trr-api/trr-shows-repository.ts'`
  - No errors; existing warnings remain in unchanged areas (`no-img-element` and existing repo warnings).
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)

Person gallery crop/render/progress reliability (this session):
- Fixed thumbnail render precedence so persisted auto crops are honored (not only manual):
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/src/lib/thumbnail-crop.ts`
- Removed synthetic front-end-only centering completion state after refresh; UI now relies on backend stage events.
- Added long-running route allowances/timeouts for refresh proxies to reduce fallback aborts:
  - `apps/web/src/app/api/admin/trr-api/people/[personId]/refresh-images/route.ts`
  - `apps/web/src/app/api/admin/trr-api/people/[personId]/refresh-images/stream/route.ts`
  - `apps/web/src/app/api/admin/trr-api/people/[personId]/reprocess-images/stream/route.ts`
- Ensured phase mapping recognizes backend `centering_cropping` stage and keeps phase labels/count behavior aligned.

Tests updated:
- `apps/web/tests/thumbnail-crop-utils.test.ts` (persisted auto crop precedence coverage)
- `apps/web/tests/person-refresh-progress.test.ts` (centering stage mapping)

Verification (this session):
- `pnpm -C apps/web exec vitest run tests/thumbnail-crop-utils.test.ts tests/person-refresh-progress.test.ts tests/person-gallery-thumbnail-wiring.test.ts` (pass; 17 passed)

Show assets source-label normalization (this session):
- Normalized source display for show-level media assets imported via scrape URLs so UI shows domain-only labels (e.g. `bravotv.com`) instead of `web_scrape:bravotv.com`.
- Updated `getAssetsByShowId()` media-links query mapping to include `ma.source_url` and pass source through `normalizeScrapeSource(...)`.
- File:
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`

Validation (this session):
- `pnpm -C apps/web exec eslint src/lib/server/trr-api/trr-shows-repository.ts` (no errors; existing warnings only)
- Also applied the same source normalization for season-linked `media_links` assets so season gallery imports display domain-only source labels too.
- Added source badge formatting guard in `ImageLightbox` so any legacy `web_scrape:*` source labels render as clean hostnames (using `sourceUrl` when available).

Person refresh unknown-error diagnostics hardening (this session):
- Improved non-stream person refresh proxy error handling in:
  - `apps/web/src/app/api/admin/trr-api/people/[personId]/refresh-images/route.ts`
- Changes:
  - Added robust unknown-error normalization (`getErrorDetail`) so non-`Error` thrown values (including abort reasons) no longer collapse to `unknown error`.
  - Switched fallback refresh timeout abort from custom string reason to standard abort, with explicit 504 timeout response:
    - `error: "Refresh timed out"`
    - `detail: "Timed out waiting for backend person refresh response (10m)."`
  - Improved backend response parsing to preserve non-JSON backend error body text as `detail`.
  - Non-2xx backend responses now return structured `{ error, detail }` when available.
- Improved UI fallback refresh diagnostics in:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
- Change:
  - When stream refresh fails and fallback refresh also fails, error now includes both failures in one message (`Stream ...; Fallback ...`) instead of only one opaque error.

Verification (this session):
- `pnpm -C apps/web exec eslint 'src/app/api/admin/trr-api/people/[personId]/refresh-images/route.ts' 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass; existing pre-existing hook-deps warning remains)
- `pnpm -C apps/web exec vitest run tests/person-refresh-progress.test.ts tests/thumbnail-crop-utils.test.ts` (pass; 16 passed)

Person lightbox crop-overlay immediate visibility (this session):
- Ensured crop preview overlay always has an immediate fallback derived from the active lightbox photo so opening Photo Details shows the current crop frame without waiting for slider interaction/state rehydration.
- Added shared helper `buildThumbnailCropPreview(photo)` and reused it in:
  - lightbox open
  - lightbox next/prev navigation
  - post-refresh lightbox photo metadata update
  - `ImageLightbox` prop fallback (`thumbnailCropPreview ?? buildThumbnailCropPreview(lightboxPhoto.photo)`)
- File:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`

Verification (this session):
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass with pre-existing warning)
- `pnpm -C apps/web exec vitest run tests/person-refresh-progress.test.ts tests/thumbnail-crop-utils.test.ts` (pass; 16 passed)

Photo-details crop-frame + metadata completeness visibility (this session):
- Updated lightbox overlay in `apps/web/src/components/admin/ImageLightbox.tsx` so crop guide is always visibly rendered when a thumbnail crop preview exists:
  - keeps resolved viewport rectangle when dimensions are known,
  - falls back to full-frame guide when dimensions are missing,
  - adds an explicit reticle at viewport center,
  - adds top-left overlay label (`Thumbnail Crop` / `Thumbnail Crop (Dimensions Missing)`).
- Added always-visible dimensions row in metadata panel (`Dimensions: Unknown` when missing).
- Added fixed `Metadata Coverage` section that shows canonical metadata fields with explicit `Unknown` values, so missing data is visible and comparable across sources.

Verification (this session):
- `pnpm -C apps/web exec eslint 'src/components/admin/ImageLightbox.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass with pre-existing page warning)
- `pnpm -C apps/web exec vitest run tests/person-refresh-progress.test.ts tests/thumbnail-crop-utils.test.ts` (pass; 16 passed)
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)

Crop overlay clarity + subject-highlight guides (this session):
- Improved person-page crop preview dimension sourcing by falling back to metadata dimensions (`image_width/image_height/width/height`) when top-level width/height are null.
  - Added helpers in `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`:
    - `parseDimensionValue(...)`
    - `resolvePhotoDimensions(...)`
  - `buildThumbnailCropPreview(...)` and TagPeoplePanel preview updates now use resolved dimensions.
- Updated lightbox overlay visuals in `apps/web/src/components/admin/ImageLightbox.tsx`:
  - Added distinct subject-focus tinted overlay (fuchsia)
  - Added vertical guide lines:
    - original image center (white)
    - crop overlay center (cyan)
    - face/nose focus line from current crop X (fuchsia)
  - Updated overlay label text to `Thumbnail Crop + Subject Focus` and added line legend.
  - Removed confusing `Dimensions Missing` wording from overlay label.

Verification (this session):
- `pnpm -C apps/web exec eslint 'src/components/admin/ImageLightbox.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass with one pre-existing warning unrelated to this change)
- `pnpm -C apps/web exec vitest run tests/person-refresh-progress.test.ts tests/thumbnail-crop-utils.test.ts` (pass; 16 passed)
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)

Metadata dimensions parsing normalization (this session):
- Updated `apps/web/src/lib/photo-metadata.ts` to parse width/height metadata from both numeric and string forms.
- Added `parseDimensionNumber(...)` and applied to:
  - person photo metadata mapping (`mapPhotoToMetadata`)
  - season/show asset metadata mapping (`mapSeasonAssetToMetadata`)
- Result: `Dimensions` now resolves more consistently instead of showing `Unknown` when metadata stored dimensions as strings.

Verification (this session):
- `pnpm -C apps/web exec eslint 'src/components/admin/ImageLightbox.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/lib/photo-metadata.ts'` (pass with pre-existing warning in person page)
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)
- `pnpm -C apps/web exec vitest run tests/thumbnail-crop-utils.test.ts tests/person-refresh-progress.test.ts` (pass; 16 passed)

IMDb episode-title inclusion fix for Person "This Show" filter (this session):
- Updated person gallery show-filter logic in:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
- Added helper `isLikelyImdbEpisodeCaption(...)` to detect IMDb caption pattern like:
  - `"... in Opas and Outbursts (2025)"`
- Added fallback inclusion branch for `galleryShowFilter === "this-show"`:
  - applies only to IMDb-source photos,
  - only when `metadata.show_id` is absent,
  - only when there are no explicit signals the photo belongs to WWHL/other shows,
  - allows episode-title IMDb images to remain visible under the current show instead of being filtered out.

Verification (this session):
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass with pre-existing warning)
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)
- `pnpm -C apps/web exec vitest run tests/person-refresh-progress.test.ts tests/thumbnail-crop-utils.test.ts` (pass; 16 passed)

Person lightbox crop UX: 4x zoom + direct frame manipulation (this session):
- Increased shared thumbnail crop zoom limit from `1.6` to `4.0` in:
  - `apps/web/src/lib/thumbnail-crop.ts`
- Updated person-page manual crop controls to honor the shared zoom max and clamp slider updates:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
- Added lightbox overlay interactions so crop can be edited directly on-image while metadata/details are open:
  - Drag crop frame to move focus (`x/y`)
  - Drag corner handles to resize (zoom in/out) while preserving fixed thumbnail aspect
  - Overlay edits sync live into `TagPeoplePanel` crop sliders/state via page-level bridge state
  - Files:
    - `apps/web/src/components/admin/ImageLightbox.tsx`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
- Updated crop utility test expectation for new zoom clamp max:
  - `apps/web/tests/thumbnail-crop-utils.test.ts`

Verification (this session):
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)
- `pnpm -C apps/web exec vitest run tests/thumbnail-crop-utils.test.ts tests/person-thumbnail-crop-route.test.ts` (pass)
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx' src/components/admin/ImageLightbox.tsx src/lib/thumbnail-crop.ts` (pass with one pre-existing warning in person page hook deps)

Thumbnail/overlay alignment follow-up (this session):
- Fixed person gallery thumbnail zoom origin drift by changing transform origin from center to crop focus point.
  - File: `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - Change: `transformOrigin: presentation.objectPosition`
- This makes saved crop framing align more closely with the overlay preview, especially at higher zoom values.

Verification:
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass with one pre-existing hook-deps warning)

Thumbnail grid/overlay parity fix (this session):
- Root cause: person gallery cards were rendered via `object-fit: cover` + CSS `transform: scale(...)`, which does not map exactly to overlay viewport math at higher zoom.
- Fix in `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx` (`GalleryPhoto`):
  - Compute card viewport using `resolveThumbnailViewportRect(...)` with crop focus/zoom.
  - Use known dimensions from DB, and fallback to loaded `naturalWidth/naturalHeight` for rows with missing DB dimensions.
  - Render image with exact `left/top/width/height` derived from viewport rectangle, so card framing matches overlay framing.
  - Keep previous `objectPosition + transform` as fallback only when viewport dimensions are unavailable.

Verification:
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)
- `pnpm -C apps/web exec vitest run tests/person-gallery-thumbnail-wiring.test.ts tests/thumbnail-crop-utils.test.ts` (pass)
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass with one pre-existing hook-deps warning)

Auto-crop button behavior fix (this session):
- Root cause: crop panel “Reset to Auto” only cleared manual crop JSON and fell back to static heuristics (`x=50,y=32,zoom=1`) instead of triggering backend reframe generation.
- Updated person tag/crop panel in `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`:
  - Added `onRefreshAutoThumbnailCrop(photo)` callback wiring from page-level state.
  - Replaced button behavior with a true auto reframe flow:
    1) clear manual crop
    2) force-run per-photo auto-count endpoint (`cast-photos/.../auto-count` or `media-assets/.../auto-count`)
    3) refetch photos and sync lightbox + thumbnail preview state to persisted auto crop.
  - Updated button label to `Refresh Auto Crop` and enabled it in both manual and auto modes.

Verification:
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass with one pre-existing hook-deps warning)
- `pnpm -C apps/web exec vitest run tests/person-gallery-thumbnail-wiring.test.ts tests/thumbnail-crop-utils.test.ts` (pass)

Overlay appearance debug pass (this session):
- Fixed ambiguous/buggy overlay legend positioning in `ImageLightbox`:
  - Replaced invalid `top-26` class with explicit valid offsets.
  - Clarified labels:
    - `Cyan frame = actual thumbnail crop`
    - `Pink box = subject guide only`
- Added on-image mini `Actual Thumb` inset preview to show the exact rendered thumbnail crop in lightbox, using the same computed viewport math.
- Gallery crop math now prefers loaded natural image dimensions over DB dimensions when available, reducing dimension-drift appearance issues for mismatched metadata.

Verification:
- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json` (pass)
- `pnpm -C apps/web exec eslint 'src/components/admin/ImageLightbox.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass with pre-existing hook-deps warning)

Metadata/content-type + dimensions + default person tags fix (this session):
- Updated `apps/web/src/lib/photo-metadata.ts` to improve content-type inference and avoid `Unknown`/`Other` drift when source metadata is sparse:
  - Added generalized `resolveSectionTag(...)` inference for non-Fandom sources.
  - IMDb captions like `... in <Episode Title> (2025)` now infer `EPISODE STILL` even when explicit type fields are missing.
  - Added broader non-fandom keyword inference for `CONFESSIONAL`, `REUNION`, `PROMO`, `INTRO`, `EPISODE STILL`.
- Added robust metadata dimension extraction in `apps/web/src/lib/photo-metadata.ts`:
  - new exported helper `resolveMetadataDimensions(...)`
  - supports multiple keys and nested structures (e.g. `dimensions.width/height`, `dimensions.w/h`, and string forms like `1080x1350`).
- Wired person page dimension resolution to use the shared extractor:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `resolvePhotoDimensions(...)` now uses `resolveMetadataDimensions(...)`.
- Lightbox metadata panel now shows runtime image dimensions when DB metadata is missing:
  - `apps/web/src/components/admin/ImageLightbox.tsx`
  - `MetadataPanel` now accepts `runtimeDimensions` and uses it as fallback for the displayed `Dimensions` field.
- Ensured the current person is always represented in Tags UI on person page when tags are empty:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `TagPeoplePanel` now receives `defaultPersonTag` and uses it as fallback display/edit seed when no tags exist.
- Added metadata mapping fallback people support:
  - `mapPhotoToMetadata(photo, { fallbackPeople })` used on person lightbox to keep `People` coverage populated with the active person when tag arrays are empty.

Tests/verification:
- `pnpm -C apps/web exec tsc --noEmit` (pass)
- `pnpm exec vitest run -c vitest.config.ts tests/photo-metadata.test.ts` from `apps/web` (pass)
- `pnpm exec vitest run -c vitest.config.ts tests/gallery-advanced-filtering.test.ts` from `apps/web` (pass)
- Added/updated tests in `apps/web/tests/photo-metadata.test.ts`:
  - IMDb episode-still inference from caption
  - Non-fandom content-type inference
  - fallback people handling
  - nested/string dimension extraction

Notes:
- Running the repo-wide `pnpm -C apps/web test -- ...` command still surfaces an unrelated pre-existing failure:
  - `apps/web/tests/show-gallery-delete-wiring.test.ts`
  - not introduced by these changes.
- Follow-up in same pass:
  - `TagPeoplePanel` now auto-seeds and persists the active person tag when a photo has no stored tags and tagging is editable (media_links or cast_photos without source-locked tags).
  - This keeps person-gallery tags from remaining empty for single-person photos.

Tags/People sync fix (this session):
- In person lightbox tag updates (`TagPeoplePanel`), UI state now treats the current tag list as source-of-truth for `people_names`/`people_ids` updates sent to page state.
- Removed lightbox metadata fallback that force-added the active person into `People` display, so metadata `People` now stays aligned with the active tag list.
- Result: removing a person from `Tags` also removes them from `People` in the same lightbox state update.
- File: `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`

Verification:
- `pnpm -C apps/web exec tsc --noEmit` (pass)
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass with one pre-existing warning)

Person refresh stream hardening + live progress fixes (this session):
- Person page refresh flow (`apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`):
  - Removed silent non-stream fallback from `Refresh Images`.
  - Refresh now uses SSE with one automatic retry on stream disconnect.
  - Added stale stream watchdog (12s) to keep progress copy live (`Still running: ...`) while waiting for events.
  - Extended refresh progress state with `rawStage`, `detailMessage`, `runId`, `lastEventAt`.
  - Preserved stage/count rendering and now surfaces detailed stream-stage messages continuously.
- Refresh stage mapping (`apps/web/src/app/admin/trr-shows/people/[personId]/refresh-progress.ts`):
  - Added `metadata_enrichment` mapping into `SYNCING` phase so stage appears in live progress grouping.
- Stream proxy route (`apps/web/src/app/api/admin/trr-api/people/[personId]/refresh-images/stream/route.ts`):
  - Increased `maxDuration` to `1800`.
  - On backend/proxy errors, now always returns HTTP 200 SSE `event:error` payloads (instead of non-200 response body errors) so client parser receives actionable stream errors.
- Blocking refresh proxy route (`apps/web/src/app/api/admin/trr-api/people/[personId]/refresh-images/route.ts`):
  - Increased `maxDuration` to `1800`.
  - Increased backend fetch abort timeout from 10m to 30m to avoid premature abort in long jobs.

Tests and checks:
- `pnpm -C apps/web exec vitest run tests/person-refresh-progress.test.ts tests/person-refresh-images-stream-route.test.ts` (pass; 7 tests)
- `pnpm -C apps/web run lint` (pass; existing unrelated warnings remain)

New tests:
- `apps/web/tests/person-refresh-images-stream-route.test.ts`
  - verifies backend non-OK becomes status-200 SSE `event:error`
  - verifies successful SSE pass-through body behavior.
- Updated `apps/web/tests/person-refresh-progress.test.ts`
  - verifies `metadata_enrichment` maps to `SYNCING`.

Show page refresh summary UX + text-overlay unknown copy (this session):
- Updated show landing page photos refresh notice formatting in `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`.
  - Now outputs grouped status copy:
    - `SUCCESS: ...` with key photo counters (fetched, upserted, mirrored, pruned, etc.)
    - `FAILS: ...` only when one or more failure counters are greater than zero
    - Optional duration suffix
  - Removed noisy zero-value failure fields from the default success message path.
- Updated advanced filter drawer warning copy in `apps/web/src/components/admin/AdvancedFilterDrawer.tsx`.
  - Message now clarifies that `text overlay unknown/unclassified` is separate from `failed detections`.
  - Button label changed from `Detect For Visible` to `Classify Visible Images`.

Verification:
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/components/admin/AdvancedFilterDrawer.tsx'` (pass with 2 pre-existing `@next/next/no-img-element` warnings in show page)

People-count/tag semantics + source-pill link UX (this session):
- Updated tag save routes to stop deriving people-count from tagged people list:
  - `apps/web/src/app/api/admin/trr-api/cast-photos/[photoId]/tags/route.ts`
  - `apps/web/src/app/api/admin/trr-api/media-links/[linkId]/tags/route.ts`
  - `people_count` is now only set when an explicit numeric `people_count` is submitted.
  - `people_count_source` is now `manual` only when explicit count is provided; tag-only updates do not set manual count source.
- Updated person lightbox recount behavior in:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - Recount button is now available for tagged photos and sends `force: true` only when existing count source is `manual`.
  - Frontend fallback no longer infers `manual` source from tag-only edits.
- Hyperlinked Source pill to the original source page in:
  - `apps/web/src/components/admin/ImageLightbox.tsx`
  - Source badge now opens `metadata.sourceUrl` in a new tab when available.

Verification:
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/app/api/admin/trr-api/cast-photos/[photoId]/tags/route.ts' 'src/app/api/admin/trr-api/media-links/[linkId]/tags/route.ts' 'src/components/admin/ImageLightbox.tsx' 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/components/admin/AdvancedFilterDrawer.tsx'` (pass; 2 pre-existing `@next/next/no-img-element` warnings remain in show page)

Fandom mismatch display guard (this session):
- Updated `apps/web/src/lib/server/trr-api/trr-shows-repository.ts` in `getFandomDataByPersonId(...)` to filter out mismatched `core.cast_fandom` rows before returning data to the person page.
- Added person-name matching helpers (normalized-name + URL slug checks) and now keep only rows that match the target `core.people.full_name`.
- Effect: legacy bad rows (wrong person/page linkage) no longer render in `/admin/trr-shows/people/[personId]` Fandom tab.

Verification:
- `pnpm -C apps/web exec eslint 'src/lib/server/trr-api/trr-shows-repository.ts'` (pass with pre-existing repo warnings unrelated to this change)

Person credits expansion for unsynced shows (this session):
- Updated `apps/web/src/lib/server/trr-api/trr-shows-repository.ts` `getCreditsByPersonId(...)` to merge local credits with IMDb name filmography credits from `https://m.imdb.com/name/{nm}/fullcredits`.
- Added IMDb filmography parser + merge logic:
  - Parses fullcredits title anchors (`nm_flmg_job_*` title rows), dedupes by IMDb title id.
  - Maps IMDb title ids back to local shows via `core.shows.imdb_id` + `core.show_external_ids`.
  - Returns credits for non-local shows with `show_id: null` and `external_url` set to IMDb title URL.
- Expanded `TrrPersonCredit` shape with optional fields used by UI (`source_type`, `external_imdb_id`, `external_url`) and nullable `show_id`.
- Updated person credits UI in `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`:
  - Credits with local `show_id` keep linking to `/admin/trr-shows/{showId}`.
  - Credits without local `show_id` now link out to IMDb (`external_url`) and show an `IMDb` pill.

Verification:
- `pnpm -C apps/web exec eslint 'src/lib/server/trr-api/trr-shows-repository.ts'` (pass; pre-existing warnings in file)
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass)

Bravo import + cast eligibility + tabs update (this session, 2026-02-11):
- Added admin proxy routes for Bravo sync/read:
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/import-bravo/commit/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/bravo/videos/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/bravo/news/route.ts`
- Show page updates (`apps/web/src/app/admin/trr-shows/[showId]/page.tsx`):
  - `Sync by Bravo` button under `Refresh`
  - Import-by-Bravo modal with URL, previewed description/airs, selectable images
  - top-level `News` tab
  - `Assets` sub-tabs: `Images`, `Videos`, `Brand`
  - persisted Bravo videos/news rendering (video links open Bravo URLs)
- Season page updates (`apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`):
  - added `Videos` tab from persisted Bravo videos filtered by season
- Person page updates (`apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`):
  - added `Videos` and `News` tabs using persisted Bravo endpoints with `person_id`
  - featured-photo fallback now checks `profile_image_url['bravo']` after cover photo
- Cast eligibility enforcement in app layer:
  - show cast route default `minEpisodes=1` behavior
  - repository show/season cast gating to exclude zero-episode-evidence members
  - total episode count remains rendered in show/season cast UIs
- Added tests:
  - `apps/web/tests/show-cast-route-default-min-episodes.test.ts`
  - `apps/web/tests/show-bravo-videos-proxy-route.test.ts`

Validation (this session):
- `pnpm -C apps/web exec vitest run tests/show-cast-route-default-min-episodes.test.ts tests/show-bravo-videos-proxy-route.test.ts` (pass, 3 tests)
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/cast/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/import-bravo/commit/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/bravo/videos/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/bravo/news/route.ts' 'src/lib/server/trr-api/trr-shows-repository.ts'` (warnings only)
- `pnpm -C apps/web exec tsc --noEmit` fails on pre-existing `TS1501` at `src/lib/server/trr-api/trr-shows-repository.ts:844`

Import-by-Bravo preview UX/date enhancements (this session, 2026-02-11):
- `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Import modal preview now separates sections:
    - `Show Images` (selectable import list)
    - `News` (image + headline + link + posted date)
    - `Videos` (image + title + link + posted date + season filter)
  - Preview videos season filter defaults to latest season available (e.g. Season 10 for Summer House).
- Added posted date rendering in Bravo cards:
  - show page `Assets > Videos`
  - show page top-level `News`
  - season page `Videos`
  - person page `Videos` and `News`
- Types updated for Bravo items to include `published_at`.

Validation:
- `pnpm -C apps/web exec vitest run tests/show-cast-route-default-min-episodes.test.ts tests/show-bravo-videos-proxy-route.test.ts` (pass, 3 tests)
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (warnings only)
- `pnpm -C apps/web exec tsc --noEmit` still fails on pre-existing TS1501 at `src/lib/server/trr-api/trr-shows-repository.ts:844`

Import-by-Bravo modal cast URL visibility (this session, 2026-02-11):
- Updated `/admin/trr-shows/[showId]` Import-by-Bravo modal to render `Cast Member URLs` before `News` and `Videos` preview sections.
- Data source:
  - parsed preview people (`name` + `canonical_url`)
  - discovered person URLs fallback (for unresolved names)
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only; no errors)

Season Social Analytics V2 UI + proxies (this session, 2026-02-11):
- Added new Season Social Analytics dashboard component:
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
  - Includes:
    - filter rail (scope/platform/week)
    - KPI cards
    - weekly trend view
    - platform sentiment breakdown
    - positive/negative sentiment drivers
    - Bravo content leaderboard
    - viewer discussion highlights
    - ingest controls + job status panel
    - CSV/PDF export actions
    - collapsible manual sources fallback (reusing `social-posts-section`)
- Wired season social tab to new component:
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
- Added season social proxy routes:
  - `.../social/targets/route.ts` (`GET`, `PUT`)
  - `.../social/ingest/route.ts` (`POST`)
  - `.../social/jobs/route.ts` (`GET`)
  - `.../social/analytics/route.ts` (`GET`)
  - `.../social/export/route.ts` (`GET`, `format=csv|pdf`)
- Manual social posts season scoping fix:
  - `apps/web/src/components/admin/social-posts-section.tsx`
    - optional `seasonId` prop
    - season-aware list/read and create payload (`trr_season_id`)
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/social-posts/route.ts`
    - `GET` now supports `trr_season_id` query and uses season-scoped repository reads

Validation (this session):
- `pnpm -C apps/web exec eslint 'src/components/admin/season-social-analytics-section.tsx' 'src/components/admin/social-posts-section.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/social-posts/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/export/route.ts'` (pass)
- `pnpm -C apps/web exec tsc --noEmit` still fails on pre-existing `TS1501` at `src/lib/server/trr-api/trr-shows-repository.ts:844`

Sync-by-Bravo preview reliability/UX patch (this session, 2026-02-11):
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - split modal loading flags into `syncBravoPreviewLoading` and `syncBravoCommitLoading`.
  - `Preview` button now shows `Previewing...`; commit button shows `Syncing...` only during commit.
  - moved sync error/notice rendering directly below URL input so failed preview is immediately visible.
  - preview path now handles non-JSON responses defensively and reports HTTP status/message.
  - `Show Images` preview list now excludes URLs already used by preview news/video cards.
  - close/cancel controls disabled while request in flight to prevent accidental dismissal.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only, no errors)
  - `pnpm -C apps/web exec vitest run tests/show-bravo-videos-proxy-route.test.ts tests/show-cast-route-default-min-episodes.test.ts` (pass)

Sync-by-Bravo show-image kind selection (this session, 2026-02-11):
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Added per-image `Type` dropdown in the `Show Images` preview list.
  - Dropdown options map to backend import kinds: `poster`, `backdrop`, `logo`, `episode_still`, `cast`, `promo`, `intro`, `reunion`, `other`.
  - Added frontend default-kind inference (`logo`, `key art/poster`, `backdrop`, etc.) for faster review.
  - Commit request now includes:
    - `selected_show_images: [{url, kind}]`
    - legacy `selected_show_image_urls[]` retained for compatibility.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only)
  - `pnpm -C apps/web exec vitest run tests/show-bravo-videos-proxy-route.test.ts tests/show-cast-route-default-min-episodes.test.ts` (pass)

Sync-by-Bravo modal step flow update (this session, 2026-02-11):
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Added modal step state (`preview` -> `confirm`).
  - Primary button in step 1 now `Next`.
  - Step 2 displays sync review content:
    - cast member URL list being synced
    - selected show images being synced (thumbnail + title/url + selected type)
  - Footer button behavior:
    - step 1: `Cancel` + `Next`
    - step 2: `Back` + `Sync by Bravo`
  - Added `Step 1 of 2` / `Step 2 of 2` indicator in modal header.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only)
  - `pnpm -C apps/web exec vitest run tests/show-bravo-videos-proxy-route.test.ts tests/show-cast-route-default-min-episodes.test.ts` (pass)

Show Logos moved to Brand sub-tab (this session, 2026-02-11):
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Removed `Logos` section from Assets `Images` sub-tab gallery rendering.
  - Added `Logos` section to Assets `Brand` sub-tab, rendered above `ShowBrandEditor`.
  - Added `brandLogoAssets` memo for show-logo assets (`type=show`, `kind=logo`).
  - Updated Assets-tab gallery loading effect so `Brand` triggers `loadGalleryAssets("all")`.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only, no errors)

Sync-by-Bravo season-scoped payload update (this session, 2026-02-11):
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Added `defaultSyncBravoSeasonNumber` (latest show season from TRR seasons data).
- Preview request now sends `season_number` (latest season).
- Commit request now sends `season_number` from selected preview season filter (fallback latest season).
- Purpose: keep Bravo video ingest scoped to current season workflow (Season 10 for Summer House).
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only)
  - `pnpm -C apps/web exec vitest run tests/show-bravo-videos-proxy-route.test.ts tests/show-cast-route-default-min-episodes.test.ts` (pass)

Runtime fix: `defaultSyncBravoSeasonNumber` TDZ error (this session, 2026-02-11):
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Root cause: callback dependency array referenced `defaultSyncBravoSeasonNumber` before that `const` was initialized in component scope.
- Fix: moved `defaultSyncBravoSeasonNumber` memo above `previewSyncByBravo` and `commitSyncByBravo`, removed duplicate lower declaration.
- Validation: `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only).

Sync-by-Bravo auto URL + no-manual-URL modal flow (this session, 2026-02-11):
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Added `inferBravoShowUrl(show.name)` helper to derive `https://www.bravotv.com/{slug}`.
  - `Sync by Bravo` button now:
    - infers URL,
    - sets `syncBravoUrl`,
    - auto-runs preview immediately on open.
  - Removed manual `Bravo Show URL` input field from preview step.
  - Preview step now starts with `Show Name` + `Refresh Preview` button.
  - Confirm step summary block now shows `Show Name` instead of raw URL.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (warnings only)
  - `pnpm -C apps/web exec vitest run tests/show-bravo-videos-proxy-route.test.ts tests/show-cast-route-default-min-episodes.test.ts` (pass)

Season Social page weekly table + scoped ingest controls (this session, 2026-02-11):
- File: `apps/web/src/components/admin/season-social-analytics-section.tsx`
- Changes:
  - Added new weekly table section: `Weekly Bravo Post Count Table`.
  - Table shows one row per week with per-platform post counts:
    - Instagram, YouTube, TikTok, Twitter/X, Total.
  - Added per-row `Run Week` action button.
  - Updated ingest behavior to honor selected scope:
    - uses current `Platform` dropdown (all or one platform),
    - uses current `Week` dropdown (including week 0),
    - sends `date_start/date_end` from selected week window when week-scoped.
  - Added scope hint text under ingest actions:
    - `Run scope: Week X / All Weeks · Platform Y / All Platforms`.
  - Added support for new analytics fields in component typing:
    - `window.week_zero_start`
    - `weekly_platform_posts`.
- Validation:
  - `npm run -s lint -- src/components/admin/season-social-analytics-section.tsx` (pass)
  - `npm run -s test -- tests/show-bravo-videos-proxy-route.test.ts tests/show-cast-route-default-min-episodes.test.ts` (pass)

Show-level Social tab season default + selector (this session, 2026-02-11):
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Show-level Social tab now defaults to the most recent season that is airing/has aired.
  - Added season dropdown (shown when multiple seasons are available) to switch social scope to a different season.
  - Social tab now passes selected season ID into `SocialPostsSection` via `seasonId`, so manual social links are season-scoped by default.
  - Fallback behavior: if no aired seasons are available, defaults to highest season number available.
- Validation:
  - `npm run -s lint -- 'src/app/admin/trr-shows/[showId]/page.tsx'` (pass; existing warnings only)
  - `npm run -s test -- tests/show-bravo-videos-proxy-route.test.ts tests/show-cast-route-default-min-episodes.test.ts` (pass)

Show-level Social tab now renders season analytics dashboard (this session, 2026-02-11):
- File: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Added `SeasonSocialAnalyticsSection` import.
  - Updated show-level Social tab content to render `SeasonSocialAnalyticsSection` when a season is selected from the Social Scope selector.
  - Preserved `SocialPostsSection` as fallback only when no season is selected.
  - Props passed through from selected show-season context:
    - `showId`
    - `seasonNumber`
    - `seasonId`
    - `showName`
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (pass; existing warnings only)
  - Browser smoke test attempted, but local browser automation was blocked by launcher/session tooling errors (`playwright` launch conflict and `chrome-devtools` transport closed).

Bravo profile + cast gallery UX alignment (this session, 2026-02-11):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
- Changes:
  - Sync-by-Bravo modal now has a top-level `Sync Season` dropdown and sends selected `season_number` in preview + commit payloads.
  - Added helper selection logic so cast thumbnails prefer `bravo_profile` media links (season-specific first), then fallback images.
  - Show cast keeps manual `cover_photo_url` priority; Bravo profile images become fallback when no manual cover is assigned.
  - Season cast cards now match show cast cards:
    - uniform `4:5` (`aspect-[4/5]`) image containers,
    - crop-preview rendering using `thumbnail_focus_x/y`, `thumbnail_zoom`, `thumbnail_crop_mode`, and `resolveThumbnailPresentation`.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/lib/server/trr-api/trr-shows-repository.ts'` (pass with pre-existing warnings only).
  - `curl` smoke:
    - show social page loads (`200`) at `/admin/trr-shows/7782652f-783a-488b-8860-41b97de32e75?tab=social`.
    - Sync-by-Bravo endpoints exist and enforce auth (`401` unauthenticated).
  - Browser automation note:
    - MCP Playwright/Chrome DevTools live UI run was blocked in this environment (Chrome persistent-session launch conflict / devtools transport closure).

Cast member External IDs now render Bravo profile socials (this session, 2026-02-11):
- File: `apps/web/src/components/admin/ExternalLinks.tsx`
- Changes:
  - Added support for social keys populated by Bravo profile sync, including both legacy and canonical forms:
    - `instagram`/`instagram_id`/`instagram_url`
    - `twitter`/`twitter_id`/`twitter_url`
    - `facebook`/`facebook_id`/`facebook_url`
    - `tiktok`/`tiktok_id`/`tiktok_url`
    - `youtube`/`youtube_id`/`youtube_url`
  - External IDs panel now displays clickable links for TikTok and YouTube in addition to Instagram/Twitter/Facebook.
  - Link builder now prefers stored `*_url` when present; otherwise derives URL from handle/ID.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/components/admin/ExternalLinks.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx'` (pass)

PR stabilization + CI fixes (this session, 2026-02-12):
- Merged `origin/main` into `feat/admin-ui-gallery-fonts-surveys`.
- Fixed CI TypeScript build incompatibility in IMDb parsing regex:
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
- Addressed review thread regression for manual tag edits:
  - `apps/web/src/app/api/admin/trr-api/cast-photos/[photoId]/tags/route.ts`
  - `apps/web/src/app/api/admin/trr-api/media-links/[linkId]/tags/route.ts`
  - Added tests: `apps/web/tests/tags-people-count-source-route.test.ts`
- Fixed Vercel deployment failure by capping serverless function timeout values:
  - `apps/web/src/app/api/admin/trr-api/people/[personId]/refresh-images/route.ts`
  - `apps/web/src/app/api/admin/trr-api/people/[personId]/refresh-images/stream/route.ts`
- Validation:
  - `pnpm -C apps/web run test:ci -- --coverage` (109 passed)
  - `DATABASE_URL="" NEXT_PUBLIC_FIREBASE_API_KEY="placeholder-api-key-for-build" NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="placeholder.firebaseapp.com" NEXT_PUBLIC_FIREBASE_PROJECT_ID="demo-build" pnpm -C apps/web run build` (pass)
- PR #33 now has resolved review thread, passing checks, and clean merge state.

Show gallery cast/promo bucketing + Deadline source visibility (this session, 2026-02-12):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
- Changes:
  - Reworked `Assets > Images` grouping so only `kind=cast` and `kind=promo` appear in `Cast Photos & Promos`.
  - Added `Other` section for remaining images (including non-official cast portraits/headshots).
  - Fixed scrape source normalization to honor `source_domain`/domain-like metadata when URL fields are absent, improving source filters such as `deadline.com` on linked duplicates.
- Validation:
  - `pnpm -C apps/web lint 'src/app/admin/trr-shows/[showId]/page.tsx' src/lib/server/trr-api/trr-shows-repository.ts` (pass; pre-existing warnings only).

Plan closure: image variants + season health/coverage/archive diagnostics (this session, 2026-02-12):
- Files:
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route.ts`
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
- Changes:
  - Added person photo variant URL support (`original_url`, `display_url`, `detail_url`, `crop_display_url`, `crop_detail_url`) in repository responses and person page rendering.
  - Season cast data now supports archive-footage evidence (`archive_episodes_in_season`) and optional `include_archive_only=true` route behavior.
  - Season page now includes:
    - `Eligible Season` / `Placeholder Season` guardrail with override for media assignment.
    - Episode coverage matrix section (still/description/air date/runtime).
    - Archive-footage cast section separated from active cast counts.
    - Gallery diagnostics summary + quick filters for missing variants/oversized/unclassified assets.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route.ts' 'src/lib/server/trr-api/trr-shows-repository.ts'` (pass; warning-only)
  - `pnpm -C apps/web exec next build --webpack` (pass)

Show Admin overhaul + season diagnostics implementation pass (this session, 2026-02-12):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `apps/web/src/lib/admin/gallery-diagnostics.ts`
  - `apps/web/tests/gallery-diagnostics.test.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/links/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/links/discover/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/links/[linkId]/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/roles/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/roles/[roleId]/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/cast/[personId]/roles/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/cast-role-members/route.ts`
- Changes:
  - Show page IA updates:
    - default landing tab now `Overview` (details tab id retained for URL compatibility)
    - `?tab=overview` alias support added
    - details fields are now read-only until `Edit`; added explicit `Edit / Save / Cancel` flow
  - Overview details expansion:
    - added `Networks & Streaming` panel
    - added API-backed `Links` section with grouping (`Official`, `Social`, `Knowledge`, `Cast Announcements`, `Other`)
    - added pending link review controls (`Approve`, `Reject`, `Edit`, `Delete`) and discovery action
  - Assets updates:
    - show assets heading corrected from `Season Gallery` -> `Show Gallery`
    - added inline `Clear Filters` button in gallery toolbar when advanced filters are active
  - Cast intelligence updates:
    - added sort controls (`Episodes`, `Season Recency`, `Name`) with asc/desc
    - added filter controls (`Seasons`, `Roles`, `Credit`, `Has Image`)
    - wired role catalog + assignment UX (`Add` role, `Edit Roles` per person)
    - preserves thumbnail priority by preferring `cover_photo_url`, then existing cast photo fallbacks
  - Season gallery diagnostics enhancement:
    - diagnostics module added with locked missing-variant rule:
      - require `base.card`, `base.detail`
      - require `crop_card`, `crop_detail` only when active crop signature exists
    - diagnostics card is now collapsible (collapsed by default)
    - added unique missing-variant breakdown list with counts, sorted by count desc then key asc
    - missing-variants quick filter now uses same rule as breakdown
    - empty state `No missing variants detected.` added
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/lib/admin/gallery-diagnostics.ts' 'tests/gallery-diagnostics.test.ts'` (pass; warning-only on pre-existing `no-img-element`)
  - `pnpm -C apps/web exec vitest run tests/gallery-diagnostics.test.ts` (5 passed)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

Stability follow-up (this session, 2026-02-12):
- File:
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
- Change:
  - Fixed TypeScript event-handler mismatch by wrapping `fetchJobs` button click in a zero-arg callback (`onClick={() => void fetchJobs()}`).
- Validation:
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

Season social ingest run-aware UI update (this session, 2026-02-12):
- File:
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
- Changes:
  - Updated ingest UX to align with backend run/stage contract:
    - adds `depth_preset` selector (`quick|balanced|deep`)
    - sends unified ingest payload with `ingest_mode=posts_and_comments`, `depth_preset`, `max_replies_per_post`
    - tracks active `run_id` returned by ingest endpoint
    - polls jobs filtered by `run_id` while ingest is active
    - stage-aware progress/status rendering (posts/comments)
    - run-scoped completion summary before resetting ingest state.
- Validation:
  - `pnpm -C apps/web exec eslint src/components/admin/season-social-analytics-section.tsx` (pass)
  - `pnpm -C apps/web exec tsc --noEmit` (pass)
- Follow-up validation note:
  - full workspace `tsc --noEmit` currently fails on unrelated pre-existing show admin page symbols in `apps/web/src/app/admin/trr-shows/[showId]/page.tsx` (`renameShowRole`, `toggleShowRoleActive`).
  - social-ingest changes validated with targeted ESLint on touched files.

Show page cast-role management + thumbnail precedence refinements (this session, 2026-02-12):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
- Changes:
  - Added role catalog admin actions in Cast UI:
    - rename role
    - activate/deactivate role
  - Cast UI thumbnail default now prefers cast-intelligence/photo pipeline result first, then existing cast photo fallback, then manual cover fallback.
  - Updated preferred person gallery photo ordering in repository to prioritize:
    - Bravo profile (season-matched first)
    - official season announcement
    - images marked `people_count=1`
    - remaining gallery order fallback
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/lib/server/trr-api/trr-shows-repository.ts'` (warning-only)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)
- Added admin proxy route for run cancellation:
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel/route.ts`
- Validation re-run (same session):
  - `pnpm -C apps/web exec tsc --noEmit` now passes after sync with latest local state.
- Small UX follow-up (same session):
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
  - Added `Cancel Active Run` control in Ingest panel, wired to run cancel proxy endpoint and run-scoped job refresh.
  - Validation: `pnpm -C apps/web exec eslint src/components/admin/season-social-analytics-section.tsx` and `pnpm -C apps/web exec tsc --noEmit` (pass).

Person canonical-profile source-order controls (this session, 2026-02-12):
- Files:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/src/app/api/admin/trr-api/people/[personId]/route.ts`
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `docs/cross-collab/TASK6/STATUS.md`
- Changes:
  - Added source-order control UI in person `Canonical Profile` (`tmdb`, `fandom`, `manual`) with `Up/Down`, `Save Order`, and `Reset`.
  - Canonical field resolver now consumes dynamic source order rather than fixed hardcoded order.
  - Added `PATCH /api/admin/trr-api/people/[personId]` to persist source order.
  - Added repository method `updatePersonCanonicalProfileSourceOrder(...)` writing to `core.people.external_ids.canonical_profile_source_order`.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/app/api/admin/trr-api/people/[personId]/route.ts' 'src/lib/server/trr-api/trr-shows-repository.ts'` (pass; warning-only)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

Social ingest active-run UX fix + full-ingest payload (this session, 2026-02-12):
- File:
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
- Changes:
  - Fixed "Run Week / platform run does nothing" race:
    - added `hasObservedRunJobs` guard so a run is not marked complete before first job rows are observed.
  - Enforced active-run-only job rendering:
    - no fallback to historical season jobs when no `activeRunId`
    - `fetchJobs` now hard-requires `run_id` and clears local jobs when missing.
  - Increased per-poll job window to `limit=250` to cover full active runs.
  - Updated in-panel progress to include queued/pending/retrying/running states so users see immediate state transitions.
  - Removed depth selector behavior from ingest payload and always sends full-ingest settings:
    - `ingest_mode=posts_and_comments`
    - high limits for `max_posts_per_target`, `max_comments_per_post`, `max_replies_per_post`.
- Validation:
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)
  - `pnpm -C apps/web exec eslint src/components/admin/season-social-analytics-section.tsx` (pass)
