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
Updated by: Codex
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
