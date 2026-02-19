# Session Handoff (TRR-APP)

Purpose: persistent state for multi-turn AI agent sessions in `TRR-APP`. Update before ending a session or requesting handoff.

## Latest Update (2026-02-19)

- February 19, 2026: Completed `/admin/networks` production sync UI/auth hardening and BW logo variant visibility.
  - Files:
    - `apps/web/src/app/admin/networks/page.tsx`
    - `apps/web/src/lib/server/admin/networks-streaming-repository.ts`
    - `apps/web/tests/networks-streaming-summary-route.test.ts`
    - `apps/web/tests/networks-streaming-sync-proxy-route.test.ts`
    - `apps/web/tests/admin-networks-page-auth.test.tsx` (new)
  - Changes:
    - Fixed `/admin/networks` unauthorized behavior by adding Firebase bearer header flow (`auth.currentUser?.getIdToken()`) on:
      - `GET /api/admin/networks-streaming/summary`
      - `POST /api/admin/networks-streaming/sync`
    - Extended summary row model + SQL metadata joins with:
      - `hosted_logo_black_url`
      - `hosted_logo_white_url`
      - derived `has_bw_variants`.
    - Expanded `/admin/networks` UI:
      - added missing BW variants status/count chips and row-level status badges,
      - sync success panel now shows black/white mirror counts and unresolved count,
      - added expandable unresolved list (name/type/reason) + truncation note.
    - Extended route tests to include new response fields and added page-level regression test asserting bearer auth headers and unresolved rendering.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/networks-streaming-summary-route.test.ts tests/networks-streaming-sync-proxy-route.test.ts tests/admin-networks-page-auth.test.tsx` (`8 passed`)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web run test:ci` (`80 files passed`, `296 tests passed`)
    - `pnpm -C apps/web run lint` blocked by existing repo-level ESLint config issue (`TypeError: Converting circular structure to JSON`), not introduced by this task.

- February 19, 2026: Updated admin landing behavior so Networks & Streaming is a standard tool card that routes to a dedicated page.
  - Files:
    - `apps/web/src/app/admin/page.tsx`
    - `apps/web/src/app/admin/networks/page.tsx` (new)
  - Changes:
    - Removed inline Networks & Streaming table/sync container from `/admin` landing page.
    - Added `Networks & Streaming` as a normal `Available Tools` card with route target `/admin/networks`.
    - Added dedicated `/admin/networks` page that now hosts the full summary table, sync/mirror action, and refresh flow.
  - Validation:
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web exec vitest run tests/networks-streaming-summary-route.test.ts tests/networks-streaming-sync-proxy-route.test.ts` (`6 passed`)

- February 19, 2026: Added admin landing "Networks & Streaming" container with full summary + sync/mirror controls.
  - Files:
    - `apps/web/src/app/admin/page.tsx`
    - `apps/web/src/lib/server/admin/networks-streaming-repository.ts`
    - `apps/web/src/app/api/admin/networks-streaming/summary/route.ts` (new)
    - `apps/web/src/app/api/admin/networks-streaming/sync/route.ts` (new)
    - `apps/web/tests/networks-streaming-summary-route.test.ts` (new)
    - `apps/web/tests/networks-streaming-sync-proxy-route.test.ts` (new)
  - Changes:
    - Added DB-backed summary repository for networks and streaming providers:
      - Available counts from `core.shows`
      - Added counts from `admin.covered_shows`
      - Streaming primary source: `core.show_watch_providers + core.watch_providers` (`US`, `flatrate|ads`)
      - Streaming fallback source: `core.shows.streaming_providers` for uncovered names
      - Included persisted metadata/health fields (`hosted_logo_url`, `wikidata_id`, `wikipedia_url`, `has_logo`, `has_links`)
      - Normalized joins/grouping case-insensitively and avoided unsafe UUID casts on covered IDs.
    - Added admin API routes:
      - `GET /api/admin/networks-streaming/summary`
      - `POST /api/admin/networks-streaming/sync` (proxy to backend `/api/v1/admin/shows/sync-networks-streaming`)
      - sync proxy includes auth forwarding, payload sanitization, 15m timeout, and actionable `502/504` failures.
    - Added admin dashboard container:
      - table columns for type/name/available/added/logo/wikipedia/wikidata/status
      - manual `Sync/Mirror Networks & Streaming` action
      - post-sync counters + automatic summary refresh.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/networks-streaming-summary-route.test.ts tests/networks-streaming-sync-proxy-route.test.ts` (`6 passed`)
    - `pnpm -C apps/web run test:ci` (`75 files passed`, `286 tests passed`)
    - `pnpm -C apps/web run lint` blocked by existing repo-level ESLint config issue (`TypeError: Converting circular structure to JSON`), not introduced by this task.

- February 19, 2026: Added week-level social comment sync action to backfill/save comment coverage for the selected week window.
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
    - `apps/web/tests/week-social-thumbnails.test.tsx`
  - Changes:
    - Added `Sync All Comments` action in week/time-period view (and platform-specific label when a single platform tab is selected).
    - Action enqueues social ingest scoped to the selected week range with high comment/reply caps and `sync_strategy=incremental`:
      - `ingest_mode=posts_and_comments`
      - `date_start/date_end` from selected week window
      - `source_scope` preserved from query params
      - optional `platforms` filter when tab is not `All`
    - Added inline success/error status messaging for queued sync runs.
    - Added clearer mismatch helper text in post stats drawer when platform comment totals exceed database totals.
  - Validation:
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/week-social-thumbnails.test.tsx` (`2 passed`)
  - Notes:
    - Targeted ESLint invocation in this workspace currently errors due a pre-existing shared-config issue (`TypeError: Converting circular structure to JSON`).

- February 17, 2026: Completed person-gallery refresh UX and pipeline wiring (full per-image refresh, variant proxies, hosted-first fallback, and cross-tab refresh log popup).
  - Files:
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/refresh-progress.ts`
    - `apps/web/src/components/admin/ImageLightbox.tsx`
    - `apps/web/src/app/api/admin/trr-api/media-assets/[assetId]/variants/route.ts` (new)
    - `apps/web/src/app/api/admin/trr-api/cast-photos/[photoId]/variants/route.ts` (new)
    - `apps/web/tests/person-refresh-progress.test.ts`
    - `apps/web/tests/image-lightbox-metadata.test.tsx`
    - `apps/web/tests/person-gallery-thumbnail-wiring.test.ts`
    - `apps/web/tests/media-asset-variants-proxy-route.test.ts` (new)
    - `apps/web/tests/cast-photo-variants-proxy-route.test.ts` (new)
  - Changes:
    - Added route proxies for variant generation:
      - `POST /api/admin/trr-api/media-assets/[assetId]/variants`
      - `POST /api/admin/trr-api/cast-photos/[photoId]/variants`
      - includes auth forwarding, timeout handling, and backend error passthrough.
    - Added `resizing -> RESIZING` stage mapping in person refresh progress utilities.
    - Person page updates:
      - hosted-first fallback for original image URL resolution (`hosted_url` before external original URL),
      - lightbox refresh now runs full best-effort pipeline:
        - `mirror -> auto-count -> detect text -> variants (base + crop when crop exists)`,
      - added unified refresh log state with header-level popup visible across all tabs,
      - logs now ingest both page-level SSE progress/error/complete events and per-image pipeline step events.
    - Lightbox management action label changed:
      - `Refresh Metadata Jobs` -> `Refresh Full Pipeline`.
  - Validation:
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web exec vitest run tests/person-refresh-progress.test.ts tests/image-lightbox-metadata.test.tsx tests/person-gallery-thumbnail-wiring.test.ts tests/media-asset-variants-proxy-route.test.ts tests/cast-photo-variants-proxy-route.test.ts` (`17 passed`)
    - `pnpm -C apps/web exec eslint ...` blocked by existing repository config issue (`TypeError: Converting circular structure to JSON` from eslint/eslintrc); not introduced by this task.

- February 17, 2026: Implemented canonical slug URLs and path-based tab routing for admin show/season pages with legacy URL auto-canonicalization.
  - Files:
    - `apps/web/src/lib/admin/show-admin-routes.ts` (new)
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/page.tsx`
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
    - `apps/web/src/components/admin/SurveyQuestionsEditor.tsx`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
    - `apps/web/next.config.ts`
    - `apps/web/tests/show-admin-routes.test.ts` (new)
    - `apps/web/tests/trr-shows-slug-route.test.ts` (new)
  - Changes:
    - Added centralized route parser/builder utilities for show and season admin URLs:
      - canonical show root = overview.
      - show/season tabs and assets sub-tabs encoded in path segments.
      - legacy `tab/assets` query parsing + cleanup helpers.
    - Added explicit `next.config.ts` `beforeFiles` rewrites for path-based show/season tab routes to existing render pages.
    - Updated show and season admin pages to:
      - parse tab state from pathname first and query fallback second.
      - navigate via canonical path URLs (no query-tab routing).
      - auto-canonicalize legacy UUID/query/alias URLs to slug + path equivalents while preserving non-routing query params.
    - Updated show list and covered-show links to emit canonical slug URLs.
    - Updated week drilldown and season social back links to path-based routes.
    - Updated survey cast-role setup guidance link to path form (`/cast`).
    - Added slug-aware person-page handling:
      - preserves slug in `showId` query context.
      - resolves slug to UUID for API calls.
      - prefers current slug context for same-show credit links, UUID fallback for others.
    - Extended TRR show payloads from repository with `slug` and `canonical_slug` for both search and single-show fetches.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/lib/admin/show-admin-routes.ts' 'src/app/admin/trr-shows/page.tsx' 'src/components/admin/season-social-analytics-section.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'src/components/admin/SurveyQuestionsEditor.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/lib/server/trr-api/trr-shows-repository.ts' 'next.config.ts'` (pass with existing warnings only, no errors)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web exec vitest run tests/show-admin-routes.test.ts tests/trr-shows-slug-route.test.ts` (pass; 2 files / 8 tests)
  - Notes:
    - Existing legacy alias pages remain in place as fallback, but canonical navigation now routes through slug/path builders.

- February 17, 2026: Implemented Task 10 social admin completion/polling correctness and incremental/full-refresh ingest UX.
  - Files:
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/tests/season-social-analytics-section.test.tsx`
    - `docs/cross-collab/TASK9/PLAN.md`
    - `docs/cross-collab/TASK9/OTHER_PROJECTS.md`
    - `docs/cross-collab/TASK9/STATUS.md`
  - Changes:
    - Fixed false ingest completion race by deriving completion from authoritative run lifecycle status/summary, not transient run-scoped jobs emptiness.
    - Replaced overlapping interval polling with single-flight polling loop and stale-response guards.
    - Preserved last-good jobs data on transient empty/error poll responses while run remains active.
    - Added ingest `Sync Mode` UI with default `Incremental` and explicit `Full Refresh` override; payload now includes `sync_strategy`.
    - Upgraded run dropdown labels to include week scope, platform scope, progress, item totals, timestamp, and short run id.
    - Extended `SocialRun` typing for additive backend fields (`config`, `initiated_by`, richer summary reads).
  - Validation:
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/season-social-analytics-section.test.tsx` (`11 passed`)
  - Cross-repo:
    - Backend contract/migration updates completed under `TRR-Backend/docs/cross-collab/TASK10/`.
    - screenalytics compatibility validation completed with no required code changes.

- February 17, 2026: Implemented canonical slug URLs and path-based tab routing for admin show/season pages with legacy URL auto-canonicalization.
  - Files:
    - `apps/web/src/lib/admin/show-admin-routes.ts` (new)
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/page.tsx`
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
    - `apps/web/src/components/admin/SurveyQuestionsEditor.tsx`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
    - `apps/web/next.config.ts`
    - `apps/web/tests/show-admin-routes.test.ts` (new)
    - `apps/web/tests/trr-shows-slug-route.test.ts` (new)
  - Changes:
    - Added centralized route parser/builder utilities for show and season admin URLs:
      - canonical show root = overview.
      - show/season tabs and assets sub-tabs encoded in path segments.
      - legacy `tab/assets` query parsing + cleanup helpers.
    - Added explicit `next.config.ts` `beforeFiles` rewrites for path-based show/season tab routes to existing render pages.
    - Updated show and season admin pages to:
      - parse tab state from pathname first and query fallback second.
      - navigate via canonical path URLs (no query-tab routing).
      - auto-canonicalize legacy UUID/query/alias URLs to slug + path equivalents while preserving non-routing query params.
    - Updated show list and covered-show links to emit canonical slug URLs.
    - Updated week drilldown and season social back links to path-based routes.
    - Updated survey cast-role setup guidance link to path form (`/cast`).
    - Added slug-aware person-page handling:
      - preserves slug in `showId` query context.
      - resolves slug to UUID for API calls.
      - prefers current slug context for same-show credit links, UUID fallback for others.
    - Extended TRR show payloads from repository with `slug` and `canonical_slug` for both search and single-show fetches.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/lib/admin/show-admin-routes.ts' 'src/app/admin/trr-shows/page.tsx' 'src/components/admin/season-social-analytics-section.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'src/components/admin/SurveyQuestionsEditor.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/lib/server/trr-api/trr-shows-repository.ts' 'next.config.ts'` (pass with existing warnings only, no errors)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web exec vitest run tests/show-admin-routes.test.ts tests/trr-shows-slug-route.test.ts` (pass; 2 files / 8 tests)
  - Notes:
    - Existing legacy alias pages remain in place as fallback, but canonical navigation now routes through slug/path builders.

- February 17, 2026: Implemented Task 10 social admin completion/polling correctness and incremental/full-refresh ingest UX.
  - Files:
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/tests/season-social-analytics-section.test.tsx`
    - `docs/cross-collab/TASK9/PLAN.md`
    - `docs/cross-collab/TASK9/OTHER_PROJECTS.md`
    - `docs/cross-collab/TASK9/STATUS.md`
  - Changes:
    - Fixed false ingest completion race by deriving completion from authoritative run lifecycle status/summary, not transient run-scoped jobs emptiness.
    - Replaced overlapping interval polling with single-flight polling loop and stale-response guards.
    - Preserved last-good jobs data on transient empty/error poll responses while run remains active.
    - Added ingest `Sync Mode` UI with default `Incremental` and explicit `Full Refresh` override; payload now includes `sync_strategy`.
    - Upgraded run dropdown labels to include week scope, platform scope, progress, item totals, timestamp, and short run id.
    - Extended `SocialRun` typing for additive backend fields (`config`, `initiated_by`, richer summary reads).
  - Validation:
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/season-social-analytics-section.test.tsx` (`11 passed`)
  - Cross-repo:
    - Backend contract/migration updates completed under `TRR-Backend/docs/cross-collab/TASK10/`.
    - screenalytics compatibility validation completed with no required code changes.

- February 17, 2026: Completed social admin reliability hardening across social proxy routes and season analytics run-scoped UX.
  - Files:
    - `apps/web/src/lib/server/trr-api/social-admin-proxy.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/export/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts`
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/tests/season-social-analytics-section.test.tsx`
    - `apps/web/tests/social-admin-proxy.test.ts`
    - `apps/web/vitest.config.ts`
    - `apps/web/tests/mocks/server-only.ts`
  - Changes:
    - Added shared social proxy helper with season resolution, timeout, retry policy, and standardized error envelope `{ error, code, retryable, upstream_status }`.
    - Refactored social route handlers to use the helper and route-specific retry policies (GET=2 retries, cancel POST=1 retry, ingest POST=no auto-retry).
    - Added new route proxy `GET /api/admin/trr-api/shows/{showId}/seasons/{seasonNumber}/social/runs`.
    - Refactored season social analytics UI state model to decouple analytics/targets/runs/jobs fetch errors, replaced startup `Promise.all` with `Promise.allSettled`, and removed global hard-fail behavior for partial fetch errors.
    - Enforced strict run-scoped jobs behavior with explicit empty state when no run is selected and added run-history selector (defaulting to active run only when present).
    - Added non-blocking polling recovery messaging while preserving last-good data on transient failures.
    - Fixed manual `Refresh Jobs` click handling to route transient failures into section-level jobs errors without unhandled promise rejections.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/lib/server/trr-api/social-admin-proxy.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/export/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts' 'src/components/admin/season-social-analytics-section.tsx' 'tests/season-social-analytics-section.test.tsx' 'tests/social-admin-proxy.test.ts' 'vitest.config.ts' 'tests/mocks/server-only.ts'` (pass)
    - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx tests/social-admin-proxy.test.ts` (`2 files passed`, `9 tests passed`)

- February 17, 2026: Reworked show cast/admin UX with a dedicated Settings tab and fixed show-level cast filtering behavior.
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Changes:
    - Added top-level `Settings` tab to the show page navigation.
    - Moved show links management into `Settings` and organized links by:
      - `Show Pages`
      - `Season Pages`
      - `Cast Member Pages`
    - Moved `Role Catalog` management out of the cast filter panel into `Settings` (including add/rename/activate/deactivate actions).
    - Combined cast `Roles` and `Credit` filters into a single `Roles & Credit` filter group.
    - Fixed show-level season chips to source from actual show season records (plus known cast season evidence), instead of only `latest_season` from cast-role-members payload.
    - Updated details tab messaging to point link/role management to `Settings`.
  - Validation:
    - `pnpm -C apps/web run lint` (pass; existing unrelated warnings only)
    - `pnpm -C apps/web exec next build --webpack` (pass)

- February 17, 2026: Fixed person-page fandom ownership leakage (Henry Barlow showing John/Lisa data) and added deduced family fallback when no verified fandom page exists.
  - Files:
    - `apps/web/src/lib/server/trr-api/fandom-ownership.ts`
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
    - `apps/web/src/app/api/admin/trr-api/people/[personId]/fandom/route.ts`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/tests/fandom-person-ownership.test.ts`
    - `apps/web/tests/person-fandom-route.test.ts`
  - Changes:
    - Replaced permissive fandom name matching (which previously allowed last-name/token-only matches) with stricter person ownership matching.
    - Person fandom rows now require strong identity match against `full_name`, `page_title`, or fandom page slug; mismatches are suppressed.
    - Added show-scoped fallback deduction when no valid fandom page row exists:
      - derives family relationships from cast-matrix role sync metadata (`Kid` + `relationship_from`) and sibling inference.
      - returns a synthetic `deduced_relationships` row with only relationship/family content populated.
    - Added strict fandom-photo ownership filter in person gallery fetch:
      - fandom/fandom-gallery images whose source page resolves to another person are excluded from person gallery responses.
    - Wired people-page fandom request to pass `showId` to keep fallback relationship deduction scoped to the current show.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/lib/server/trr-api/trr-shows-repository.ts' 'src/lib/server/trr-api/fandom-ownership.ts' 'src/app/api/admin/trr-api/people/[personId]/fandom/route.ts' 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'tests/fandom-person-ownership.test.ts' 'tests/person-fandom-route.test.ts'` (pass; existing unrelated warning in `trr-shows-repository.ts` about `enrichShowsWithImageUrls`)
    - `pnpm -C apps/web exec vitest run tests/fandom-person-ownership.test.ts tests/person-fandom-route.test.ts` (pass; 2 files / 5 tests)
    - `pnpm -C apps/web exec tsc -p tsconfig.json --noEmit --pretty false` (pass)

- February 17, 2026: Enforced Figma-specific Likert typography defaults in preview/editor flow (instead of generic global fonts).
  - Files:
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - Changes:
    - For `agree-likert-scale` template previews:
      - Default template fonts now map to Figma stack:
        - heading: `Gloucester`
        - statement: `Rude Slab Condensed`
        - options: `Plymouth Serial`
      - Added explicit heading font injection (`subTextHeadingFontFamily` / `promptFontFamily`) in preview config overrides so heading no longer falls back to global/default fonts.
      - `agree-likert-scale` now starts with per-template defaults (global defaults toggle off by default for that variant) so editor dropdowns show template fonts immediately.
    - Preserved `Preview Survey` selector behavior from prior update (default `RHOSLC S6 Survey`, RHOP hidden from selector options).
  - Validation:
    - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx src/components/survey/MatrixLikertInput.tsx` (pass)
    - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx tests/three-choice-slider-input.test.tsx tests/is-question-complete.test.ts` (pass)
    - `pnpm -C apps/web exec tsc --noEmit` blocked by existing unrelated syntax errors in `src/lib/server/trr-api/trr-shows-repository.ts` (not touched in this task).

- February 17, 2026: Added preview survey selector in Questions tab defaults and defaulted examples to RHOSLC S6 (RHOP hidden from selection/filter).
  - Files:
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - Changes:
    - Added `Preview Survey` selector inside `Default Settings` (collapsible section), wired to filter per-component example choices.
    - Default preview source is now `RHOSLC S6 Survey`.
    - RHOP sources are excluded from selector options and from fallback example selection.
    - Preview-card storage keys now include selected source so per-template edits are isolated per survey selection.
    - Added auth preview entries for email/password/country-dropdown in the same iteration.
  - Validation:
    - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx tests/three-choice-slider-input.test.tsx tests/is-question-complete.test.ts` (pass)

- February 17, 2026: Follow-up UI polish for Fonts > Questions previews (cast decision + Likert parity + default settings UX + auth field placement).
  - Files:
    - `apps/web/src/components/survey/CastDecisionCardInput.tsx`
    - `apps/web/src/components/survey/MatrixLikertInput.tsx`
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - Changes:
    - Cast decision card:
      - Reduced selected `Demote` label size by `1px` when clicked/active to prevent text crowding in the circle on mobile.
    - Survey default settings panel:
      - Made `Default Settings` collapsible and closed by default.
      - Added explicit `Edit Settings` / `Hide Settings` toggle.
    - Catalog placement:
      - Moved Email, Password, and Country Dropdown Select previews from Survey section into Auth / Signup Fields.
      - Added corresponding auth preview keys (`auth-email`, `auth-password`, `auth-country-dropdown`).
    - Likert Figma parity (`69:94`):
      - Refined heading/statement/option typography (weights + line-heights) and preserved Figma bar dimensions/colors with responsive scaling.
  - Validation:
    - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx src/components/survey/CastDecisionCardInput.tsx src/components/survey/MatrixLikertInput.tsx tests/matrix-likert-input.test.tsx tests/three-choice-slider-input.test.tsx` (pass)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx tests/three-choice-slider-input.test.tsx tests/is-question-complete.test.ts` (pass)

- February 17, 2026: Split cast-decision UI out of matrix likert and aligned both templates to the Figma variants (`69:94` and `160:34`) with mobile-responsive sizing.
  - Files:
    - `apps/web/src/components/survey/CastDecisionCardInput.tsx`
    - `apps/web/src/components/survey/MatrixLikertInput.tsx`
    - `apps/web/src/components/survey/QuestionRenderer.tsx`
    - `apps/web/src/components/survey/ThreeChoiceSliderInput.tsx`
    - `apps/web/src/components/survey/index.ts`
    - `apps/web/src/components/survey/isQuestionComplete.ts`
    - `apps/web/src/components/admin/surveys-section.tsx`
    - `apps/web/src/lib/surveys/question-config-types.ts`
    - `apps/web/tests/matrix-likert-input.test.tsx`
    - `apps/web/tests/three-choice-slider-input.test.tsx`
    - `apps/web/tests/is-question-complete.test.ts`
  - Changes:
    - Added `CastDecisionCardInput` for verdict-style prompts (`keep/fire/demote`, `bring back/keep gone`) and moved verdict rendering out of `MatrixLikertInput`.
    - Made `MatrixLikertInput` agree/disagree-only with Figma color/typography structure and responsive mobile scaling for heading, statement, bars, and spacing.
    - Added `cast-decision-card` UI variant support and kept `three-choice-slider` as a legacy compatibility alias routed to the new component.
    - Updated completion logic so cast-decision questions require answers for all rows.
    - Updated admin format naming and component exports for the new variant.
  - Validation:
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web exec eslint src/components/survey/CastDecisionCardInput.tsx src/components/survey/MatrixLikertInput.tsx src/components/survey/QuestionRenderer.tsx src/components/survey/ThreeChoiceSliderInput.tsx src/components/survey/index.ts src/components/survey/isQuestionComplete.ts src/components/admin/surveys-section.tsx src/lib/surveys/question-config-types.ts tests/matrix-likert-input.test.tsx tests/three-choice-slider-input.test.tsx tests/is-question-complete.test.ts` (pass)
    - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx tests/three-choice-slider-input.test.tsx tests/is-question-complete.test.ts tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)

- February 17, 2026: Fixed cast-matrix sync error messaging and collapsed `Self*` role variants in show/season cast UIs.
  - Files:
    - `apps/web/src/lib/admin/cast-role-normalization.ts`
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route.ts`
    - `apps/web/tests/cast-role-normalization.test.ts`
    - `apps/web/tests/show-cast-matrix-sync-proxy-route.test.ts`
  - Changes:
    - Added canonical role normalization helper:
      - `Self`, `Self - ...`, `Self (as ...)`, `Themselves` => `Self`.
    - Applied canonicalization to cast role chips and cast-card role badges on show cast page, removing noisy `Self (as ...)` duplicates.
    - Applied the same role canonicalization behavior to season cast page role chips and role badges.
    - Updated show cast-role-members fetch to scope by selected seasons only (no role/image/sort narrowing), preventing raw variant role names from breaking canonical role filters.
    - Hardened cast-matrix proxy route error handling:
      - 180s backend timeout returns explicit 504.
      - backend connectivity failures return actionable 502 message instead of opaque `fetch failed`.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route.ts' 'src/lib/admin/cast-role-normalization.ts' 'tests/show-cast-matrix-sync-proxy-route.test.ts' 'tests/cast-role-normalization.test.ts'` (pass, existing unrelated warnings only)
    - `pnpm -C apps/web exec vitest run tests/show-cast-matrix-sync-proxy-route.test.ts tests/cast-role-normalization.test.ts tests/cast-role-season-filtering.test.ts` (pass)
    - `pnpm -C apps/web exec tsc -p tsconfig.json --noEmit --pretty false` (pass)
  - MCP verification:
    - Opened `http://localhost:3000/admin/trr-shows/7782652f-783a-488b-8860-41b97de32e75?tab=cast`.
    - Confirmed `Roles` chips now include a single `Self` chip (no longer listing many `Self (as ...)` variants).

- February 17, 2026: Added social intelligence dashboard structure and source-scope week-detail routing for Bravo content.
  - Social media admin IA updates:
    - `apps/web/src/app/admin/social-media/page.tsx`
    - New category-first hub with `Bravo Content` and `Creator Content`.
  - New category pages:
    - `apps/web/src/app/admin/social-media/bravo-content/page.tsx`
    - `apps/web/src/app/admin/social-media/creator-content/page.tsx`
    - `Creator Content` is scaffolded as a separate dashboard and intentionally read-only/placeholder for now.
  - Season/week social routing updates:
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
    - Week links now carry `source_scope`, and week-detail fetches use the selected scope (default `bravo`).
  - Test and typed-route follow-up:
    - `apps/web/tests/week-social-thumbnails.test.tsx`
    - Added `useSearchParams` mock support after week page scope parsing changes.
    - Updated typed route usage in social media hub links.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/components/admin/season-social-analytics-section.tsx' 'src/app/admin/social-media/page.tsx' 'src/app/admin/social-media/bravo-content/page.tsx' 'src/app/admin/social-media/creator-content/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'tests/week-social-thumbnails.test.tsx'` (pass)
    - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx tests/week-social-thumbnails.test.tsx` (`2 files passed`, `4 tests passed`)
    - `pnpm -C apps/web exec tsc -p tsconfig.json --noEmit --pretty false` (pass)

- February 17, 2026: Stabilized Reddit community creation flow and added persisted post-flair enrichment (non-blocking, empty-flair safe).
  - Migration:
    - `apps/web/db/migrations/024_add_post_flares_to_admin_reddit_communities.sql`
    - Added `post_flares jsonb not null default []` and `post_flares_updated_at timestamptz` on `admin.reddit_communities`.
  - Server/data layer:
    - `apps/web/src/lib/server/admin/reddit-sources-repository.ts`
      - Extended community row shape with `post_flares` and `post_flares_updated_at`.
      - Added `updateRedditCommunityPostFlares(...)`.
    - `apps/web/src/lib/server/admin/reddit-flairs-service.ts`
      - Added flair API-first retrieval with listing fallback (`new/hot/top`) and normalization/dedupe/cap.
    - `apps/web/src/app/api/admin/reddit/communities/[communityId]/flares/refresh/route.ts`
      - New admin route to fetch + persist post flairs and return success even when empty.
  - Reddit URL hardening:
    - `apps/web/src/app/api/admin/reddit/threads/route.ts`
    - `apps/web/src/app/api/admin/reddit/threads/[threadId]/route.ts`
    - Enforced Reddit-host validation for thread `url` and `permalink`; invalid inputs now return `400`.
  - UI flow + stability:
    - `apps/web/src/components/admin/reddit-sources-manager.tsx`
    - Create-community now:
      - inserts created community immediately into local state
      - clears busy state immediately after create completes
      - refreshes flairs asynchronously
      - keeps create success even when flairs are empty/unavailable.
    - Discover flow now also triggers flair refresh.
    - Added request timeout handling and action-level busy lockouts to reduce duplicate submits.
    - Added selected-community flair chips and empty-state helper text (`No post flairs available yet.`).
    - Client URL parser now rejects non-Reddit hosts.
  - Tests:
    - `apps/web/tests/reddit-sources-manager.test.tsx`
    - `apps/web/tests/reddit-communities-route.test.ts`
    - `apps/web/tests/reddit-community-flares-refresh-route.test.ts`
    - `apps/web/tests/reddit-flairs-service.test.ts`
    - `apps/web/tests/reddit-threads-route.test.ts`
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/components/admin/reddit-sources-manager.tsx' 'src/app/api/admin/reddit/communities/route.ts' 'src/app/api/admin/reddit/communities/[communityId]/flares/refresh/route.ts' 'src/app/api/admin/reddit/threads/route.ts' 'src/app/api/admin/reddit/threads/[threadId]/route.ts' 'src/lib/server/admin/reddit-flairs-service.ts' 'src/lib/server/admin/reddit-sources-repository.ts' 'tests/reddit-sources-manager.test.tsx' 'tests/reddit-flairs-service.test.ts' 'tests/reddit-community-flares-refresh-route.test.ts' 'tests/reddit-threads-route.test.ts' 'tests/reddit-communities-route.test.ts'` (pass)
    - `pnpm -C apps/web exec vitest run tests/reddit-sources-manager.test.tsx tests/reddit-communities-route.test.ts tests/reddit-community-flares-refresh-route.test.ts tests/reddit-flairs-service.test.ts tests/reddit-threads-route.test.ts` (pass; 5 files / 18 tests)
    - `pnpm -C apps/web run db:migrate` (pass; applied migration `024_add_post_flares_to_admin_reddit_communities.sql`)
    - `pnpm -C apps/web exec tsc -p tsconfig.json --noEmit --pretty false` (pass)

- February 17, 2026: Fixed season cast grid fallback messaging + episode labels and brought show-cast filtering/sorting controls into season cast view.
  - File:
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - Changes:
    - Replaced ambiguous season cast label text (`Appeared this season`) with explicit numeric episode labels (`N episode(s) this season`), including `0` when evidence is missing.
    - Added season cast controls aligned with show cast grid behavior:
      - sort by (`episodes`, `season recency`, `name`)
      - sort order (`asc`/`desc`)
      - has-image filter
      - role filter chips
      - credit-category filter chips
      - clear filters action
    - Added season-scoped cast-role-member enrichment fetch (`cast-role-members?seasons={season}`) and merged role/season recency/photo metadata into season cast cards.
    - Merged show cast metadata for credit-category/role fallbacks so season cast cards can expose the same filter dimensions as show cast.
    - Updated season fallback warning to a concise sync-state message and only surface it when the season is still on show-fallback with zero episode evidence.
    - Converted season cast rendering from heuristic Main/Recurring/Guest buckets to a filterable/sortable unified grid, while keeping archive-footage credits section.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx'` (pass)
    - `pnpm -C apps/web exec tsc -p tsconfig.json --noEmit --pretty false` (pass)

- February 17, 2026: Implemented Reddit communities/threads management UX + APIs, wired season/global Reddit pages, and added IG/TT/YT week-card thumbnails.
  - App DB migration:
    - `apps/web/db/migrations/023_create_admin_reddit_sources.sql`
    - Added `admin.reddit_communities` (show-level) and `admin.reddit_threads` (optional season scope), indexes, triggers, grants.
  - Server data layer + discovery:
    - `apps/web/src/lib/server/admin/reddit-sources-repository.ts`
    - `apps/web/src/lib/server/admin/reddit-discovery-service.ts`
    - Added communities/threads CRUD, community->thread grouping helpers, subreddit `new/hot/top` discovery, show-match scoring, and include/exclude hint generation.
  - New internal admin APIs:
    - `apps/web/src/app/api/admin/reddit/communities/route.ts`
    - `apps/web/src/app/api/admin/reddit/communities/[communityId]/route.ts`
    - `apps/web/src/app/api/admin/reddit/communities/[communityId]/discover/route.ts`
    - `apps/web/src/app/api/admin/reddit/threads/route.ts`
    - `apps/web/src/app/api/admin/reddit/threads/[threadId]/route.ts`
  - Shared Reddit manager UI + page wiring:
    - `apps/web/src/components/admin/reddit-sources-manager.tsx`
    - `apps/web/src/components/admin/season-social-analytics-section.tsx` (season Reddit tab now uses manager)
    - `apps/web/src/app/admin/social-media/page.tsx` (global landing now uses manager)
  - Week detail thumbnail rendering:
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
    - Added thumbnail preview behavior:
      - YouTube: `thumbnail_url`
      - Instagram: `thumbnail_url` or first `media_urls[]`
      - TikTok: `thumbnail_url`
  - Env docs:
    - `apps/web/.env.example`
    - Added `REDDIT_USER_AGENT` and `REDDIT_FETCH_TIMEOUT_MS`.
  - Tests added/updated:
    - `apps/web/tests/reddit-discovery-service.test.ts`
    - `apps/web/tests/reddit-communities-route.test.ts`
    - `apps/web/tests/reddit-sources-manager.test.tsx`
    - `apps/web/tests/week-social-thumbnails.test.tsx`
    - `apps/web/tests/setup.ts` (test shim for `server-only`)
  - Validation:
    - `pnpm -C apps/web exec eslint src/lib/server/admin/reddit-sources-repository.ts src/lib/server/admin/reddit-discovery-service.ts src/components/admin/reddit-sources-manager.tsx src/app/api/admin/reddit/communities/route.ts 'src/app/api/admin/reddit/communities/[communityId]/route.ts' 'src/app/api/admin/reddit/communities/[communityId]/discover/route.ts' src/app/api/admin/reddit/threads/route.ts 'src/app/api/admin/reddit/threads/[threadId]/route.ts' src/components/admin/season-social-analytics-section.tsx src/app/admin/social-media/page.tsx 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' tests/reddit-discovery-service.test.ts tests/reddit-communities-route.test.ts tests/reddit-sources-manager.test.tsx tests/week-social-thumbnails.test.tsx` (pass)
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/reddit-discovery-service.test.ts tests/reddit-communities-route.test.ts tests/reddit-sources-manager.test.tsx tests/week-social-thumbnails.test.tsx tests/season-social-analytics-section.test.tsx` (`5 passed`, `12 tests passed`)
    - `pnpm -C apps/web exec tsc -p tsconfig.json --noEmit` (pass)

- February 17, 2026: Added cast-matrix sync admin controls and Bravo-profile link visibility improvements for show admin.
  - Added new proxy route:
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route.ts`
  - Show admin cast tab updates:
    - Added `Sync Cast Roles (Wiki/Fandom)` action with loading/error/result panel
    - Displays sync counts and unmatched/missing-season-evidence output
    - Files:
      - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
      - `apps/web/src/components/admin/CastMatrixSyncPanel.tsx`
  - Season filter role semantics update:
    - Season filtering now trusts scoped cast-role rows (selected season(s) + global season `0`) once loaded.
    - File:
      - `apps/web/src/lib/admin/cast-role-filtering.ts`
      - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Links UI update:
    - Person-level `bravo_profile` links now render explicit `Bravo Person Profile` badge with existing review actions.
    - File:
      - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Added targeted tests:
    - `apps/web/tests/show-cast-matrix-sync-proxy-route.test.ts`
    - `apps/web/tests/cast-matrix-sync-panel.test.tsx`
    - `apps/web/tests/cast-role-season-filtering.test.ts`
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/show-cast-matrix-sync-proxy-route.test.ts tests/cast-matrix-sync-panel.test.tsx tests/cast-role-season-filtering.test.ts` (pass)
    - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)
    - `pnpm -C apps/web exec eslint src/app/admin/trr-shows/[showId]/page.tsx src/components/admin/CastMatrixSyncPanel.tsx src/lib/admin/cast-role-filtering.ts src/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route.ts` (warnings only; no errors)

- February 13, 2026: Fixed unresolved `var(--font-sans)` fallback in template preview stacks and improved filename-to-font-family linking.
  - Files:
    - `apps/web/src/app/globals.css`
    - `apps/web/src/lib/fonts/cdn-fonts.ts`
    - `apps/web/tests/cdn-fonts.test.ts`
  - Changes:
    - Added explicit runtime CSS font alias variables in `:root` (`--font-sans`, `--font-serif`, `--font-display`, `--font-body`, `--font-games`) using concrete family names, so inline template stacks like `"Font Name", var(--font-sans), sans-serif` no longer collapse to fallback fonts.
    - Extended CDN font resolver normalization so filename-style values map back to canonical font families (for example `SofiaProBold-930940338.otf` → `Sofia Pro`, `RudeSlabCondensedCondensedBold-930861866.otf` → `Rude Slab Condensed`, `GeoSlab703_Md_BT` → `Geometric Slabserif 703`).
    - Added tests for canonical-name and filename-token resolution behavior.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/cdn-fonts.test.ts tests/matrix-likert-input.test.tsx tests/flashback-ranker.test.tsx` (pass)
    - `pnpm -C apps/web exec eslint src/lib/fonts/cdn-fonts.ts tests/cdn-fonts.test.ts` (pass)
    - Playwright verification on `/admin/fonts?tab=questions-forms` confirmed editor font changes now update Matrix (`agree-likert-scale`) row/column labels and Rank Order slot/tray labels live.

- February 13, 2026: Fixed font overrides not applying in Matrix/Likert and Rank Order preview internals.
  - Files:
    - `apps/web/src/components/survey/MatrixLikertInput.tsx`
    - `apps/web/src/components/flashback-ranker.tsx`
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
    - `apps/web/tests/matrix-likert-input.test.tsx`
    - `apps/web/tests/flashback-ranker.test.tsx`
  - Changes:
    - Added CDN-aware font override resolution to `MatrixLikertInput` and applied it to:
      - matrix row labels
      - matrix column labels
    - Added missing-font warning in matrix renderer:
      - `Missing CloudFront CDN fonts: X, Y, Z`
    - Extended Questions tab preview config injection for `agree-likert-scale` so template editor title/sub-text fonts now map into matrix internals (`rowLabelFontFamily` / `columnLabelFontFamily` + `fonts.*` aliases).
    - Replaced remaining hardcoded circle-slot number font in `flashback-ranker` with `fontOverrides.rankNumberFontFamily` fallback, so rank-number typography now follows assigned preview fonts.
    - Added test coverage for:
      - matrix font application + missing-font warning
      - flashback rank-number font override path
  - Validation:
    - `pnpm -C apps/web exec eslint src/components/survey/MatrixLikertInput.tsx src/components/flashback-ranker.tsx src/app/admin/fonts/_components/QuestionsTab.tsx tests/matrix-likert-input.test.tsx tests/flashback-ranker.test.tsx` (pass)
    - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx tests/flashback-ranker.test.tsx` (pass)
    - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

- February 13, 2026: Persisted Questions tab template editor font/style settings across hard reloads.
  - File:
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - Changes:
    - Added `localStorage` persistence for survey template editor state per catalog key and example index.
    - Added `localStorage` persistence for standalone template editor state per catalog key.
    - Added safe state sanitization during load to avoid malformed persisted payloads breaking rendering.
    - Wired editor-selected fonts into preview configs for ranking and three-choice template internals so component-level text uses chosen CDN fonts.
  - Additional font-debug updates:
    - `apps/web/src/components/survey/RankOrderInput.tsx`
    - `apps/web/src/components/survey/ThreeChoiceSliderInput.tsx`
    - `apps/web/src/components/flashback-ranker.tsx`
    - Added runtime CDN font load checks via `document.fonts.load(...)` and explicit warnings when a browser fails to load requested CloudFront font files.
    - Added rank template font override plumbing through `FlashbackRanker` for numbers, `Unranked` labels, season labels, and picker text.
  - Validation:
    - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)
    - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)
    - `pnpm -C apps/web exec vitest run tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx tests/three-choice-slider-input.test.tsx` (pass)

- February 13, 2026: Fixed Questions page template font application for ranking templates and wired editor font selections into ranking internals.
  - Files:
    - `apps/web/src/components/survey/RankOrderInput.tsx`
    - `apps/web/src/components/flashback-ranker.tsx`
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
    - `apps/web/src/app/admin/fonts/page.tsx`
    - `apps/web/tests/rank-order-input.test.tsx`
  - Changes:
    - Added CDN font override resolution in `RankOrderInput` for ranking UIs (`circle-ranking` and `rectangle-ranking`) with support for multiple config key paths.
    - Added in-component warning when a requested ranking font is not in CloudFront CDN:
      - `Missing CloudFront CDN fonts: X, Y, Z`
    - Extended `FlashbackRanker` with `fontOverrides` support so internal labels now use configured fonts:
      - rank numbers (`1, 2, 3...`)
      - `Unranked` tray labels
      - season card labels
      - picker title and picker item labels
    - Wired Questions tab editor-selected fonts into preview question config (ranking + three-choice variants) and standalone `flashback-ranker` preview, so font changes actually affect template internals.
    - Tightened `/admin/fonts` tab URL helper typing so Next typed router accepts tab routes during typecheck.
  - Validation:
    - `pnpm -C apps/web exec eslint src/components/flashback-ranker.tsx src/components/survey/RankOrderInput.tsx src/app/admin/fonts/_components/QuestionsTab.tsx tests/rank-order-input.test.tsx` (pass)
    - `pnpm -C apps/web exec vitest run tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)
    - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

- February 13, 2026: Added URL-addressable tabs for Admin UI Design System sections (`Fonts`, `Colors`, `Questions & Forms`).
  - File:
    - `apps/web/src/app/admin/fonts/page.tsx`
  - Changes:
    - Replaced local-only tab state with URL-driven tab resolution via `useSearchParams`.
    - Added tab query mapping and canonical tab href generation:
      - `Fonts` -> `/admin/fonts`
      - `Colors` -> `/admin/fonts?tab=colors`
      - `Questions & Forms` -> `/admin/fonts?tab=questions-forms`
    - Updated tab click behavior to push the corresponding URL so each tab is linkable/shareable.
    - Added guard for invalid `tab` query values to route back to `/admin/fonts`.
  - Validation:
    - `pnpm -C apps/web exec eslint src/app/admin/fonts/page.tsx` (pass)

- February 13, 2026: Enforced deterministic Figma-style preview defaults (no random palette colors) and aligned season + keep/fire previews.
  - Files:
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - Changes:
    - Removed palette-index-driven default preview colors that produced random-looking title/subtext/container defaults.
    - Set preview defaults to:
      - page/canvas: white (`#FFFFFF`)
      - container/frame: black (`#000000`)
      - title/subtext color: white (`#FFFFFF`)
    - Updated rank-order defaults to include both circle and rectangle templates as Figma rank presets.
    - Rectangle rank defaults now use Figma season copy:
      - `Rank the Seasons of RHOSLC.`
      - `Drag-and-Drop the Seasons to their Rank.`
    - Added conditional header rendering for survey/standalone previews so templates like Keep/Fire/Demote can default to no extra wrapper copy.
    - Added responsive font sizing for rank preset headings/subheadings to improve cross-screen fidelity.
  - Validation:
    - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx src/components/flashback-ranker.tsx src/components/survey/RankOrderInput.tsx src/components/survey/ThreeChoiceSliderInput.tsx` (pass)
    - `pnpm -C apps/web exec vitest run tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx tests/three-choice-slider-input.test.tsx` (pass)

- February 13, 2026: Implemented Figma-based rectangle season ranking template (`20:455`) with cast-ranking interactions.
  - Files:
    - `apps/web/src/components/flashback-ranker.tsx`
    - `apps/web/src/components/survey/RankOrderInput.tsx`
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
    - `apps/web/tests/rank-order-input.test.tsx`
    - `apps/web/tests/flashback-ranker.test.tsx`
  - Changes:
    - Added new `flashback-ranker` layout preset: `figma-rank-rectangles`.
    - Updated `rectangle-ranking` renderer wiring to use slot-grid ranking mode (same interaction model as cast rankings):
      - unranked tray
      - tap-to-pick slot assignment
      - drag-and-drop support
    - Implemented Figma-inspired rectangle visuals for season slots:
      - black stage
      - numbered rectangle slots
      - gray card fills
      - bottom white season label strip
      - Rude Slab + Plymouth Serial typography usage to match template style
    - Updated Questions tab rank-order sample to include a seasons-focused rectangle example (`SEASON 1` … `SEASON 6`).
    - Added/updated tests for rectangle preset rendering and rank update behavior.
  - Validation:
    - `pnpm -C apps/web exec eslint src/components/flashback-ranker.tsx src/components/survey/RankOrderInput.tsx src/app/admin/fonts/_components/QuestionsTab.tsx tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)
    - `pnpm -C apps/web exec vitest run tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)

- February 13, 2026: Implemented thumbnail-first + `Profile Pictures` gallery/category rollout for Bravo people images.
  - Added `profile_picture` content type end-to-end in filters/classification:
    - `apps/web/src/lib/admin/advanced-filters.ts`
    - `apps/web/src/components/admin/AdvancedFilterDrawer.tsx`
    - `apps/web/src/lib/gallery-filter-utils.ts`
  - Added dedicated `Profile Pictures` sections in:
    - show assets: `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - season assets: `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - person gallery: `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - Updated gallery image URL selection to prefer lightweight thumbnail variants (`thumb_url`) before larger variants/hosted originals.
  - Added render-side batching via `Load More` in show/season/person galleries to reduce initial DOM/image work.
  - Added route-level source/pagination controls for gallery APIs:
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/assets/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/route.ts`
    - `apps/web/src/app/api/admin/trr-api/people/[personId]/photos/route.ts`
  - Updated cast photo precedence and robustness in repository:
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
    - prefer `profile_picture` context first, then legacy Bravo profile;
    - removed failing fallback selects on missing `v_cast_photos.thumbnail_focus_*` columns.
  - Validation:
    - `pnpm -C apps/web exec eslint <touched files>` (warnings only)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)

- February 13, 2026: Added Canva-template font resolution against CloudFront CDN fonts for Fire/Keep/Demote question templates, with missing-font warnings.
  - Files:
    - `apps/web/src/components/survey/ThreeChoiceSliderInput.tsx`
    - `apps/web/src/lib/fonts/cdn-fonts.ts`
    - `apps/web/tests/three-choice-slider-input.test.tsx`
  - Changes:
    - Added shared CDN font resolver utility (`cdn-fonts.ts`) that maps incoming font names to the canonical CloudFront font list (`CDN Fonts 30`), including aliases for common Canva/Figma naming variants (for example `GeoSlab703_Md_BT`).
    - Updated `ThreeChoiceSliderInput` to read optional template font fields from question config and apply resolved CDN font families to:
      - prompt text
      - cast name heading
      - option labels
      - next button
    - Added in-question warning banner when requested template fonts are not in CloudFront CDN:
      - `Missing CloudFront CDN fonts: X, Y, Z`
    - Added test coverage for:
      - applying valid CDN/alias fonts
      - warning behavior for missing fonts
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/three-choice-slider-input.test.tsx` (pass)
    - `pnpm -C apps/web exec eslint src/components/survey/ThreeChoiceSliderInput.tsx src/lib/fonts/cdn-fonts.ts tests/three-choice-slider-input.test.tsx` (pass)
    - `pnpm -C apps/web run lint` (pass; warnings only, unrelated)

- February 12, 2026: Implemented Figma-based Fire/Keep/Demote template behavior for `three-choice-slider` using SURVEY-TEMPLATES nodes `160:34` (default) and `160:69` (selected + Next).
  - Files:
    - `apps/web/src/components/survey/ThreeChoiceSliderInput.tsx`
    - `apps/web/src/components/survey/QuestionRenderer.tsx`
    - `apps/web/src/components/survey/index.ts`
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
    - `apps/web/tests/three-choice-slider-input.test.tsx`
  - Changes:
    - Added new dedicated `ThreeChoiceSliderInput` renderer for `uiVariant: "three-choice-slider"` and routed `QuestionRenderer` to use it.
    - Matched Figma default state structure:
      - light gray canvas
      - `KEEP, FIRE OR DEMOTE` heading
      - large active cast-name title
      - three circular verdict options (`Fire`, `Demote`, `Keep`) with mapped palette colors.
    - Matched Figma selected-state behavior:
      - selected option circle renders the current cast member image inside the circle
      - applies color overlay/tint + image treatment over the portrait
      - `Next` button appears only after a selection and advances to the next cast member row.
    - Updated Questions tab “Cast Verdict (Fire/Demote/Keep)” sample rows to include cast image paths so editor preview demonstrates selected-image behavior.
    - Added component tests covering render, selection state, and Next-row progression.
  - Validation:
    - `pnpm -C apps/web run lint` (pass; warnings only, unrelated)
    - `pnpm -C apps/web run test:ci` (pass, 37 files / 125 tests)
    - `pnpm -C apps/web exec next build --webpack` (pass)

- February 12, 2026: Unified Rank Order + Flashback Ranker template editing controls and wired editor tokens to shared Design System sources.
  - Files:
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
    - `apps/web/src/app/admin/fonts/page.tsx`
    - `apps/web/src/lib/admin/design-system-tokens.ts`
  - Changes:
    - Added shared design-token module for:
      - base color palette + storage key
      - full CDN font option list for template editors
    - Completed Colors tab persistence wiring in `fonts/page.tsx`:
      - loads base colors from `localStorage` on mount
      - persists updates (including added base colors) to `localStorage`
      - passes live `designSystemColors` into `QuestionsTab` so editor palettes match the Colors tab immediately
    - Updated survey template editor controls (`QuestionsTab`) to:
      - use all CDN fonts from the Fonts page list
      - allow unrestricted numeric font-size values (removed min/max clamping)
      - use base-color palette selectors sourced from the Colors tab list
    - Added matching `Edit Template` modal to standalone template cards, including `flashback-ranker`, with same controls and viewport toggles as rank-order cards.
    - Refactored standalone preview layout so title/sub-text are editor-controlled for parity with survey template cards.
  - Validation:
    - `pnpm -C apps/web run lint` (pass; warnings only, unrelated)
    - `pnpm -C apps/web run test:ci` (pass, 36 files / 123 tests)
    - `pnpm -C apps/web exec next build --webpack` (pass)

- February 12, 2026: Added per-template visual editor modal for Question Templates in UI Design System.
  - File:
    - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - Changes:
    - Added an edit icon/button on each survey question template preview card (`Edit Template`).
    - Added a large popup editor modal with live preview for the selected template.
    - Added editable controls for preview styling and copy:
      - title text and sub-text content
      - title/sub-text colors
      - title/sub-text font family
      - title/sub-text font size
      - preview canvas and frame background colors
    - Added reset and close controls in modal header.
    - Reused existing interactive question preview so edits are visible immediately while interacting with the component.
  - Validation:
    - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)
    - `pnpm -C apps/web run lint` (pass; warnings only, unrelated)
    - `pnpm -C apps/web exec next build --webpack` (pass)
    - `pnpm -C apps/web run test:ci` (pass, 36 files / 123 tests)

- February 12, 2026: Implemented generated tints/shades and add-base-color workflow in Admin UI Design System `Colors` tab using the same RGB mixing approach as `edelstone/tints-and-shades`.
  - Files:
    - `apps/web/src/app/admin/fonts/page.tsx`
  - Changes:
    - Added tint/shade generation helpers (hex normalize, RGB conversion, channel mixing) following the reference logic:
      - shades mix channels toward `0` (black)
      - tints mix channels toward `255` (white)
    - Replaced placeholder white swatches with generated swatches per color row:
      - 3 shades (left) + base color (center) + 3 tints (right)
    - Added `Add Base Color` controls on the Colors tab:
      - color picker + hex text input
      - validation for hex format
      - duplicate prevention
      - newly added base color immediately renders with generated tints/shades
  - Validation:
    - `pnpm -C apps/web exec eslint src/app/admin/fonts/page.tsx` (pass)
    - `pnpm -C apps/web run lint` (pass; warnings only, unrelated)
    - `pnpm -C apps/web exec next build --webpack` (pass)
    - `pnpm -C apps/web run test:ci` (pass, 36 files / 123 tests)

- February 12, 2026: Added a new `Colors` tab to Admin UI Design System and implemented per-color tint/shade row scaffolding from TRR style-guide palette.
  - File:
    - `apps/web/src/app/admin/fonts/page.tsx`
  - Changes:
    - Expanded design-system tabs from `fonts | questions` to `fonts | colors | questions`.
    - Added `DESIGN_SYSTEM_COLORS` palette and a dedicated `Colors` tab surface.
    - Implemented one row per color with the requested structure:
      - 3 white swatch placeholders on the left
      - 1 center base color swatch
      - 3 white swatch placeholders on the right
    - Added per-row labels (`Row NN`) and visible hex tokens for easy future tint/shade population.
  - Validation:
    - `pnpm -C apps/web run lint` (pass; warnings only, none from touched file)
    - `pnpm -C apps/web exec next build --webpack` (pass)
    - `pnpm -C apps/web run test:ci` (pass, 36 files / 123 tests)

- February 12, 2026: Follow-up Figma parity pass for Survey Templates node `0:3` (Ranking Circles) and admin preview fidelity.
  - Updated rank-circle geometry in `apps/web/src/components/flashback-ranker.tsx` to better match Figma desktop spacing:
    - 156px max slot width, increased row/column rhythm, larger rank numerals, black empty-circle styling.
    - Width now constrained by the component container (not viewport `vw`) to prevent overlap in constrained previews.
    - Preserved responsive behavior + interactive tray/picker patterns.
  - Updated admin fonts preview UX in `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`:
    - Added device-like preview framing with desktop/tablet/phone viewport modes as explicit screen surfaces.
    - Default preview mode switched to desktop for clearer first render.
    - Rank-order circle preview now uses Figma-like heading/subheading styling and light gray canvas treatment.
    - Standalone `flashback-ranker` preview now renders the `grid` + `figma-rank-circles` variant.
  - Validation:
    - `pnpm -C apps/web exec eslint src/components/flashback-ranker.tsx src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)
    - `pnpm -C apps/web exec vitest run tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)

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

Show/season gallery poster/profile classification + hidden "Other" gating (this session, 2026-02-13):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
- Changes:
  - Show assets page:
    - profile-picture detection now runs before poster/season grouping to prevent cast profile photos from landing in poster sections.
    - merged show + season poster group into a single `Posters` section.
    - hidden `Other` images by default and only reveals them after explicit `Load More Images` action.
  - Season assets page:
    - tightened poster classification to `kind=poster` only.
    - cast-like assets (`type=cast`, `kind=cast|promo`) route to cast section first.
    - retained separate `Profile Pictures` section and renamed poster heading to `Posters`.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx'` (pass with existing warnings on show page only)

Cast profile-photo source priority + show-page override stability fix (this session, 2026-02-13):
- Files:
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Reordered cast photo preference in `getPreferredCastPhotoMap(...)`:
    - Bravo profile (season-matched first)
    - official season announcement (season-matched first)
    - then single-person (`people_count=1`) candidates
    - generic `profile/profile_picture` downgraded below those priorities.
  - Updated cast-photos fallback ordering from `v_cast_photos` to prefer Bravo/official season announcement context over generic rows.
  - On show cast UI merge, now prefers `member.photo_url` from main cast endpoint over cast-role-members `photo_url` to avoid late async override with inferior images.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/lib/server/trr-api/trr-shows-repository.ts' 'src/app/admin/trr-shows/[showId]/page.tsx'` (pass with pre-existing warnings)
  - `pnpm -C apps/web exec vitest run tests/show-cast-route-default-min-episodes.test.ts` (pass)
  - `pnpm -C apps/web exec vitest run tests/season-cast-route-fallback.test.ts` (pass)

Question mobile typography/spacing compaction (this session, 2026-02-13):
- Files:
  - `apps/web/src/components/survey/NormalizedSurveyPlay.tsx`
  - `apps/web/src/components/survey/ThreeChoiceSliderInput.tsx`
  - `apps/web/src/components/flashback-ranker.tsx`
  - `apps/web/src/components/survey/MatrixLikertInput.tsx`
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - `apps/web/src/components/survey/SliderInput.tsx`
  - `apps/web/src/components/survey/SingleSelectInput.tsx`
  - `apps/web/src/components/survey/MultiSelectInput.tsx`
  - `apps/web/src/components/survey/WhoseSideInput.tsx`
- Changes:
  - Reduced base (mobile) font sizes, paddings, and gaps across question cards and common question inputs.
  - Tightened three-choice slider mobile prompt/cast/choice/CTA sizing while preserving `sm`/`lg` desktop behavior.
  - Compacted flashback ranker mobile tray, slot labels, remove buttons, and mobile picker sheet density.
  - Tightened matrix/likert table cell padding, image size, and control sizes on mobile.
  - Reduced questions preview phone frame height and rank-preview title/subtitle minimum clamps in admin Fonts > Questions previews.
- Validation:
  - `pnpm -C apps/web exec eslint src/components/survey/NormalizedSurveyPlay.tsx src/components/survey/ThreeChoiceSliderInput.tsx src/components/survey/MatrixLikertInput.tsx src/components/survey/SliderInput.tsx src/components/survey/SingleSelectInput.tsx src/components/survey/MultiSelectInput.tsx src/components/survey/WhoseSideInput.tsx src/components/flashback-ranker.tsx src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)
  - `pnpm -C apps/web run test -- tests/flashback-ranker.test.tsx tests/rank-order-input.test.tsx tests/matrix-likert-input.test.tsx tests/three-choice-slider-input.test.tsx` (pass)

RHOSLC profile images for circular question templates (this session, 2026-02-13):
- File:
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
- Changes:
  - Updated circular-frame preview templates to use RHOSLC cast profile images (`/images/cast/rhoslc-s6/*.png`).
  - Applied image metadata for image-select, whose-side, and circle-ranking options.
  - Added RHOSLC profile images to two-axis grid row tokens and standalone `RHOSLC_CAST` ranker items.
  - Added RHOSLC subject image to numeric-slider template example.
- Validation:
  - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

Ingest + Export run-scope + live-progress logging fix (this session, 2026-02-12):
- File:
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
- Changes:
  - Replaced static run scope label logic (`weekFilter`/`platformFilter`) with active-run-aware scope resolution:
    - derives scope from actual active run jobs (`run_id`-scoped job rows, platform set, and `config.date_start/date_end` week windows),
    - falls back to the run request (week/platform) before first job rows appear.
  - Added active run request state so per-button overrides (Run Week / per-platform ingest) are reflected immediately in scope text.
  - Added compact `Live Progress Log` block inside `Ingest + Export`:
    - latest run-scoped job events with timestamp, platform, stage, status, items, and stage counters.
  - Tightened run-scoped job behavior to avoid fallback to non-run historical jobs while an active run is selected.
  - Cleared active run request scope on run completion/cancel/failure.
- Validation:
  - `pnpm -C apps/web exec eslint src/components/admin/season-social-analytics-section.tsx` (pass)

Figma node 160:34 text-role mapping for three-choice likert template (this session, 2026-02-13):
- Figma source:
  - `https://www.figma.com/design/0wc00O3Vam7AFGu2N2s9U9/SURVEY-TEMPLATES?node-id=160-34`
- Files:
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - `apps/web/src/components/survey/ThreeChoiceSliderInput.tsx`
  - `apps/web/src/components/survey/MatrixLikertInput.tsx`
- Changes:
  - Added semantic font-role mapping for three-choice template:
    - `KEEP, FIRE OR DEMOTE` -> `subTextHeading` (`subTextHeadingFontFamily`)
    - cast name (e.g. `WHITNEY ROSE`) -> `questionText` (`questionTextFontFamily`)
    - option labels (`FIRE`, `DEMOTE`, `KEEP`) -> `optionText` (`optionTextFontFamily`)
  - Extended font path resolution in `ThreeChoiceSliderInput` and `MatrixLikertInput` to read the semantic keys above from root, `fonts.*`, and `typography.*` config shapes.
  - Tuned three-choice option label max size/line-height closer to Figma node values.
- Validation:
  - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx src/components/survey/ThreeChoiceSliderInput.tsx src/components/survey/MatrixLikertInput.tsx` (pass)
  - `pnpm -C apps/web run test -- tests/three-choice-slider-input.test.tsx tests/matrix-likert-input.test.tsx` (pass)

Figma node 0:3 cast-ranking parity update (this session, 2026-02-13):
- Figma source:
  - `https://www.figma.com/design/0wc00O3Vam7AFGu2N2s9U9/SURVEY-TEMPLATES?node-id=0-3`
- Files:
  - `apps/web/src/components/survey/RankOrderInput.tsx`
  - `apps/web/src/components/flashback-ranker.tsx`
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - `apps/web/tests/flashback-ranker.test.tsx`
- Changes:
  - Added cast-ranking wrapper styling in `RankOrderInput` for circle preset (`#D9D9D9` canvas with Figma-like spacing).
  - Updated `figma-rank-circles` layout in `FlashbackRanker` to better match node geometry:
    - slot size uses `clamp(112px, 23vw, 156.291px)`
    - grid spacing updated to Figma-like x/y gaps
    - responsive columns now `2 -> 4`
    - rank number typography tightened for Figma parity
    - removed visible unranked tray for circle preset; placement handled via slot picker + drag between slots
  - Updated cast-ranking preview question text to match Figma copy (`Rank the Cast of RHOSLC S6.`).
  - Updated tests for the new circle-preset behavior.
- Validation:
  - `pnpm -C apps/web exec eslint src/components/survey/RankOrderInput.tsx src/components/flashback-ranker.tsx src/app/admin/fonts/_components/QuestionsTab.tsx tests/flashback-ranker.test.tsx` (pass)
  - `pnpm -C apps/web run test -- tests/flashback-ranker.test.tsx tests/rank-order-input.test.tsx` (pass)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

Preview default background/text reset + cast-ranking review follow-up (this session, 2026-02-13):
- File:
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
- Changes:
  - Updated template-editor default visual baseline to white page/frame with black text for non-Figma-specialized previews.
  - For Figma rank previews, default frame now uses design gray (`#D9D9D9`) with black text.
  - Bumped preview editor local storage key from `v1` to `v2` so prior saved black-theme defaults do not persist.
  - For `two-choice-slider` previews, default top title/subtext are now empty (component-level heading handles design).
- Validation:
  - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx src/components/survey/RankOrderInput.tsx src/components/flashback-ranker.tsx src/components/survey/WhoseSideInput.tsx` (pass)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

Figma node 69:94 agree/disagree likert parity update (this session, 2026-02-13):
- Figma source:
  - `https://www.figma.com/design/0wc00O3Vam7AFGu2N2s9U9/SURVEY-TEMPLATES?node-id=69-94`
- Files:
  - `apps/web/src/components/survey/MatrixLikertInput.tsx`
  - `apps/web/tests/matrix-likert-input.test.tsx`
- Changes:
  - Replaced the old table-grid `agree-likert-scale` UI with a stacked Figma-style layout:
    - uppercase prompt heading,
    - large statement text,
    - full-width rounded option bars.
  - Added option color/text-color resolution to match node `69:94` palette for standard Likert labels (`Strongly Agree` -> `Strongly Disagree`), with metadata color override support.
  - Expanded font-role resolution so heading, statement, and option text each honor template-config font names via CloudFront CDN mappings.
  - Kept row-by-row answer shape unchanged (`Record<rowId, optionKey>`), preserving existing completion logic.
  - Added behavior test coverage for per-row selection updates in the new layout.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx` (pass)

Season Social Analytics V3 — weekly trend no-data handling + grouped platform bars (this session, 2026-02-17):
- Files:
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `apps/web/tests/season-social-analytics-section.test.tsx`
  - `docs/cross-collab/TASK7/PLAN.md`
  - `docs/cross-collab/TASK7/STATUS.md`
  - `docs/cross-collab/TASK7/OTHER_PROJECTS.md`
- Changes:
  - Added support for backend `weekly_platform_engagement` in season social analytics UI.
  - Replaced legacy single minimum-width weekly bar with grouped per-platform comparative bars.
  - No-data weeks now render visible rows with `No data yet` and no bars.
  - Added sentiment-driver UI hint clarifying cast names/handles are excluded from driver terms.
  - Added targeted UI regression tests covering:
    - no-data row behavior,
    - grouped bars width/color mapping,
    - zero-value platform bars not rendering artificial minimum widths.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/components/admin/season-social-analytics-section.tsx' 'tests/season-social-analytics-section.test.tsx'` (pass)
  - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx` (3 passed)

Mobile-responsiveness pass + preview layout defaults (this session, 2026-02-17):
- Scope:
  - `apps/web/src/components/survey/WhoseSideInput.tsx`
  - `apps/web/src/components/survey/MatrixLikertInput.tsx`
  - `apps/web/src/components/survey/RankOrderInput.tsx`
  - `apps/web/src/components/flashback-ranker.tsx`
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
- Design source checked via Figma MCP:
  - `20:544` (Whose Side), `69:94` (Likert), `0:3` (Cast ranking)
- Changes:
  - Reduced mobile typography and control sizing for Whose Side (heading + circle options + neutral button) using mobile-first dimensions.
  - Tightened mobile type scale, spacing, and option-bar sizing for agree/disagree likert while preserving answer model.
  - Reduced mobile slot/token/remove-control sizes and gaps in flashback ranker circle/rectangle ranking layouts.
  - Minor mobile padding adjustment in rank-order wrapper for circle preset.
  - Fonts preview UI now defaults to `Phone` viewport for survey and standalone cards.
  - Fonts preview cards are now single-column across sections (one preview per row) for clearer per-device inspection.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)
  - `pnpm -C apps/web exec eslint src/components/survey/WhoseSideInput.tsx src/components/survey/MatrixLikertInput.tsx src/components/survey/RankOrderInput.tsx src/components/flashback-ranker.tsx src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)

Survey-wide default styling controls + per-device defaults (this session, 2026-02-17):
- File:
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
- Changes:
  - Added a new `Default Settings` panel above Survey Questions previews.
  - Added separate `Mobile` and `Desktop` default style profiles (font family, font size, colors, canvas/frame styling).
  - Persisted survey default profiles in localStorage (`trr.questions-tab.survey-defaults.v1`).
  - Updated survey preview cards to consume global defaults by active viewport:
    - `phone` uses `Mobile` defaults
    - `tablet/desktop` use `Desktop` defaults
  - Added per-preview override behavior:
    - previews use global defaults by default,
    - editing a specific preview field switches that preview to custom override,
    - `Use Defaults` action restores default-driven behavior.
  - Maintained existing per-preview local storage compatibility while extending saved shape to include default-usage flags.
- Validation:
  - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)
  - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)

Follow-up on survey defaults behavior (this session, 2026-02-17):
- File:
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
- Adjustment:
  - Editing text-only fields (`titleText`, `subText`) now keeps a preview on global defaults.
  - Editing style fields (font/color/size/frame/canvas) switches that preview to custom override mode.

Font editor dropdown sync + WhoseSide mobile face sizing fix (this session, 2026-02-17):
- Files:
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - `apps/web/src/components/survey/WhoseSideInput.tsx`
- Changes:
  - Added two-choice-slider config font override mapping in preview transformation so editor font selections and rendered preview stay in sync.
  - Added font-select value normalization (via CDN font resolver) so dropdowns select the canonical matching option when stored font strings differ in format.
  - Reworked WhoseSide mobile scaling to be container-width driven (ResizeObserver) instead of viewport-breakpoint/viewport-unit driven sizing.
  - Reduced and stabilized mobile heading/circle sizes in WhoseSide so circles do not render oversized in phone previews.
- Validation:
  - `pnpm -C apps/web exec eslint src/components/survey/WhoseSideInput.tsx src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)
  - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)

Matrix + Ranker mobile-frame scaling parity (this session, 2026-02-17):
- Files:
  - `apps/web/src/components/survey/MatrixLikertInput.tsx`
  - `apps/web/src/components/survey/RankOrderInput.tsx`
  - `apps/web/src/components/flashback-ranker.tsx`
  - `apps/web/tests/flashback-ranker.test.tsx`
- Changes:
  - Converted `MatrixLikertInput` key layout sizing (prompt, statement, option bars, paddings, gaps) to container-width responsive values via `ResizeObserver` so Phone preview scales correctly even on desktop viewport.
  - Refactored `flashback-ranker` Figma cast/season presets away from viewport `vw` + breakpoint-driven sizing:
    - added container-measured layout metrics for circle and rectangle presets,
    - grid columns/gaps/slot sizes/remove-button sizes now derive from measured preview width,
    - season tray card sizing + label sizing now follow container-based metrics,
    - picker supports forced mobile-sheet mode when rendered inside narrow preview containers.
  - Reduced circle-preset wrapper padding in `RankOrderInput` to avoid oversized framing in mobile previews.
  - Updated flashback ranker tests to assert responsive grid behavior via layout data attributes rather than removed breakpoint class names.
- Validation:
  - `pnpm -C apps/web exec eslint src/components/survey/MatrixLikertInput.tsx src/components/survey/RankOrderInput.tsx src/components/flashback-ranker.tsx tests/flashback-ranker.test.tsx tests/matrix-likert-input.test.tsx tests/rank-order-input.test.tsx` (pass)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)
  - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)

Figma node 160:34 Keep/Fire/Demote parity + mobile responsiveness (this session, 2026-02-17):
- Figma source:
  - `https://www.figma.com/design/0wc00O3Vam7AFGu2N2s9U9/SURVEY-TEMPLATES?node-id=160-34`
- Files:
  - `apps/web/src/components/survey/MatrixLikertInput.tsx`
  - `apps/web/tests/matrix-likert-input.test.tsx`
- Changes:
  - Added explicit Figma-style rendering path for `three-choice-slider` matrix variant:
    - prompt rendered as `KEEP, FIRE OR DEMOTE` (derived from options when keep/fire/demote are present),
    - cast/member row label treated as primary question text,
    - circular color-coded options for Fire/Demote/Keep matching Figma palette.
  - Preserved existing `agree-likert-scale` stacked-bar behavior.
  - Added container-width responsive sizing for the three-choice layout (typography, circle size, spacing) so mobile previews at narrow widths do not stay desktop-sized.
  - Kept CDN font override resolution active for heading, statement, and option text in both variants.
  - Added test coverage for three-choice heading and circular option styling.
- Validation:
  - `pnpm -C apps/web exec eslint src/components/survey/MatrixLikertInput.tsx tests/matrix-likert-input.test.tsx` (pass)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)
  - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx` (pass)

Question editor shape/button size controls wired to previews (this session, 2026-02-17):
- Files:
  - `apps/web/src/components/survey/WhoseSideInput.tsx`
  - `apps/web/src/components/survey/MatrixLikertInput.tsx`
  - `apps/web/src/components/survey/RankOrderInput.tsx`
  - `apps/web/src/components/flashback-ranker.tsx`
  - `apps/web/tests/matrix-likert-input.test.tsx`
  - `apps/web/tests/rank-order-input.test.tsx`
  - `apps/web/tests/flashback-ranker.test.tsx`
- Changes:
  - Implemented `shapeScale` / `buttonScale` consumption in question previews so template-editor size controls now visibly affect components.
  - `WhoseSideInput` now scales:
    - cast portrait circle sizes/gaps via `shapeScale`
    - neutral button height/padding/font-size via `buttonScale`.
  - `MatrixLikertInput` now scales:
    - three-choice circle size via `shapeScale`
    - option text + button height/padding via `buttonScale`
    - agree/disagree option radius via `shapeScale`.
  - `RankOrderInput` now forwards `shapeScale` / `buttonScale` to `FlashbackRanker`.
  - `flashback-ranker` now scales Figma circle/rectangle ranking metrics and picker controls from those scale values (slot/token/remove button/picker avatars and control sizes).
  - Added/updated tests to verify scale props are forwarded and applied.
- Validation:
  - `pnpm -C apps/web exec eslint src/components/survey/MatrixLikertInput.tsx src/components/survey/WhoseSideInput.tsx src/components/survey/RankOrderInput.tsx src/components/flashback-ranker.tsx tests/matrix-likert-input.test.tsx tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)
  - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)

Week social analytics post-stats modal UX + comment refresh action (this session, 2026-02-17):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route.ts`
- Changes:
  - Converted post-stats UI from right-side drawer behavior to a centered modal with backdrop and escape-key close.
  - Added `REFRESH` action in the modal header that triggers per-post comment re-sync through the admin proxy (`POST`), then reloads modal data.
  - Added post thumbnail rendering in the modal directly under platform/author/date metadata.
  - Extended post-detail typing to include `thumbnail_url`.
  - Updated post-card thumbnail rendering so YouTube thumbnails use `object-contain` with a taller cap, avoiding cropped banner-style display.
  - Added POST proxy support in the app API route for post comment refresh.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route.ts'` (pass)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

Cast gallery crew split + image metadata copy/reassign UX (this session, 2026-02-17):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/src/components/admin/ImageLightbox.tsx`
  - `apps/web/src/components/admin/ReassignImageModal.tsx`
  - `apps/web/src/lib/photo-metadata.ts`
  - `apps/web/tests/photo-metadata.test.ts`
- Changes:
  - Show-level cast gallery now renders Crew in its own container below Cast, with crew cards driven by `credit_category` classification (`crew`/`producer`/`production` matching).
  - Season-level cast gallery now also splits Cast vs Crew into separate containers while preserving existing sort/filter behavior.
  - Image metadata/details panel now exposes `S3 Mirror File` and adds a one-click `Copy` button for the mirror filename.
  - Added S3 mirror filename inference in metadata mapping from explicit metadata keys and hosted URL path fallbacks for both person photos and season/show assets.
  - Wired lightbox reassign flow on person gallery images:
    - `Re-assign` action now opens modal from image details,
    - modal searches people via existing admin people endpoint,
    - reassignment calls `PUT /api/admin/images/cast/{imageId}/reassign`,
    - gallery refreshes after reassignment.
  - Hardened reassign modal to support auth headers and allowed destination-type restrictions (used as cast-only in person gallery).
  - Added/updated metadata tests for S3 mirror filename derivation.
- Validation:
  - `pnpm -C apps/web run lint` (pass; existing repo warnings only)
  - `pnpm -C apps/web run test -- tests/photo-metadata.test.ts` (pass; 51 files / 185 tests passed)

Figma Likert font-family parity + editor selection sync (this session, 2026-02-17):
- Files:
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - `apps/web/src/lib/fonts/cdn-fonts.ts`
  - `apps/web/tests/cdn-fonts.test.ts`
- Changes:
  - Added canonical font-family normalization for template-editor font fields so dropdown selections resolve to actual CDN-loaded families.
  - Enforced Agree/Disagree (`agree-likert-scale`) template defaults to Figma families:
    - heading/prompt: Gloucester
    - statement: Rude Slab Condensed
    - options: Plymouth Serial.
  - Prevented stale persisted `useGlobal` state from forcing default/global fonts onto Figma-locked agree/disagree previews.
  - Fixed reset behavior to restore per-template default mode (instead of always re-enabling global defaults).
  - Expanded CloudFront font alias resolution for Figma/file-name tokens such as:
    - `Gloucester_MT_Std:Bold`
    - `GloucesterOldStyle-...`
    - `Rude_Slab:Cond_XBd`
    - `Plymouth_Serial:Medium`.
  - Updated matrix-likert preview example content/source to RHOSLC S6 prompt/statement used in Figma node `69:95`.
- Validation:
  - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx src/lib/fonts/cdn-fonts.ts` (pass)
  - `pnpm -C apps/web exec vitest run tests/cdn-fonts.test.ts tests/matrix-likert-input.test.tsx` (pass)

Likert duplicate heading removal for Figma 69:96 parity (this session, 2026-02-17):
- Files:
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
- Changes:
  - Suppressed outer template title/sub-text wrapper for `agree-likert-scale` previews so only the in-component all-caps prompt + statement render.
  - Hidden title/sub-text editor controls for `agree-likert-scale` to avoid conflicting copy layers.
  - Added persisted-state migration for `agree-likert-scale` so stale saved outer title/sub-text values are cleared.
- Validation:
  - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)
  - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx` (pass)

Rank ranking unassigned bank (cast + season) with slot-click picker preserved (this session, 2026-02-17):
- Files:
  - `apps/web/src/components/flashback-ranker.tsx`
  - `apps/web/tests/flashback-ranker.test.tsx`
  - `apps/web/tests/rank-order-input.test.tsx`
- Changes:
  - Added always-visible unassigned bank for `figma-rank-circles` (cast ranking) below the slot grid.
  - Circle bank is droppable (`bench`) and uses smaller tokens than placed slot tokens; no visible title text.
  - Kept slot-click picker behavior unchanged for both presets (`Select cast member/season for rank N`).
  - Updated rectangle bank to remove visible `Unranked` title text and renamed accessibility label to `Unassigned seasons`.
  - Added circle layout metrics for bank sizing/gap/spacing and kept scale multipliers (`shapeScalePercent`/`buttonScalePercent`) active.
  - Expanded ranker tests to validate:
    - presence of circle unassigned bank,
    - no visible `Unranked` text,
    - bank-item size remains smaller than slot size in both circle and rectangle presets,
    - scale changes affect bank + slots without inversion,
    - picker placement flow still emits ordered updates.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/flashback-ranker.test.tsx tests/rank-order-input.test.tsx` (pass)
  - `pnpm -C apps/web exec eslint src/components/flashback-ranker.tsx src/components/survey/RankOrderInput.tsx tests/flashback-ranker.test.tsx tests/rank-order-input.test.tsx` (pass)

Image metadata panel upgrade + face-box tagging + editable content type (this session, 2026-02-17):
- Files:
  - `apps/web/src/components/admin/ImageLightbox.tsx`
  - `apps/web/src/lib/photo-metadata.ts`
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `apps/web/src/lib/server/admin/cast-photo-tags-repository.ts`
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `apps/web/src/app/api/admin/trr-api/cast-photos/[photoId]/tags/route.ts`
  - `apps/web/src/app/api/admin/trr-api/media-links/[linkId]/tags/route.ts`
  - `apps/web/src/app/api/admin/trr-api/assets/content-type/route.ts`
  - `apps/web/tests/photo-metadata.test.ts`
  - `apps/web/tests/image-lightbox-metadata.test.tsx`
  - `apps/web/tests/tags-people-count-source-route.test.ts`
  - `apps/web/tests/assets-content-type-route.test.ts`
- Changes:
  - Added `Original URL` and `Found on: SOURCE | PAGE TITLE` rows directly under `S3 Mirror File` in the image details panel.
  - Added `PhotoMetadata.originalImageUrl` resolution that only uses true source candidates and avoids hosted/mirrored URLs.
  - Added source branding normalization for `Found on` display (FANDOM/IMDB/TMDB with hostname fallback).
  - Added optional `SeasonAsset.source_url` plumbing from repository queries (including cast-photo-derived season assets).
  - Added editable `Content Type` control in image details panel with save action routed through new proxy:
    - `POST /api/admin/trr-api/assets/content-type`.
  - Wired content-type updates in person, show, and season gallery lightboxes with immediate local state updates.
  - Added face-box tagging flow for multi-person images in person lightbox:
    - auto-count response face boxes consumed,
    - per-face cast assignment UI in `TagPeoplePanel`,
    - tag routes now accept/persist `face_boxes`,
    - lightbox overlays face boxes on the image when multi-person.
- Validation:
  - `pnpm -C apps/web run test -- tests/photo-metadata.test.ts tests/image-lightbox-metadata.test.tsx tests/tags-people-count-source-route.test.ts tests/assets-content-type-route.test.ts` (pass)
  - `pnpm -C apps/web run lint` (pass; existing warnings only)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

Likert prompt spacing tune + post-selection Continue CTA (this session, 2026-02-17):
- Files:
  - `apps/web/src/components/survey/MatrixLikertInput.tsx`
  - `apps/web/src/components/survey/NormalizedSurveyPlay.tsx`
  - `apps/web/tests/matrix-likert-input.test.tsx`
- Changes:
  - Reduced line spacing in the all-caps Likert prompt headline ("How much do you agree...") to tighten the two-line block.
  - Increased vertical separation between prompt and statement block, and between statement heading and first answer option, to better match requested layout rhythm.
  - Added conditional `Continue` button for agree/disagree template:
    - hidden until at least one answer is selected,
    - appears after selection,
    - attempts to scroll/focus the next survey question card when available.
  - Added `data-survey-question-card` markers in normalized survey renderer so continue navigation can target the next question container.
  - Expanded matrix-likert tests to assert `Continue` visibility behavior after first selection.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/matrix-likert-input.test.tsx` (pass)
  - `pnpm -C apps/web exec eslint src/components/survey/MatrixLikertInput.tsx src/components/survey/NormalizedSurveyPlay.tsx tests/matrix-likert-input.test.tsx` (pass)

Rank cast unassigned mobile token parity with TwoAxis bench (this session, 2026-02-17):
- Files:
  - `apps/web/src/components/flashback-ranker.tsx`
  - `apps/web/tests/flashback-ranker.test.tsx`
- Changes:
  - Updated Figma circle rank bench sizing so mobile unassigned cast token size matches `TwoAxisGridInput` bench token size (`48px`, from `w-12`).
  - Desktop bench token target remains aligned with TwoAxis desktop bench (`56px`, from `sm:w-14`).
  - Preserved shape scaling behavior and existing drag/picker interactions.
  - Added explicit regression assertion that mobile circle unassigned bank token width is `48px`.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/flashback-ranker.test.tsx tests/rank-order-input.test.tsx` (pass)
  - `pnpm -C apps/web exec eslint src/components/flashback-ranker.tsx tests/flashback-ranker.test.tsx` (pass)

Expanded editor-driven component style customization (this session, 2026-02-17):
- Files:
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
  - `apps/web/src/components/flashback-ranker.tsx`
  - `apps/web/src/components/survey/RankOrderInput.tsx`
  - `apps/web/src/components/survey/MatrixLikertInput.tsx`
  - `apps/web/src/components/survey/WhoseSideInput.tsx`
  - `apps/web/src/components/survey/CastDecisionCardInput.tsx`
  - `apps/web/src/lib/surveys/question-config-types.ts`
  - `apps/web/tests/rank-order-input.test.tsx`
- Changes:
  - Added advanced template-editor/default settings controls for additional component primitives:
    - question text color,
    - component background color,
    - placeholder shape fill/border colors,
    - unassigned container fill/border colors,
    - unassigned cast circle border color,
    - unassigned cast circle size (%).
  - Wired these style tokens from editor state into per-question config payloads in `withEditorFontOverridesForQuestion`.
  - Added base config typing for these style tokens in `BaseQuestionConfig`.
  - Extended rank-order rendering pipeline:
    - `RankOrderInput` now extracts style overrides from config and passes them to `FlashbackRanker`.
    - `FlashbackRanker` now supports style overrides for placeholder slots and unassigned banks (fill/border/number color and unassigned size scaling).
  - `MatrixLikertInput`, `WhoseSideInput`, and `CastDecisionCardInput` now consume config color overrides for question/prompt/background and related controls.
  - `StandalonePreviewCard` editor now also threads shape/button/style overrides into `flashback-ranker` preview.
  - Added rank-order unit test coverage for style override forwarding.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx tests/matrix-likert-input.test.tsx` (pass)
  - `pnpm -C apps/web exec eslint src/app/admin/fonts/_components/QuestionsTab.tsx src/components/flashback-ranker.tsx src/components/survey/RankOrderInput.tsx src/components/survey/MatrixLikertInput.tsx src/components/survey/WhoseSideInput.tsx src/components/survey/CastDecisionCardInput.tsx tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx tests/matrix-likert-input.test.tsx` (pass)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

Cast ranking single-render-path alignment + Figma-inspired white surface defaults (this session, 2026-02-17):
- Files:
  - `apps/web/src/components/survey/RankOrderInput.tsx`
  - `apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
- Changes:
  - Removed cast-specific gray wrapper from `RankOrderInput` so cast ranking now uses one shared render surface path through `FlashbackRanker` (same behavior for direct and wrapped usage).
  - Updated template-editor rank preview defaults to white frame/background with black typography orientation to match requested Figma-inspired direction while keeping unassigned bank styling unchanged.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/rank-order-input.test.tsx tests/flashback-ranker.test.tsx` (pass)
  - `pnpm -C apps/web exec eslint src/components/survey/RankOrderInput.tsx src/components/flashback-ranker.tsx src/app/admin/fonts/_components/QuestionsTab.tsx` (pass)
  - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass)

Person fandom data ownership guard for profile hydration (this session, 2026-02-17):
- Files:
  - `apps/web/src/lib/server/trr-api/fandom-ownership.ts`
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `apps/web/tests/fandom-person-ownership.test.ts`
- Changes:
  - Added URL owner extraction for Wikipedia person pages and generalized owner extraction across Fandom/Wikipedia.
  - Added `castFandomRowMatchesExpectedPerson(...)` to enforce row ownership during profile hydration.
  - Updated `getFandomDataByPersonId(...)` to use strict ownership validation so relationship evidence URLs (e.g. Lisa page used as source for John relationship) cannot hydrate John’s personal profile fields.
  - Restricted Fandom URL page-name extraction to actual Fandom/Wikia hosts.
  - Added tests for:
    - Wikipedia URL owner parsing,
    - cross-source owner extraction,
    - rejection when row source URL owner mismatches expected person.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/fandom-person-ownership.test.ts tests/person-fandom-route.test.ts` (pass)
  - `pnpm -C apps/web exec eslint src/lib/server/trr-api/fandom-ownership.ts src/lib/server/trr-api/trr-shows-repository.ts tests/fandom-person-ownership.test.ts tests/person-fandom-route.test.ts` (pass; existing repo warning in `trr-shows-repository.ts` unrelated to this change)

Show cast card fallback for latest season rendering (this session, 2026-02-17):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - In cast display merge logic, `latest_season` now falls back to the base cast payload when cast-role-members payload is missing/null for that field, preventing unnecessary null regression in UI.
- Validation:
  - `pnpm -C apps/web exec eslint apps/web/src/app/admin/trr-shows/[showId]/page.tsx` (pass with existing repo warnings only; no new errors)

TRR stack audit remediation baseline (this session, 2026-02-17):
- Files:
  - `.github/workflows/web-tests.yml`
  - `apps/web/package.json`
  - `apps/web/pnpm-lock.yaml`
  - `apps/web/DEPLOY.md`
  - `apps/web/.env.example`
  - `scripts/check_env_example.py`
  - `docs/cross-collab/TASK8/PLAN.md`
  - `docs/cross-collab/TASK8/OTHER_PROJECTS.md`
  - `docs/cross-collab/TASK8/STATUS.md`
- Changes:
  - Added CI merge-marker guard.
  - Converted web CI to explicit Node matrix:
    - Node 20 full lane (lint + full tests + build)
    - Node 22 compatibility lane (lint + smoke tests + build)
  - Aligned `eslint-config-next` with `next@16.1.6` and regenerated lockfile.
  - Updated deploy docs to state Node 20 + 22 support and Node 20 local default.
  - Added env contract check for `apps/web/.env.example` in CI.
  - Fixed `SCREENALYTICS_API_URL` default to workspace mode (`http://127.0.0.1:8001`) and removed duplicate `DATABASE_URL` key.
- Validation:
  - `python3 scripts/check_env_example.py --file apps/web/.env.example --required TRR_API_URL SCREENALYTICS_API_URL TRR_INTERNAL_ADMIN_SHARED_SECRET` (pass)
  - `pnpm -C apps/web run lint` (pass; existing warnings only)
  - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/validation.test.ts tests/cdn-fonts.test.ts` (pass)
  - `pnpm -C apps/web run build` (pass)

Show cast episode-scope behavior update (this session, 2026-02-17):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/lib/admin/cast-episode-scope.ts`
  - `apps/web/tests/cast-episode-scope.test.ts`
- Changes:
  - Added `resolveShowCastEpisodeCount(...)` helper to make episode-count scope explicit.
  - Show cast cards now resolve episode labels as:
    - no season chips selected: all-season totals from show cast payload,
    - season chips selected: season-scoped totals from cast-role-members payload.
  - Added dynamic helper text under season chips clarifying whether episode counts reflect selected seasons or all seasons.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/cast-episode-scope.test.ts tests/show-cast-route-default-min-episodes.test.ts` (pass)
  - `pnpm -C apps/web exec eslint src/app/admin/trr-shows/[showId]/page.tsx src/lib/admin/cast-episode-scope.ts tests/cast-episode-scope.test.ts` (pass with existing warnings in `page.tsx` only)

Person canonical source priority now includes IMDb (this session, 2026-02-17):
- Files:
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
- Changes:
  - Added `imdb` to canonical profile source allowlist used by API/repository validation.
  - Added `imdb` to default source-priority order on person page so Source Priority shows 4 entries.
  - Added source label rendering for IMDb (`IMDb`) in the priority list UI.
  - Save/Reset now persist and restore a 4-source order: `tmdb`, `imdb`, `fandom`, `manual`.
- Validation:
  - `pnpm -C apps/web exec eslint src/lib/server/trr-api/trr-shows-repository.ts src/app/admin/trr-shows/people/[personId]/page.tsx` (pass with existing unrelated warning in `trr-shows-repository.ts`)
  - `pnpm -C apps/web exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-17) — cross-collab sync only:
- Updated `docs/cross-collab/TASK8/STATUS.md` to record downstream readiness from screenalytics TASK7 (lint restoration + Wave A validation complete).
- No TRR-APP runtime/codepath changes in this continuation block.

Continuation (same session, 2026-02-17) — auth abstraction stage 1 (Supabase target):
- Updated `apps/web/src/lib/server/auth.ts` to support dual-provider verification:
  - Primary provider configurable via `TRR_AUTH_PROVIDER` (`firebase` default, `supabase` optional)
  - Optional shadow verification via `TRR_AUTH_SHADOW_MODE`
  - Automatic fallback to the secondary provider when primary verification fails
  - Preserved existing `requireUser` / `requireAdmin` call signatures and behavior
- Updated `apps/web/src/app/api/session/login/route.ts`:
  - Supabase mode now stores access token in `__session` cookie for server verification path
  - Response now includes provider metadata (`provider`, `shadowMode`)
  - Firebase mode remains default behavior with existing service-account gating
- Updated config/docs:
  - `apps/web/.env.example`: added `TRR_AUTH_PROVIDER`, `TRR_AUTH_SHADOW_MODE`
  - `apps/web/DEPLOY.md`: added migration auth env documentation

Validation evidence:
- `pnpm -C apps/web run lint` (pass; warnings only)
- `pnpm -C apps/web run test -- tests/admin-shows-by-trr-show-route.test.ts tests/reddit-threads-route.test.ts tests/reddit-community-flares-refresh-route.test.ts tests/show-bravo-videos-proxy-route.test.ts tests/person-refresh-images-stream-route.test.ts` (pass; run executed with 57 files / 215 tests)
- `pnpm -C apps/web exec next build --webpack` (pass)

Per-person URL coverage matrix in Settings links (this session, 2026-02-17):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Reworked `Settings -> Links -> Cast Member Pages` rendering from flat link rows into one container per person.
  - Added source coverage matrix per person for:
    - Bravo
    - IMDb
    - TMDb
    - Knowledge Graph (Wikidata/Wikipedia)
    - Fandom/Wikia
  - Added source "logo" badges and state coloring:
    - green = `Found` (approved URL), clickable hyperlink
    - red = `Missing`/`Pending`/`Rejected` (not clickable)
  - Added per-source admin controls in each person card (`Approve`, `Reject`, `Edit`, `Delete`) for the selected source URL.
  - Added person-link source classification + preference logic:
    - status priority (`approved` > `pending` > `rejected`)
    - knowledge-source priority (`wikidata` over `wikipedia`)
- Validation:
  - `pnpm -C apps/web exec eslint src/app/admin/trr-shows/[showId]/page.tsx` (pass with existing warnings only)
  - `pnpm -C apps/web exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-17) — next-five tasks (auth migration prep hardening):
- Hardened auth shadow parity diagnostics in `apps/web/src/lib/server/auth.ts`:
  - added normalized claim summaries
  - added mismatch detection (`uid`, `email`, `name`) for shadow-mode comparisons
  - logs structured mismatch details for Stage 2 monitoring
- Added dedicated auth adapter test coverage:
  - `apps/web/tests/server-auth-adapter.test.ts`
  - scenarios covered:
    - firebase primary success
    - supabase fallback when firebase verification fails
    - shadow mismatch diagnostics emission
    - supabase provider path with admin allowlist
- Added migration execution runbook:
  - `docs/cross-collab/TASK8/AUTH_MIGRATION_RUNBOOK.md`
  - includes Stage 2 shadow rollout gates, Stage 3 cutover gates, rollback, and decommission checklist
- Updated task coordination docs:
  - `docs/cross-collab/TASK8/PLAN.md`
  - `docs/cross-collab/TASK8/OTHER_PROJECTS.md`
  - `docs/cross-collab/TASK8/STATUS.md`

Validation evidence:
- `pnpm -C apps/web run test -- tests/server-auth-adapter.test.ts` (pass; test suite run completed with 58 files / 223 tests)

Continuation (same session, 2026-02-17) — auth observability endpoint + diagnostics counters:
- Files:
  - `apps/web/src/lib/server/auth.ts`
  - `apps/web/src/app/api/admin/auth/status/route.ts`
  - `apps/web/tests/server-auth-adapter.test.ts`
  - `apps/web/tests/admin-auth-status-route.test.ts`
- Changes:
  - Added in-memory auth diagnostics counters in server auth adapter:
    - shadow checks / failures / mismatch events
    - mismatch field counts (`uid`, `email`, `name`)
    - fallback success count
  - Added `getAuthDiagnosticsSnapshot()` export with provider/shadow-mode metadata and allowlist size summary.
  - Added admin-only diagnostics endpoint:
    - `GET /api/admin/auth/status`
    - returns diagnostics snapshot + caller identity summary.
  - Added/extended tests for:
    - diagnostics counter updates across fallback and shadow mismatch flows
    - endpoint success and unauthorized paths.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/server-auth-adapter.test.ts tests/admin-auth-status-route.test.ts` (`7 passed`)
  - `pnpm -C apps/web run lint` (pass; warnings only)

Continuation (same session, 2026-02-17) — Stage 3 cutover readiness gating + dashboard signal:
- Files:
  - `apps/web/src/lib/server/auth-cutover.ts`
  - `apps/web/src/app/api/admin/auth/status/route.ts`
  - `apps/web/src/app/admin/dev-dashboard/page.tsx`
  - `apps/web/tests/auth-cutover-readiness.test.ts`
  - `apps/web/tests/admin-auth-status-route.test.ts`
  - `apps/web/.env.example`
  - `apps/web/DEPLOY.md`
- Changes:
  - Added `evaluateAuthCutoverReadiness(...)` with threshold-based gate logic:
    - min shadow checks
    - max shadow failures
    - max shadow mismatch events
  - Extended `/api/admin/auth/status` to return `cutoverReadiness` in addition to diagnostics and viewer metadata.
  - Added auth migration readiness card to `/admin/dev-dashboard`:
    - current provider + shadow mode
    - observed counters vs thresholds
    - blocking reasons when not ready
  - Added new env/config knobs for cutover gating:
    - `TRR_AUTH_CUTOVER_MIN_SHADOW_CHECKS` (default 50)
    - `TRR_AUTH_CUTOVER_MAX_SHADOW_FAILURES` (default 0)
    - `TRR_AUTH_CUTOVER_MAX_SHADOW_MISMATCH_EVENTS` (default 0)
- Validation:
  - `pnpm -C apps/web exec vitest run tests/auth-cutover-readiness.test.ts tests/admin-auth-status-route.test.ts tests/server-auth-adapter.test.ts` (`10 passed`)
  - `pnpm -C apps/web run lint` (pass; warnings only)
  - `pnpm -C apps/web exec next build --webpack` (pass)

Continuation (same session, 2026-02-17) — diagnostics reset window controls for cutover drills:
- Files:
  - `apps/web/src/lib/server/auth.ts`
  - `apps/web/src/app/api/admin/auth/status/reset/route.ts`
  - `apps/web/src/app/admin/dev-dashboard/page.tsx`
  - `apps/web/tests/admin-auth-status-reset-route.test.ts`
  - `apps/web/tests/server-auth-adapter.test.ts`
  - `apps/web/tests/admin-auth-status-route.test.ts`
  - `apps/web/tests/auth-cutover-readiness.test.ts`
- Changes:
  - Added diagnostics window metadata (`windowStartedAt`, `lastObservedAt`) to auth diagnostics snapshots.
  - Added `resetAuthDiagnosticsSnapshot()` to zero counters and start a new observation window.
  - Added admin endpoint `POST /api/admin/auth/status/reset` to reset diagnostics and return refreshed readiness payload.
  - Added dev dashboard `Reset Window` action and timestamp display for the auth migration panel.
  - Extended test coverage for reset route and reset semantics.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/auth-cutover-readiness.test.ts tests/admin-auth-status-route.test.ts tests/admin-auth-status-reset-route.test.ts tests/server-auth-adapter.test.ts` (`12 passed`)
  - `pnpm -C apps/web run lint` (pass; warnings only)
  - `pnpm -C apps/web exec next build --webpack` failed due to unrelated typed-route mismatch in `src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx` (`buildSeasonAdminUrl(...)` string not assignable to `RouteImpl<string>`).

Continuation (same session, 2026-02-17) — drill report export + build blocker resolution:
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `apps/web/src/lib/server/auth.ts`
  - `apps/web/src/app/api/admin/auth/status/drill-report/route.ts`
  - `.github/workflows/web-tests.yml`
  - `apps/web/src/app/admin/dev-dashboard/page.tsx`
  - `apps/web/tests/admin-auth-drill-report-route.test.ts`
  - `apps/web/tests/admin-auth-status-route.test.ts`
  - `apps/web/tests/admin-auth-status-reset-route.test.ts`
  - `apps/web/tests/auth-cutover-readiness.test.ts`
  - `apps/web/tests/server-auth-adapter.test.ts`
  - `apps/web/DEPLOY.md`
- Changes:
  - Resolved typed-route build blocker by switching season admin route casts to `Route` for `router.replace(...)` targets.
  - Added store-backed auth diagnostics persistence (file-backed) with configurable controls:
    - `TRR_AUTH_DIAGNOSTICS_PERSIST`
    - `TRR_AUTH_DIAGNOSTICS_STORE_FILE`
  - Added Stage 3 drill report endpoint:
    - `GET /api/admin/auth/status/drill-report`
    - supports `?format=download` for JSON evidence export.
  - Added dev dashboard action to download drill reports directly from admin UI.
  - Added CI compatibility-lane smoke tests for auth status/reset/drill endpoints.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/admin-auth-status-route.test.ts tests/admin-auth-status-reset-route.test.ts tests/admin-auth-drill-report-route.test.ts tests/auth-cutover-readiness.test.ts tests/server-auth-adapter.test.ts` (`14 passed`)
  - `pnpm -C apps/web run lint` (pass; warnings only)
  - `pnpm -C apps/web exec next build --webpack` (pass)

Continuation (same session, 2026-02-17) — admin show/season URL canonicalization immediate routing:
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
- Changes:
  - Added immediate (pre-data) canonicalization effects on show and season pages so legacy query routing (`?tab=...`, `?assets=...`) is rewritten to path-based tab URLs without waiting for show payload fetch.
  - Preserved non-routing query params during rewrite via existing query cleanup helper.
  - Kept post-load slug canonicalization in place for final normalization to canonical show slug when data resolves.
- Validation:
  - `pnpm -C apps/web exec eslint 'apps/web/src/app/admin/trr-shows/[showId]/page.tsx' 'apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx'` (pass; warnings only)
  - `pnpm -C apps/web exec tsc --noEmit` (pass)
  - Playwright manual checks confirmed URL canonicalization within ~300ms for:
    - show tab query -> `/cast`
    - show overview query -> show root
    - season tab query -> `/seasons/:n/social`
    - season assets query -> `/seasons/:n/assets/brand`

Continuation (same session, 2026-02-17) — Phase 9 CI stabilization and review-blocker closure:
- Branch/PR:
  - `codex/auth-cutover-phase9`
  - `https://github.com/therealityreport/trr-app/pull/41`
- Fixes applied in this continuation:
  - Added tracked env contract validator script: `scripts/check_env_example.py`.
  - Tracked `apps/web/.env.example` by opting it back in from ignore (`apps/web/.gitignore` -> `!.env.example`) to satisfy workflow env-contract checks.
  - Fixed auth diagnostics load order race in `apps/web/src/lib/server/auth.ts` by loading persisted diagnostics state before token verification counters mutate.
  - Added missing admin route helper modules/tests required by season/show admin pages:
    - `apps/web/src/lib/admin/show-admin-routes.ts`
    - `apps/web/src/lib/admin/cast-episode-scope.ts`
    - `apps/web/tests/show-admin-routes.test.ts`
    - `apps/web/tests/cast-episode-scope.test.ts`
    - `apps/web/tests/trr-shows-slug-route.test.ts`
  - Fixed build-time prop contract mismatch by aligning season social analytics section props and tests:
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/tests/season-social-analytics-section.test.tsx`
- Validation:
  - Local:
    - `python3 scripts/check_env_example.py --file apps/web/.env.example --required TRR_API_URL SCREENALYTICS_API_URL TRR_INTERNAL_ADMIN_SHARED_SECRET` (pass)
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/show-admin-routes.test.ts tests/cast-episode-scope.test.ts tests/trr-shows-slug-route.test.ts` (pass)
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/season-social-analytics-section.test.tsx` (pass)
    - `DATABASE_URL='' NEXT_PUBLIC_FIREBASE_API_KEY='placeholder-api-key-for-build' NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN='placeholder.firebaseapp.com' NEXT_PUBLIC_FIREBASE_PROJECT_ID='demo-build' pnpm -C apps/web run build` (pass)
  - GitHub checks on head `9b7330518b2b99f6651536b350c5d344d02ff5b4`:
    - `Web Tests / Web CI (Node 20 / full)` (success)
    - `Web Tests / Web CI (Node 22 / compat)` (success)
    - `Repository Map / generate-repo-map` (success)
    - `Vercel` (success)

Continuation (same session, 2026-02-18) — Health Center Sync Pipeline row model + dedupe:
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/lib/admin/refresh-log-pipeline.ts`
  - `apps/web/tests/refresh-log-pipeline.test.ts`
- Changes:
  - Added deterministic refresh topic resolution with priority:
    1) structured backend topic, 2) stage key map, 3) category map, 4) heuristic fallback.
  - Added pipeline row builder that preserves fixed row order:
    - `SHOWS`, `SEASONS`, `EPISODES`, `PEOPLE`, `MEDIA`, `BRAVOTV`.
  - Added row-level latest update message rendering in Health Center Sync Pipeline.
  - Added structured refresh log metadata support in UI entries:
    - `topic`, `stageKey`, `provider`.
  - Tightened dedupe to topic+stage+message+progress tuple.
  - Removed duplicate wrapper-level per-target log lines.
  - Made full refresh sequence explicit/non-redundant:
    - `details -> seasons_episodes -> cast_credits -> photos`
  - Removed implicit nested photos rerun from `seasons_episodes`.
- Validation:
  - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/refresh-log-pipeline.test.ts` (`4 passed`)

Continuation (same session, 2026-02-18) — keep wrapper Refresh summaries out of pipeline topic rows:
- Files:
  - `apps/web/src/lib/admin/refresh-log-pipeline.ts`
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/tests/refresh-log-pipeline.test.ts`
- Changes:
  - Updated topic resolver to return `null` for generic wrapper-level `category: "Refresh"` summaries that would otherwise default to `shows`.
  - Preserved stage/category/heuristic mapping for real sub-task logs (including `Refresh` entries that clearly mention a concrete domain like episodes).
  - Updated pipeline grouping to ignore `null` topic entries so global summary lines do not overwrite `SHOWS` latest message/time.
  - Added regression test asserting `"Completed full refresh successfully."` resolves to no pipeline topic.
- Validation:
  - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/refresh-log-pipeline.test.ts` (`5 passed`)
  - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/refresh-log-pipeline.test.ts tests/show-gallery-delete-wiring.test.ts` (`6 passed`)

Continuation (same session, 2026-02-18) — cast tab unfiltered scope and all-seasons episode totals:
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/lib/admin/cast-episode-scope.ts`
  - `apps/web/tests/cast-episode-scope.test.ts`
- Changes:
  - Fixed cast card source to union base `cast` rows with missing people from `castRoleMembers`, so unfiltered show-cast view no longer drops members that only exist in scoped role/episode evidence.
  - For unfiltered mode, updated episode total resolver to use the larger of `castTotalEpisodes` and `scopedTotalEpisodes` when both exist, preventing stale single-season totals from winning.
  - Removed unreachable fallback branch comparison (`target === "photos"`) that triggered TS2367 in `refreshShow` fallback path.
  - Added regression test for no-season-filter merge behavior in episode totals helper.
- Validation:
  - `pnpm -C apps/web exec tsc --noEmit` (pass)
  - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/cast-episode-scope.test.ts tests/refresh-log-pipeline.test.ts` (`11 passed`)

Continuation (same session, 2026-02-19) — reprocess images stream proxy error handling:
- Files:
  - `apps/web/src/app/api/admin/trr-api/people/[personId]/reprocess-images/stream/route.ts`
- Changes:
  - Aligned reprocess stream proxy error behavior with refresh stream proxy by returning SSE `event: error` payloads with HTTP `200` for proxy/backend failures.
  - Added `stage` metadata (`proxy`/`backend`) to error events for clearer client-side error labeling.
  - Prevented client `response.ok` failure path from short-circuiting stream parsing, which was causing generic `"Failed to reprocess images"` throws and console error noise.
- Validation:
  - `pnpm -C apps/web run lint` (fails due existing ESLint config circular-structure error in current branch)
  - `pnpm -C apps/web exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-19) — RHOSLC Google News sync + unified News tab validation:
- Files (already present on current branch; validated in-session):
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/google-news/sync/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/news/route.ts`
  - `apps/web/tests/show-google-news-sync-proxy-route.test.ts`
  - `apps/web/tests/show-news-proxy-route.test.ts`
  - `apps/web/tests/show-news-tab-google-wiring.test.ts`
- Validation:
  - `pnpm -C apps/web exec vitest run tests/show-news-tab-google-wiring.test.ts tests/show-google-news-sync-proxy-route.test.ts tests/show-news-proxy-route.test.ts tests/show-bravo-videos-proxy-route.test.ts` (`5 passed`)
  - `pnpm -C apps/web exec eslint ...` (fails due existing ESLint circular-structure config error in this branch)
  - `pnpm -C apps/web exec tsc --noEmit` (fails due existing tracked merge-conflict markers in unrelated files, e.g. `src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx` and `src/lib/admin/cast-episode-scope.ts`)

Continuation (same session, 2026-02-19) — CI lint unblock + survey input test batch:
- Files:
  - `apps/web/eslint.config.mjs`
  - `apps/web/src/components/survey/CastDecisionCardInput.tsx`
  - `apps/web/src/components/survey/DropdownInput.tsx`
  - `apps/web/src/components/survey/MatrixLikertInput.tsx`
  - `apps/web/src/components/survey/NormalizedSurveyPlay.tsx`
  - `apps/web/src/components/survey/SingleSelectInput.tsx`
  - `apps/web/src/components/survey/WhoseSideInput.tsx`
  - `apps/web/tests/matrix-likert-input.test.tsx`
  - `apps/web/tests/three-choice-slider-input.test.tsx`
  - `apps/web/tests/normalized-survey-play-continue.test.tsx`
  - `apps/web/tests/single-select-input.test.tsx`
- Changes:
  - Replaced `FlatCompat`-based ESLint setup with Next.js native flat config imports to avoid ESLint 9 circular-config crash in CI.
  - Added explicit overrides for strict `react-hooks/*` compiler rules to preserve existing lint contract for this branch.
  - Included pending survey input/play refinements and associated regression tests.
- Validation:
  - `pnpm -C apps/web run lint` (pass; warnings only)
  - `pnpm -C apps/web exec tsc --noEmit` (pass)
  - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/matrix-likert-input.test.tsx tests/three-choice-slider-input.test.tsx tests/normalized-survey-play-continue.test.tsx tests/single-select-input.test.tsx` (`16 passed`)
