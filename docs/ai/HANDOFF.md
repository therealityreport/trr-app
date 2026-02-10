# Session Handoff (TRR-APP)

Purpose: persistent state for multi-turn AI agent sessions in `TRR-APP`. Update before ending a session or requesting handoff.

## Goal

- Fix TRR-APP dev "infinite loading" + admin TRR-Core pages failing after moving into the multi-repo workspace.

## Status

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
