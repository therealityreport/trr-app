# Session Handoff (TRR-APP)

Purpose: persistent state for multi-turn AI agent sessions in `TRR-APP`. Update before ending a session or requesting handoff.

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
