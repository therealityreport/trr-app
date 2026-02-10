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
  - “Covered Shows” renamed to “Added Shows”
  - Real Housewives shows display acronyms (prefers `alternative_names`, falls back to title-derived)
  - file: `apps/web/src/app/admin/trr-shows/page.tsx`
- Per-show Gallery tab renamed to **ASSETS** (with alias support for `?tab=gallery`) and split into Media/Brand subviews:
  - file: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Media view: existing gallery + import images unchanged
  - Brand view: new editor component (palette/fonts/assets + season overrides + cast portraits)
    - component: `apps/web/src/components/admin/ShowBrandEditor.tsx`
- Show landing page cleanup:
  - hides placeholder seasons (no dates available or <= 1 episode)
  - season badge uses the filtered season count (so placeholders aren’t “counted”)
  - show page tabs are pill-style and “Social Media” replaces “Social Posts”
  - season accordions are simplified (no EPISODES/MEDIA/CAST MEMBERS links inside)
  - file: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
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
- `pnpm -C apps/web exec tsc --noEmit` (pass)
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
