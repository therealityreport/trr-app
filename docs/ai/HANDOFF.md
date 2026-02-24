# Session Handoff (TRR-APP)

Purpose: persistent state for multi-turn AI agent sessions in `TRR-APP`. Update before ending a session or requesting handoff.

## Latest Update (2026-02-24) — Season refresh request-id diagnostics + RHOSLC E2E runbook

- February 24, 2026: Implemented end-to-end request-id correlation for season image refresh and added RHOSLC manual E2E validation runbook.
  - Files:
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/refresh-photos/stream/route.ts`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/tests/show-refresh-photos-stream-route.test.ts`
    - `apps/web/tests/season-refresh-request-id-wiring.test.ts` (new)
    - `docs/cross-collab/rhoslc-media-refresh-e2e-checklist.md` (new)
  - Changes:
    - Season `Refresh Images` now creates per-click request ids (`show + season + timestamp + counter`) and sends them in `x-trr-request-id`.
    - Season refresh activity logs now store `requestId` and render log message prefixes as `[req:<id>] ...` for direct traceability.
    - Season refresh stream progress state now carries optional `requestId`.
    - `refresh-photos/stream` proxy now forwards `x-trr-request-id` to backend and injects `request_id` into proxy-origin SSE error payloads.
    - Added RHOSLC runbook for normal + degraded (Screenalytics-down) manual checks:
      - `/Users/thomashulihan/Projects/TRR/TRR-APP/docs/cross-collab/rhoslc-media-refresh-e2e-checklist.md`
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/show-refresh-photos-stream-route.test.ts tests/season-refresh-request-id-wiring.test.ts` (pass)
    - `pnpm -C apps/web exec eslint 'src/app/api/admin/trr-api/shows/[showId]/refresh-photos/stream/route.ts' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' tests/show-refresh-photos-stream-route.test.ts tests/season-refresh-request-id-wiring.test.ts` (pass)

## Latest Update (2026-02-24) — PR #52 CI unblock (timeout assertion drift)

- February 24, 2026: Fixed the remaining Node 20 CI failure on `codex/2026-02-24-trr-app-sync` by removing a stale hardcoded timeout expectation in one route test.
  - Files:
    - `apps/web/tests/show-bravo-video-thumbnail-sync-proxy-route.test.ts`
    - `apps/web/tests/reddit-sources-manager.test.tsx`
    - `apps/web/tests/season-social-analytics-section.test.tsx`
  - Changes:
    - Updated abort-timeout assertion from exact `90s` text to a format assertion (`timed out after <N>s`) so the test stays aligned with the route timeout constant.
    - Stabilized the show-focused community test by waiting for communities to finish loading before selection and using an async text assertion for the post-load helper copy.
    - Stabilized run-scoped jobs loading test by using the `Select Latest Run` action and waiting for combobox value state before asserting downstream `run_id` job fetch calls.
    - Stabilized run-health grouped-failure assertion by waiting asynchronously for the `RATE_LIMIT · comments · 2` grouped row to render before asserting.
  - Validation:
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/show-bravo-video-thumbnail-sync-proxy-route.test.ts tests/season-social-analytics-section.test.tsx tests/reddit-sources-manager.test.tsx` (pass)
    - `pnpm -C apps/web run test:ci` (pass; `186 files, 745 tests`)
    - `for i in $(seq 1 15); do pnpm -C apps/web exec vitest run -c vitest.config.ts tests/season-social-analytics-section.test.tsx -t "loads jobs for the selected run id"; done` (all 15 passes)
    - `for i in $(seq 1 20); do pnpm -C apps/web exec vitest run -c vitest.config.ts tests/season-social-analytics-section.test.tsx -t "groups failures and renders latest five failure events in run health"; done` (all 20 passes)

## Latest Update (2026-02-24) — Admin host defaults + browser sync hardening + season social test act cleanup

- February 24, 2026: Implemented outstanding follow-ups to stabilize admin host isolation defaults, local workspace tab behavior, and social analytics test noise.
  - Files:
    - `apps/web/src/proxy.ts`
    - `apps/web/src/lib/server/auth.ts`
    - `apps/web/tests/admin-host-middleware.test.ts`
    - `apps/web/tests/server-auth-adapter.test.ts`
    - `apps/web/tests/season-social-analytics-section.test.tsx`
    - `apps/web/.env.example`
    - `apps/web/README.md`
    - `../scripts/dev-workspace.sh`
    - `../scripts/open-or-refresh-browser-tab.sh`
  - Changes:
    - Host enforcement now defaults to enabled when `ADMIN_ENFORCE_HOST` is unset.
    - Development fallback host allowlist added for admin API checks when `ADMIN_APP_HOSTS` is unset:
      - `admin.localhost,localhost,127.0.0.1,[::1],::1`
      - canonical `ADMIN_APP_ORIGIN` host still included.
    - Proxy and server host-gate behavior kept in parity (same default-on + dev fallback semantics).
    - Workspace launcher now injects explicit admin host env defaults into `next dev` and prints `TRR-APP Admin` URL.
    - Browser tab refresh script no longer treats all localhost-family `:3000` tabs as equivalent; refresh matching is exact target URL + explicit localhost/127 alias only.
    - Season social analytics test cleanup:
      - standardized fake timer lifecycle in `afterEach` with `act(...)`
      - wrapped polling timer advances in `act(...)`
      - removed per-test `useRealTimers` cleanup duplication.
  - Validation:
    - Pending in current session; run:
      - `pnpm -C apps/web exec vitest run tests/admin-host-middleware.test.ts tests/server-auth-adapter.test.ts tests/season-social-analytics-section.test.tsx`
      - `pnpm -C apps/web exec tsc --noEmit`
      - `pnpm -C apps/web run test:ci`
      - `pnpm -C apps/web exec next build --webpack`
      - `pnpm -C apps/web run lint`

## Latest Update (2026-02-24) — SHOW pages comprehensive hardening pass (shared tabs + gallery chunking + runtime coverage)

- February 24, 2026 (final outstanding-fixes closeout): Cleared remaining wiring drift and completed full validation for the speed/efficiency + hardening pass.
  - Files:
    - `apps/web/tests/show-page-modularization-wiring.test.ts`
    - `apps/web/tests/show-cast-lazy-loading-wiring.test.ts`
  - Changes:
    - Updated show-page modularization wiring expectations to shared component imports under `@/components/admin/show-tabs/*`.
    - Updated cast cancel-button wiring assertion to include the current `hasPersonRefreshInFlight` condition.
  - Validation:
    - `pnpm -C apps/web run test:ci` (`181 files, 734 tests passed`)
    - `pnpm -C apps/web exec next build --webpack` (pass)
    - `pnpm -C apps/web exec tsc --noEmit --pretty false` (pass, after `.next/types` regeneration by build)

- February 24, 2026: Implemented the SHOW/SEASON admin hardening and maintainability pass in `apps/web` with app-only scope (no backend schema/contract changes).
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/src/lib/admin/admin-fetch.ts`
    - `apps/web/src/components/admin/ImageLightbox.tsx`
    - `apps/web/src/components/admin/show-tabs/ShowTabsNav.tsx` (new shared)
    - `apps/web/src/components/admin/show-tabs/ShowSeasonCards.tsx` (new shared)
    - `apps/web/src/components/admin/show-tabs/ShowAssetsImageSections.tsx` (new shared)
    - `apps/web/src/components/admin/show-tabs/ShowOverviewTab.tsx` (new)
    - `apps/web/src/components/admin/show-tabs/ShowSeasonsTab.tsx` (new)
    - `apps/web/src/components/admin/show-tabs/ShowAssetsTab.tsx` (new)
    - `apps/web/src/components/admin/show-tabs/ShowNewsTab.tsx` (new)
    - `apps/web/src/components/admin/show-tabs/ShowCastTab.tsx` (new)
    - `apps/web/src/components/admin/show-tabs/ShowSocialTab.tsx` (new)
    - `apps/web/src/components/admin/show-tabs/ShowSettingsTab.tsx` (new)
    - `apps/web/src/components/admin/season-tabs/SeasonEpisodesTab.tsx` (new)
    - `apps/web/src/components/admin/season-tabs/SeasonAssetsTab.tsx` (new)
    - `apps/web/src/components/admin/season-tabs/SeasonVideosTab.tsx` (new)
    - `apps/web/src/components/admin/season-tabs/SeasonFandomTab.tsx` (new)
    - `apps/web/src/components/admin/season-tabs/SeasonCastTab.tsx` (new)
    - `apps/web/src/components/admin/season-tabs/SeasonSocialTab.tsx` (new)
    - `apps/web/src/components/admin/image-lightbox/LightboxShell.tsx` (new)
    - `apps/web/src/components/admin/image-lightbox/LightboxImageStage.tsx` (new)
    - `apps/web/src/components/admin/image-lightbox/LightboxMetadataPanel.tsx` (new)
    - `apps/web/src/components/admin/image-lightbox/LightboxManagementActions.tsx` (new)
    - Tests:
      - `apps/web/tests/show-tabs-nav.runtime.test.tsx` (new)
      - `apps/web/tests/show-season-cards.runtime.test.tsx` (new)
      - `apps/web/tests/show-assets-image-sections.runtime.test.tsx` (new)
      - `apps/web/tests/image-lightbox-metadata.test.tsx` (extended featured actions)
  - Migration map:
    - `apps/web/src/app/admin/trr-shows/[showId]/_components/ShowTabsNav.tsx` -> `apps/web/src/components/admin/show-tabs/ShowTabsNav.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/_components/ShowSeasonCards.tsx` -> `apps/web/src/components/admin/show-tabs/ShowSeasonCards.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/_components/ShowAssetsImageSections.tsx` -> `apps/web/src/components/admin/show-tabs/ShowAssetsImageSections.tsx`
  - Key changes:
    - Switched show page imports to shared tab components under `src/components/admin/show-tabs`.
    - Added season tab wrappers under `src/components/admin/season-tabs` and wired season page tab blocks through these shared components.
    - Added/normalized admin fetch wrapper usage (`adminGetJson` / `adminMutation`) in show + season paths (continuation of prior in-flight work).
    - Show gallery render hardening:
      - replaced single global `galleryVisibleCount` with per-section visibility map (`ShowGalleryVisibleBySection`),
      - per-section chunk defaults = 60 and increment = 60,
      - per-section load-more controls now appear for each populated section.
    - `ImageLightbox` internal maintainability split:
      - wired outer shell/image stage/metadata panel container and management-action container through subcomponents in `src/components/admin/image-lightbox`.
      - public `ImageLightbox` API unchanged.
    - Runtime test coverage added for:
      - show tabs nav behavior,
      - season cards + deep-link chip order,
      - assets section featured badges/lightbox wiring/load-more controls,
      - featured poster/backdrop actions in lightbox metadata panel.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/show-admin-routes.test.ts tests/season-tab-alias-redirect.test.ts tests/show-tabs-nav.runtime.test.tsx tests/show-season-cards.runtime.test.tsx tests/show-assets-image-sections.runtime.test.tsx tests/image-lightbox-metadata.test.tsx tests/show-featured-image-validation-route.test.ts tests/trr-shows-repository-featured-image-validation.test.ts tests/show-page-tab-order-wiring.test.ts tests/season-page-tab-order-wiring.test.ts tests/show-featured-image-lightbox-wiring.test.ts` (`11 files, 46 tests passed`)
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' src/components/admin/ImageLightbox.tsx src/components/admin/show-tabs src/components/admin/season-tabs src/components/admin/image-lightbox src/lib/admin/show-admin-routes.ts src/lib/admin/admin-fetch.ts` (pass)
    - `pnpm -C apps/web exec next typegen` (pass; regenerated `.next/types` after transient lock/type artifact drift)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web exec next build --webpack` (pass)
  - Residual risks / follow-up:
    - Heavy show-tab bodies (`assets/news/cast/settings/social`) are still largely inline in `[showId]/page.tsx`; full module extraction and `next/dynamic` chunk-splitting is only partially completed.

## Latest Update (2026-02-24) — Networks sync controls (credit-safe default + resume support)

- February 24, 2026: Implemented app-side controls for the backend resumable/credit-safe networks sync contract.
  - Files:
    - `apps/web/src/app/api/admin/networks-streaming/sync/route.ts`
    - `apps/web/src/app/admin/networks/page.tsx`
    - `apps/web/tests/networks-streaming-sync-proxy-route.test.ts`
    - `apps/web/tests/admin-networks-page-auth.test.tsx`
  - Changes:
    - Sync proxy now accepts/forwards:
      - `refresh_external_sources`
      - `batch_size`
      - `max_runtime_sec`
      - `resume_run_id`
    - Networks admin page sync behavior defaults to credit-safe mode:
      - always sends `refresh_external_sources=false` unless operator enables toggle.
    - Added advanced operator toggle:
      - “Refresh external catalogs (uses credits)”.
    - Added run metadata rendering in sync result panel:
      - run id, status, resume cursor.
    - Added `Resume Sync` action when backend reports `status='stopped'`.
    - Kept existing auth flow and unresolved handling intact.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/networks-streaming-sync-proxy-route.test.ts tests/admin-networks-page-auth.test.tsx` (`7 passed`)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)

## Latest Update (2026-02-24) — Red build/test cleanup pass (show role timeout + proxy/wiring stability)

- February 24, 2026: Completed the targeted cleanup pass for current build/test regressions in `apps/web` (no backend contract changes).
  - Files:
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/roles/route.ts`
    - `apps/web/tests/show-role-mutation-proxy-route.test.ts`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/tests/reddit-discovery-service.test.ts`
  - Changes:
    - Standardized show-role mutation timeout default:
      - `MUTATION_BACKEND_TIMEOUT_MS` fallback changed from `25_000` to `60_000` in show roles proxy route.
    - Updated role mutation timeout test to assert `timed out after 60s`.
    - Fixed People admin page TypeScript handler mismatch by wrapping async tab refresh handlers:
      - `onClick={() => void fetchBravoVideos()}`
      - `onClick={() => void fetchBravoNews()}`
    - Updated reddit discovery matrix expectation to include `top_post_url` in episode matrix cell assertions.
  - Validation:
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web exec vitest run tests/show-cast-lazy-loading-wiring.test.ts tests/show-role-mutation-proxy-route.test.ts tests/show-cast-role-members-proxy-route.test.ts tests/show-roles-proxy-route.test.ts tests/show-cast-matrix-sync-proxy-route.test.ts tests/show-social-load-resilience-wiring.test.ts` (`6 files, 30 tests passed`)
    - `pnpm -C apps/web run test:ci` (`174 files, 695 tests passed`)
    - `pnpm -C apps/web exec next build --webpack` (pass)
    - `pnpm -C apps/web run lint` (pass with warnings only; no errors)

## Latest Update (2026-02-24) — Gallery reliability sweep (dedupe quality, broken filtering, pagination, section/filter alignment)

- February 24, 2026: Implemented the app-side gallery reliability pass for person/show/season admin media surfaces.
  - Files:
    - `apps/web/src/lib/server/trr-api/person-photo-utils.ts`
    - `apps/web/src/app/api/admin/trr-api/people/[personId]/photos/route.ts`
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
    - `apps/web/src/lib/admin/asset-sectioning.ts`
    - `apps/web/src/lib/gallery-filter-utils.ts`
    - `apps/web/src/lib/admin/paginated-gallery-fetch.ts` (new)
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - Tests:
      - `apps/web/tests/person-photo-dedupe-quality.test.ts` (new)
      - `apps/web/tests/person-gallery-broken-filter.test.ts` (new)
      - `apps/web/tests/show-gallery-pagination.test.ts` (new)
      - `apps/web/tests/season-gallery-pagination.test.ts` (new)
      - `apps/web/tests/asset-sectioning.test.ts`
      - `apps/web/tests/gallery-advanced-filtering.test.ts`
      - `apps/web/tests/person-gallery-thumbnail-wiring.test.ts`
  - Changes:
    - Person-photo dedupe now prioritizes renderability quality rather than hardcoding `media_links` precedence:
      - scores variant presence, fallback URL availability, hosted URL presence
      - retains stable tie-breaker (`media_links` then deterministic order).
    - Person photos API adds additive query support:
      - `include_broken=true|false` (default `false`) in `/api/admin/trr-api/people/[personId]/photos`.
    - Repository person-gallery shaping:
      - defaults to excluding `gallery_status=broken_unreachable`
      - supports `includeBroken` opt-in
      - normalizes media-link `url`/fallback from resolved source candidates (not raw nullable `source_url`).
    - Sectioning/filter alignment:
      - stricter profile picture classification (explicit profile signals only)
      - season promo content-type filtering enforced as OSA-only cast promos via section-classification gate.
    - Hidden truncation removal:
      - added paginated fetch helper (`limit=500` loops)
      - show and season gallery loads now page until exhausted (bounded by max-pages safeguard).
    - Season batch jobs now build targets from currently displayed filtered gallery buckets, with existing “no content types selected” guard preserved.
  - Validation:
    - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/person-photo-dedupe-quality.test.ts tests/person-gallery-broken-filter.test.ts tests/show-gallery-pagination.test.ts tests/season-gallery-pagination.test.ts tests/asset-sectioning.test.ts tests/gallery-advanced-filtering.test.ts tests/person-gallery-thumbnail-wiring.test.ts` (`7 files, 21 tests passed`)
  - Notes:
    - Workspace has many unrelated in-flight changes; this update is scoped to gallery reliability files listed above.

## Latest Update (2026-02-24) — 10 additional admin speed/efficiency fixes (post-hardening)

- February 24, 2026: Implemented the next 10 runtime improvements focused on admin responsiveness, reduced request fan-out, faster failure behavior, and short-TTL dedupe caching.
  - Files:
    - `apps/web/src/lib/server/auth.ts`
    - `apps/web/src/app/admin/trr-shows/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/roles/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/roles/[roleId]/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/cast-role-members/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/cast/[personId]/roles/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary/route.ts`
    - `apps/web/src/app/api/admin/covered-shows/route.ts`
    - `apps/web/src/app/api/admin/covered-shows/[showId]/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/route.ts`
    - `apps/web/src/lib/server/admin/route-response-cache.ts` (new shared short-TTL route cache)
    - Updated tests:
      - `apps/web/tests/covered-shows-route-metadata.test.ts`
      - `apps/web/tests/show-roles-proxy-route.test.ts`
      - `apps/web/tests/show-role-mutation-proxy-route.test.ts`
      - `apps/web/tests/show-cast-role-members-proxy-route.test.ts`
      - `apps/web/tests/show-cast-matrix-sync-proxy-route.test.ts`
      - `apps/web/tests/show-social-load-resilience-wiring.test.ts`
      - `apps/web/tests/social-season-hint-routes.test.ts`
  - Key changes by fix:
    - Dev bypass auth now short-circuits immediately for `dev-admin-bypass` in `requireAdmin(...)` without expensive verification fallback.
    - Show search now aborts stale in-flight requests via `AbortController`.
    - Show cast fetch now uses timeout + abort-safe behavior and cancels stale fetches when tab/show changes.
    - Show season-episode summary fan-out now uses bounded concurrency (`SEASON_EPISODE_SUMMARY_CONCURRENCY = 4`).
    - Summary fan-out now only runs on relevant tab state (`seasons`) instead of broad non-social behavior.
    - Season page no longer eagerly prefetches Bravo/Fandom supplemental data on initial load; Bravo video load is tab-lazy.
    - Season page collapses duplicate cast calls by using single `include_archive_only=true` fetch and deriving cast/archive subsets client-side.
    - Roles and cast-role-members proxy routes now use shorter default timeouts and retry-once envelopes.
    - Social `runs`/`runs/summary`/`analytics` routes support interactive-vs-background timeout profiles (interactive default = fast-fail).
    - Added tiny per-user short-TTL cache for read-heavy admin routes (`covered-shows`, `show seasons`, `show roles`, `cast-role-members`, social runs + summary), with cache invalidation on relevant mutations.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/covered-shows-route-metadata.test.ts tests/show-roles-proxy-route.test.ts tests/show-role-mutation-proxy-route.test.ts tests/show-cast-role-members-proxy-route.test.ts tests/show-cast-matrix-sync-proxy-route.test.ts tests/show-social-load-resilience-wiring.test.ts tests/social-season-hint-routes.test.ts tests/show-cast-lazy-loading-wiring.test.ts tests/season-cast-tab-quality-wiring.test.ts tests/covered-shows-page-no-fanout-wiring.test.ts` (`10 files, 51 tests passed`)
    - `pnpm -C apps/web exec tsc --noEmit --pretty false` currently fails on pre-existing unrelated typing drift in `apps/web/src/lib/server/admin/reddit-discovery-service.ts` (missing `successful_sorts/failed_sorts/rate_limited_sorts` and `top_post_url` fields).
  - Notes:
    - `show-cast-matrix-sync-proxy-route` intentionally logs an error in the fetch-failure test path; assertions still pass.

## Latest Update (2026-02-24) — Admin proxy host-routing hardening (API allowlist + strict API passthrough)

- February 24, 2026: Implemented the remaining admin host routing edge-case fixes in `apps/web` so API host allowlists and strict host mode behave as designed.
  - Files:
    - `apps/web/src/proxy.ts`
    - `apps/web/tests/admin-host-middleware.test.ts`
    - `apps/web/.env.example`
    - `apps/web/README.md`
  - Changes:
    - `proxy.ts` now separates host checks:
      - canonical admin UI host (`ADMIN_APP_ORIGIN`) for `/admin/*` redirects,
      - admin API allowlist (`ADMIN_APP_HOSTS` + origin host) for `/api/admin/*` gating.
    - Added allowlist parsing + resolution helpers in `proxy.ts` and retained loopback-equivalence matching.
    - Strict host mode (`ADMIN_STRICT_HOST_ROUTING=true`) now redirects only non-admin page routes on canonical admin host and explicitly passes through all `/api/*` routes (including `/api/session/*`).
    - Updated proxy tests to cover:
      - API allowlist pass on non-canonical host,
      - `/admin/*` canonical redirect even when host is API-allowlisted,
      - strict mode passthrough for `/api/session/login` and `/api/session/logout`,
      - strict mode redirect for non-admin pages still enforced.
    - Updated docs/env semantics:
      - `ADMIN_APP_HOSTS` documented as `/api/admin/*` allowlist.
      - strict mode documented as page-only redirect behavior (never `/api/*`).
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/admin-host-middleware.test.ts tests/server-auth-adapter.test.ts` (`2 files, 22 tests passed`)
    - `pnpm -C apps/web run lint` (pass with pre-existing warnings only)
    - `pnpm -C apps/web exec next build --webpack` fails on pre-existing unrelated type error in `apps/web/src/app/admin/trr-shows/[showId]/page.tsx:7915` (`failedMembers` on `never`).
    - `pnpm -C apps/web run test:ci` fails with pre-existing unrelated failures outside proxy scope (including `show-cast-lazy-loading-wiring`, `show-role-mutation-proxy-route`, `show-cast-role-members-proxy-route`, `show-roles-proxy-route`, `show-cast-matrix-sync-proxy-route`, `show-social-load-resilience-wiring`).

## Latest Update (2026-02-24) — Lightbox uncropped guarantee via hosted/original-first detail candidates

- February 24, 2026: Updated lightbox detail URL precedence to avoid stale crop-framed renders when uncropped hosted/original URLs are available.
  - Files:
    - `apps/web/src/lib/admin/image-url-candidates.ts`
    - `apps/web/tests/image-url-candidates.test.ts`
    - `apps/web/tests/person-gallery-detail-priority.test.ts`
  - Changes:
    - `buildDetailImageUrlCandidates(...)` order is now:
      - `hostedUrl -> originalUrl -> sourceUrl -> detailUrl -> cropDetailUrl`
    - This preserves crop-detail as last-resort fallback, while preferring uncropped mirrored/source framing for lightbox display.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/image-url-candidates.test.ts tests/person-gallery-detail-priority.test.ts tests/trr-shows-repository-person-crop-scope.test.ts` (`3 files, 8 tests passed`)

## Latest Update (2026-02-24) — Cast tab quality hardening (show + season)

- February 24, 2026: Implemented cast-tab reliability and UX hardening across show and season admin pages, focused on cancellation, timeout behavior, progressive integrity, and actionable retry states.
  - Files:
    - `apps/web/src/lib/admin/cast-refresh-orchestration.ts`
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/tests/show-cast-lazy-loading-wiring.test.ts`
    - `apps/web/tests/season-cast-tab-quality-wiring.test.ts` (new)
    - `apps/web/tests/cast-refresh-orchestration.test.ts`
  - Changes:
    - Added external abort-signal support to phased cast orchestration:
      - `runWithTimeout(...)` and `runPhasedCastRefresh(...)` now accept parent cancellation signals and fail fast on cancel.
    - Show cast refresh hardening:
      - threaded `AbortSignal` from phase runner through `refreshCastProfilesAndMedia -> refreshPersonImages` (stream + fallback),
      - cancellation now stops phase processing instead of silently counting canceled member operations as regular failures,
      - cast refresh success now clears phase panel state after completion to avoid stale completed pipeline UI,
      - network augmentation detection normalized with broader Bravo variants (`bravo`, `bravotv`, `bravo tv`),
      - added explicit Cancel action for top-level cast refresh/enrich workflows.
    - Show cast tab UX fixes:
      - cast progress bar is now cast-scoped only (no fallback to unrelated global refresh progress),
      - cast count chip now shows filtered/total semantics (`x/y cast`, `x/y crew`, `x/y visible`),
      - cast/crew cards were restructured to avoid invalid interactive nesting (buttons are no longer descendants of the card link).
    - Season cast tab hardening:
      - cast-role-members loader now uses timeout + retry and stale-snapshot warning behavior,
      - added warning + error retry cards for cast intelligence failures,
      - per-member season profile/media sync now runs with bounded concurrency (`3`) instead of strict serial execution,
      - per-member stream error handling now surfaces backend `error/detail` payload content,
      - added explicit Cancel action for season cast refresh,
      - season cast count chip now shows filtered/total semantics aligned with active filters.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/show-cast-lazy-loading-wiring.test.ts tests/season-cast-tab-quality-wiring.test.ts tests/cast-refresh-orchestration.test.ts` (`3 files, 21 tests passed`)
    - `pnpm -C apps/web exec vitest run tests/cast-episode-scope.test.ts tests/cast-role-season-filtering.test.ts tests/job-live-counts.test.ts tests/season-cast-route-fallback.test.ts tests/show-cast-role-members-proxy-route.test.ts` (`5 files, 22 tests passed`)
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/lib/admin/cast-refresh-orchestration.ts' 'tests/show-cast-lazy-loading-wiring.test.ts' 'tests/season-cast-tab-quality-wiring.test.ts' 'tests/cast-refresh-orchestration.test.ts'` (pass; 2 pre-existing `@next/next/no-img-element` warnings in `[showId]/page.tsx`)

## Latest Update (2026-02-24) — Reddit Community View URL simplification + season/period-aware episode refresh

- February 24, 2026: Implemented the Community View + episode-refresh workflow refactor in `apps/web` to remove verbose query coupling and make episode discovery season-period aware.
  - Files:
    - `apps/web/src/components/admin/reddit-sources-manager.tsx`
    - `apps/web/src/app/admin/social-media/reddit/communities/[communityId]/page.tsx`
    - `apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/refresh/route.ts`
    - `apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/save/route.ts`
    - `apps/web/src/lib/server/admin/reddit-discovery-service.ts`
    - `apps/web/tests/reddit-sources-manager.test.tsx`
    - `apps/web/tests/reddit-community-view-page.test.tsx`
    - `apps/web/tests/reddit-community-episode-refresh-route.test.ts`
    - `apps/web/tests/reddit-community-episode-save-route.test.ts`
    - `apps/web/tests/reddit-discovery-service.test.ts`
  - Changes:
    - Simplified community deep-linking to canonical `/admin/social-media/reddit/communities/[communityId]` with optional `return_to` only.
    - Community View page now runs in focused global mode and no longer depends on `show_id/show_name/season_id/season_number` query params.
    - Episode refresh now resolves context from community:
      - show resolved from community row,
      - season defaults to latest season unless explicit `season_id` / `season_number` provided,
      - optional `period_start` / `period_end` windows supported.
    - Episode discovery gating for non-show-focused communities now sources required flair gate from `analysis_all_flares` (not `episode_required_flares`).
    - Episode discovery service now enforces period-window filtering on `posted_at`.
    - Episode save now derives `trr_show_id` / `trr_show_name` from community server-side; legacy `show_id/show_name` payload remains accepted.
    - Reddit manager Episode Discussions UI now:
      - uses season selector (default latest) + period selector (default All Periods from analytics weekly windows),
      - sends `season_id`, `season_number`, `period_start`, `period_end` on refresh,
      - keeps episode title phrase editing,
      - removes editable Episode Required Flares UI and shows read-only helper that required flares come from `All Posts With Flair`.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/reddit-sources-manager.test.tsx tests/reddit-community-view-page.test.tsx tests/reddit-community-episode-refresh-route.test.ts tests/reddit-community-episode-save-route.test.ts tests/reddit-discovery-service.test.ts` (`5 files, 29 tests passed`)
    - `pnpm -C apps/web run lint` (pass with existing warnings only)
    - `pnpm -C apps/web exec next build --webpack` (fails on pre-existing unrelated type error in `apps/web/src/app/admin/trr-shows/[showId]/page.tsx:2740`)

## Latest Update (2026-02-24) — Final hardening pass for Bravo/Social admin stability

- February 24, 2026: Completed the final hardening pass for season/show social admin reliability with no backend contract changes.
  - Files:
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/src/lib/admin/show-admin-routes.ts`
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts`
    - `apps/web/tests/season-social-analytics-section.test.tsx`
    - `apps/web/tests/social-season-hint-routes.test.ts`
    - `apps/web/tests/show-social-load-resilience-wiring.test.ts`
    - `apps/web/tests/season-social-load-resilience-wiring.test.ts`
    - `apps/web/tests/social-week-detail-wiring.test.ts`
    - `apps/web/tests/show-admin-routes.test.ts`
  - Changes:
    - Fixed benchmark summary crash path by safely reading comparison delta values with null guards when benchmark payloads are partial.
    - Preserved social query context by narrowing legacy cleanup to true legacy keys only (`tab`, `assets`, `scope`), keeping `source_scope`, `social_platform`, `social_view`, and `season_id`.
    - Ensured jobs polling includes `season_id` so social jobs requests can use season hints and avoid fallback season lookups.
    - Standardized malformed `season_id` handling across core social routes (`runs`, `targets`, `analytics`) with consistent `400 BAD_REQUEST` responses.
    - Added timeout + abort protection to week detail data fetch and week polling (`runs`/`jobs`) to prevent indefinite hanging under backend slowness.
    - Decoupled supplemental season fetches (`Bravo`, `Fandom`) from the core load gate so social analytics can render even when optional fetches degrade.
    - Reduced social-tab overhead on show page by gating season-episode summary fanout outside social tab and batching failure reporting as warnings.
    - Hardened dev logo behavior by avoiding noisy remote logo fetches in non-production for repeated DNS failure cases.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx tests/social-season-hint-routes.test.ts tests/show-social-load-resilience-wiring.test.ts tests/season-social-load-resilience-wiring.test.ts` (`53 passed`)
    - `pnpm -C apps/web exec eslint src/components/admin/season-social-analytics-section.tsx src/lib/admin/show-admin-routes.ts 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts' tests/season-social-analytics-section.test.tsx tests/social-season-hint-routes.test.ts tests/show-social-load-resilience-wiring.test.ts tests/season-social-load-resilience-wiring.test.ts tests/social-week-detail-wiring.test.ts tests/show-admin-routes.test.ts` (pass with 2 pre-existing `@next/next/no-img-element` warnings in `[showId]/page.tsx`)
  - Notes:
    - Vitest still emits pre-existing `act(...)` warnings in the long-running social polling test path; all assertions pass.

## Latest Update (2026-02-24) — IMDb show/season lightbox metadata now reads tags.people/tags.titles/tags.image_type

- February 24, 2026: Updated season/show asset metadata mapping so IMDb-synced images display richer tags in lightbox and classify `Still Frame` as `Episode Still`.
  - Files:
    - `apps/web/src/lib/photo-metadata.ts`
    - `apps/web/tests/photo-metadata.test.ts`
  - Changes:
    - `mapSeasonAssetToMetadata(...)` now:
      - reads `imdbType` from `metadata.imdb_image_type` or fallback `metadata.tags.image_type`,
      - resolves people from:
        - `metadata.people_names` (existing)
        - fallback `metadata.tags.people[].name`,
      - resolves titles from:
        - `metadata.title_names` (new flattened backend field)
        - fallback `metadata.tags.titles[].title`
        - plus `showName` fallback (deduped).
    - This enables IMDb lightbox chips to reflect the actual People/Type/Titles tag payload instead of collapsing to show-only titles.
    - `Still Frame` now resolves through existing content-type inference as `EPISODE STILL` when delivered in `tags.image_type`.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/photo-metadata.test.ts` (`24 passed`)

## Latest Update (2026-02-24) — Networks detail stale-schema fallback + white variant visibility assertion

- February 24, 2026: Hardened networks/streaming detail retrieval against stale schema and validated white-logo visibility treatment.
  - Files:
    - `apps/web/src/lib/server/admin/networks-streaming-repository.ts`
    - `apps/web/tests/admin-network-detail-page.test.tsx`
    - `apps/web/tests/networks-streaming-repository.test.ts` (new)
  - Changes:
    - Added a table-existence precheck (`to_regclass`) before querying `admin.network_streaming_logo_assets`.
    - When the table is missing, detail fetch now degrades safely to `logo_assets: []` and emits a structured server warning rather than throwing.
    - Added a missing-relation fallback guard for race/stale-schema edge cases (`3F000` / `42P01` or relation-missing message).
    - Added UI test assertions confirming the White Variant card renders with a black container and light label text classes.
    - Added repository-level resilience test ensuring detail payload remains successful with empty `logo_assets` when the logo-assets table is unavailable.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/networks-streaming-detail-route.test.ts tests/admin-network-detail-page.test.tsx tests/networks-streaming-repository.test.ts` (`3 files, 8 tests passed`)
    - `pnpm -C apps/web exec tsc --noEmit` currently fails due to pre-existing unrelated errors in `src/components/admin/season-social-analytics-section.tsx` (`delta_pct` property typing).

## Latest Update (2026-02-24) — Person breadcrumb show crumb now clickable

- February 24, 2026: Updated person admin breadcrumbs so the show-name crumb routes back to the show page.
  - Files:
    - `apps/web/src/lib/admin/admin-breadcrumbs.ts`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/tests/admin-breadcrumbs.test.ts`
    - `apps/web/tests/person-credits-show-scope-wiring.test.ts`
  - Changes:
    - Extended `buildPersonBreadcrumb(...)` options with `showHref?: string | null`.
    - Breadcrumb behavior:
      - if `showName + showHref` are present, the show crumb is clickable.
      - if only `showName` is present, the show crumb remains plain text.
    - Person page now computes `breadcrumbShowHref` via `buildShowAdminUrl({ showSlug: backShowTarget })` and passes it into `buildPersonBreadcrumb(...)`.
    - This makes the show crumb (for example `The Real Housewives of Salt Lake City`) navigate to the show admin page, while person name remains current/non-clickable.
  - Validation:
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/admin-breadcrumbs.test.ts tests/person-credits-show-scope-wiring.test.ts` (`2 files, 6 tests passed`)
    - `pnpm -C apps/web run lint` (pass; warnings only, no errors)

## Latest Update (2026-02-24) — Shared admin breadcrumbs across dashboard pages

- February 24, 2026: Implemented a shared breadcrumb system across all concrete admin dashboard pages in TRR-APP (frontend-only).
  - Files:
    - `apps/web/src/components/admin/AdminBreadcrumbs.tsx` (new)
    - `apps/web/src/lib/admin/admin-breadcrumbs.ts` (new)
    - `apps/web/src/app/admin/page.tsx`
    - `apps/web/src/app/admin/dev-dashboard/page.tsx`
    - `apps/web/src/app/admin/fonts/page.tsx`
    - `apps/web/src/app/admin/games/page.tsx`
    - `apps/web/src/app/admin/groups/page.tsx`
    - `apps/web/src/app/admin/networks/page.tsx`
    - `apps/web/src/app/admin/networks/[entityType]/[entitySlug]/page.tsx`
    - `apps/web/src/app/admin/scrape-images/page.tsx`
    - `apps/web/src/app/admin/settings/page.tsx`
    - `apps/web/src/app/admin/shows/page.tsx`
    - `apps/web/src/app/admin/social-media/page.tsx`
    - `apps/web/src/app/admin/social-media/bravo-content/page.tsx`
    - `apps/web/src/app/admin/social-media/creator-content/page.tsx`
    - `apps/web/src/app/admin/social-media/reddit/communities/[communityId]/page.tsx`
    - `apps/web/src/app/admin/survey-responses/page.tsx`
    - `apps/web/src/app/admin/surveys/page.tsx`
    - `apps/web/src/app/admin/surveys/[surveyKey]/page.tsx`
    - `apps/web/src/app/admin/surveys/normalized/page.tsx`
    - `apps/web/src/app/admin/surveys/normalized/[surveySlug]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/src/app/admin/users/page.tsx`
    - `apps/web/tests/admin-breadcrumbs.test.ts` (new)
    - `apps/web/tests/admin-breadcrumbs-component.test.tsx` (new)
    - `apps/web/tests/admin-networks-page-auth.test.tsx`
  - Changes:
    - Added reusable `AdminBreadcrumbs` component with:
      - semantic `<nav aria-label="Breadcrumb">`
      - clickable ancestor crumbs
      - non-link current crumb
    - Added pure breadcrumb helper/builders (`admin-breadcrumbs.ts`) for:
      - slug and person-slug humanization
      - root/section breadcrumbs
      - dynamic builders for network detail, show/season/person/week paths, and survey detail paths
    - Replaced hardcoded `Admin / ...` header labels with shared breadcrumbs across all concrete admin pages.
    - Preserved existing action/back buttons for UX continuity except where explicitly replaced.
    - Person page request follow-up:
      - replaced the header `Back to Show` control with breadcrumb path rendering (`Admin / Shows / <Show> / <Person>`).
  - Validation:
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/admin-breadcrumbs.test.ts tests/admin-breadcrumbs-component.test.tsx tests/admin-networks-page-auth.test.tsx tests/admin-network-detail-page-auth.test.tsx` (`4 files, 13 tests passed`)
    - `pnpm -C apps/web run lint` (pass; warnings only, no errors)
  - Notes:
    - Alias-only admin passthrough route files were not intentionally changed for breadcrumb rendering.
    - Optional full confidence suite (`test:ci`) not run in this session.

## Latest Update (2026-02-24) — Show/season tab reorder + featured poster/backdrop lightbox actions

- February 24, 2026: Implemented admin show/season navigation reorder and featured show-image selection from the show assets lightbox (TRR-APP only).
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/components/admin/ImageLightbox.tsx`
    - `apps/web/src/lib/admin/show-admin-routes.ts`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/[showSection]/[seasonTab]/page.tsx`
    - `apps/web/tests/show-admin-routes.test.ts`
    - `apps/web/tests/season-tab-alias-redirect.test.ts`
    - `apps/web/tests/show-page-tab-order-wiring.test.ts` (new)
    - `apps/web/tests/season-page-tab-order-wiring.test.ts` (new)
    - `apps/web/tests/show-featured-image-lightbox-wiring.test.ts` (new)
  - Changes:
    - Reordered show tabs to: `Overview, Seasons, Assets, News, Cast, Surveys, Social, Settings`.
    - Added show-level featured image support in assets lightbox:
      - new lightbox management actions: `Set as Featured Poster` / `Set as Featured Backdrop`.
      - stateful labels: `Featured Poster` / `Featured Backdrop`.
      - strict eligibility: only `origin_table === "show_images"` and matching `kind` (`poster` / `backdrop`).
      - non-eligible assets surface explicit disabled reasons.
      - show cards now display a `Featured` badge for the selected poster/backdrop assets.
    - Added show update action in page state:
      - `setFeaturedShowImage(kind, showImageId)` -> `PUT /api/admin/trr-api/shows/[showId]` with `primary_poster_image_id` or `primary_backdrop_image_id`.
      - local show state refreshes from returned `show` payload.
    - Converted season canonical tab from `details` -> `overview`:
      - `SeasonAdminTab` now uses `overview` canonical.
      - defaults now resolve to `overview`.
      - `buildSeasonAdminUrl(...)` now treats `overview` as base `/seasons/{n}` (no `tab` query).
      - legacy `details` path/query aliases normalize to `overview`.
    - Updated season tab order to:
      - `Overview, Seasons & Episodes, Assets, Videos, Fandom, Cast, Surveys, Social Media`.
    - Updated show-page season deep-link chip tabs to match season page order and include `Fandom`.
    - Updated season tab alias redirect route:
      - added support for `overview` and `fandom`.
      - legacy `/season-x/details` now redirects with `tab=overview`.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/show-admin-routes.test.ts tests/season-tab-alias-redirect.test.ts tests/show-page-tab-order-wiring.test.ts tests/season-page-tab-order-wiring.test.ts tests/show-featured-image-lightbox-wiring.test.ts` (`5 files, 19 tests passed`)
    - `pnpm -C apps/web exec eslint src/lib/admin/show-admin-routes.ts 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' src/components/admin/ImageLightbox.tsx` (pass; 2 pre-existing `@next/next/no-img-element` warnings in show page)
    - `pnpm -C apps/web exec eslint tests/show-admin-routes.test.ts tests/season-tab-alias-redirect.test.ts tests/show-page-tab-order-wiring.test.ts tests/season-page-tab-order-wiring.test.ts tests/show-featured-image-lightbox-wiring.test.ts` (pass)

## Latest Update (2026-02-24) — Auto-Crop UI wiring + no-stretch person cards

- February 24, 2026: Reworked gallery resize behavior to run preview auto-crop flows and removed stretch-prone person card rendering.
  - Files:
    - `apps/web/src/components/admin/ImageLightbox.tsx`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/tests/person-gallery-thumbnail-wiring.test.ts`
    - `apps/web/tests/person-autocrop-wiring.test.ts` (new)
    - `apps/web/tests/show-autocrop-wiring.test.ts` (new)
    - `apps/web/tests/season-autocrop-wiring.test.ts` (new)
    - `apps/web/tests/image-lightbox-metadata.test.tsx`
  - Changes:
    - Renamed user-facing `Resize` action labels to `Auto-Crop` and updated tooltip copy to clarify preview-only behavior.
    - Person gallery lightbox auto-crop now runs:
      - optional count refresh,
      - base variants rebuild,
      - crop variants rebuild with detected or fallback crop payload.
    - Person gallery card rendering now always uses non-distorting `object-cover` semantics; removed exact viewport scaling branch that could introduce stretched tiles.
    - Show and season single-image refresh pipeline now always runs `Variants (Auto-Crop)` after base variants using:
      - manual/auto thumbnail crop when present,
      - center fallback payload when not present.
    - Star ON triggers non-blocking preview auto-crop variant rebuild for show/season/person gallery assets.
    - Facebank Seed ON triggers non-blocking preview auto-crop variant rebuild on person gallery.
    - Batch operation display label updated to `Auto-Crop` for `resize`.
  - Validation:
    - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/person-gallery-thumbnail-wiring.test.ts tests/person-autocrop-wiring.test.ts tests/show-autocrop-wiring.test.ts tests/season-autocrop-wiring.test.ts tests/image-lightbox-metadata.test.tsx` (`5 files passed, 16 tests passed`)

## Latest Update (2026-02-24) — Proxy migration + admin networks acceptance sweep

- February 24, 2026: Completed Next 16 middleware deprecation cleanup and validation sweep for admin networks detail routing.
  - Files:
    - `apps/web/src/proxy.ts` (new)
    - `apps/web/src/middleware.ts` (deleted)
    - `apps/web/tests/admin-host-middleware.test.ts`
    - `apps/web/src/app/admin/trr-shows/people/%5BpersonId%5D/page.tsx` (deleted previously; empty duplicate path cleanup)
  - Changes:
    - Migrated host-routing logic from `middleware.ts` to Next 16 `proxy.ts` convention.
    - Updated host-routing tests to import and call `proxy(...)`.
    - Removed empty encoded duplicate person route directory content (`%5BpersonId%5D`) to prevent route scan confusion.
  - Manual acceptance evidence:
    - Browser route checks via Chrome DevTools MCP:
      - `http://admin.localhost:3000/admin/networks` loads.
      - `http://admin.localhost:3000/admin/networks/network/bravo` loads and renders breadcrumbs/heading route correctly.
    - Full row-level browser verification was auth-gated in this MCP session (UI displayed `Not authenticated` without interactive Google sign-in).
    - Live API parity check (dev admin bypass header) confirmed detail list consistency for Bravo:
      - summary `added_show_count = 9`,
      - detail `shows.length = 9`,
      - detail show IDs are a subset of `/api/admin/covered-shows` IDs (no misses).
  - Validation:
    - `pnpm -C apps/web run test:ci` (`137 files, 541 tests passed`)
    - `pnpm -C apps/web exec vitest run tests/admin-host-middleware.test.ts tests/admin-networks-page-auth.test.tsx tests/admin-network-detail-page-auth.test.tsx tests/networks-streaming-detail-route.test.ts` (`19 passed`)
    - `pnpm -C apps/web exec next build --webpack` (pass; middleware deprecation warning removed)

## Latest Update (2026-02-24) — Next build unblocked by removing accidental encoded person route file

- February 24, 2026: Fixed production build failure caused by an accidental duplicate URL-encoded admin person route file.
  - Files:
    - `apps/web/src/app/admin/trr-shows/people/%5BpersonId%5D/page.tsx` (deleted)
  - Root cause:
    - A zero-byte encoded route file was present and picked up by Next TypeScript route scanning.
    - Build error: `is not a module`.
  - Changes:
    - Deleted the duplicate empty file under `%5BpersonId%5D`; canonical route remains under `[personId]`.
  - Validation:
    - `pnpm -C apps/web exec next build --webpack` (pass)

## Latest Update (2026-02-24) — Social live-update retry + cloud transport error stabilization

- February 24, 2026: Stabilized social landing/ingest behavior around transient backend and Supabase pooler faults, without changing API contracts.
  - Files:
    - `apps/web/src/lib/server/trr-api/social-admin-proxy.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts`
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/tests/social-admin-proxy.test.ts`
    - `apps/web/tests/social-ingest-route.test.ts` (new)
    - `apps/web/tests/season-social-analytics-section.test.tsx`
  - Root causes:
    - Ingest proxy route did not forward `season_id`, forcing avoidable season lookup DB hops in TRR-APP.
    - Proxy error normalization treated DNS/SSL transport details from upstream as generic 500 upstream errors.
    - Polling banner switched to retry state on first poll-cycle failure, increasing false alarm noise under transient conditions.
  - Changes:
    - Added `season_id` parsing/validation + forwarding to ingest route (`seasonIdHint`) and updated ingest client URL to always include `season_id`.
    - Increased poll-path timeout envelopes:
      - client: `runs/jobs` -> `15_000`, `analytics` -> `22_000`
      - proxy routes: runs `15_000`, analytics `22_000`, retries remain `0`.
    - Added consecutive poll-failure threshold in social section:
      - show `retrying` banner only after 2 consecutive failures, reset on successful poll.
    - Normalized upstream DNS/SSL detail payloads in proxy to retryable `BACKEND_UNREACHABLE` classification while preserving existing error body shape.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/social-admin-proxy.test.ts tests/social-ingest-route.test.ts tests/season-social-analytics-section.test.tsx` (`33 passed`)
    - `pnpm -C apps/web exec eslint src/components/admin/season-social-analytics-section.tsx src/lib/server/trr-api/social-admin-proxy.ts 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts' tests/social-admin-proxy.test.ts tests/social-ingest-route.test.ts tests/season-social-analytics-section.test.tsx` (pass)

## Latest Update (2026-02-24) — Networks/Streaming detail pages linked from admin table

- February 24, 2026: Implemented network/streaming entity detail pages and linked them from `/admin/networks`.
  - Files:
    - `apps/web/src/lib/admin/networks-streaming-entity.ts` (new)
    - `apps/web/src/lib/server/admin/networks-streaming-repository.ts`
    - `apps/web/src/app/api/admin/networks-streaming/detail/route.ts` (new)
    - `apps/web/src/app/admin/networks/[entityType]/[entitySlug]/page.tsx` (new)
    - `apps/web/src/app/admin/networks/page.tsx`
    - `apps/web/tests/admin-networks-page-auth.test.tsx`
    - `apps/web/tests/networks-streaming-detail-route.test.ts` (new)
    - `apps/web/tests/admin-network-detail-page-auth.test.tsx` (new)
  - Changes:
    - Added shared helpers for entity key normalization, slug generation, and entity-type parsing.
    - Hyperlinked `Network / Streaming Service` names on `/admin/networks` to:
      - `/admin/networks/network/<slug>`
      - `/admin/networks/streaming/<slug>`
    - Added `GET /api/admin/networks-streaming/detail` with admin auth + request validation:
      - requires `entity_type` and one of `entity_key`/`entity_slug`.
      - returns `404` when entity is not found.
    - Added repository detail query path:
      - resolves canonical entity from summary-consistent grouping logic,
      - merges core metadata (`core.networks` / `core.watch_providers`),
      - merges active override (`admin.network_streaming_overrides`),
      - merges completion status (`admin.network_streaming_completion`),
      - returns added-shows list only (`admin.covered_shows`) with canonical show slug + poster.
    - Added shared client detail page UI with:
      - breadcrumbs,
      - saved logo section (color/black/white + override URL list),
      - saved metadata/URLs section,
      - added-shows table linked to show admin pages,
      - canonical slug correction via `router.replace(...)` when needed.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/admin-networks-page-auth.test.tsx tests/networks-streaming-detail-route.test.ts tests/admin-network-detail-page-auth.test.tsx` (`12 passed`)
    - `pnpm -C apps/web run lint` (pass; warnings only, no errors)
    - `pnpm -C apps/web exec next build --webpack` (fails due pre-existing unrelated file: `src/app/admin/trr-shows/people/%5BpersonId%5D/page.tsx` is not a module)

## Latest Update (2026-02-24) — Admin host-enforcement default parity fix for covered shows

- February 24, 2026: Resolved local `forbidden` responses on `/api/admin/*` (observed via `/admin/trr-shows` covered-shows fetch) by aligning `requireAdmin(...)` default host-enforcement behavior with middleware.
  - Files:
    - `apps/web/src/lib/server/auth.ts`
    - `apps/web/tests/server-auth-adapter.test.ts`
  - Root cause:
    - `middleware.ts` defaulted `ADMIN_ENFORCE_HOST` to production-only enforcement when unset.
    - `lib/server/auth.ts` defaulted host enforcement to enabled for all non-test environments when unset.
    - In local dev with no explicit `ADMIN_ENFORCE_HOST`/`ADMIN_APP_HOSTS`, API route auth could reject requests with `forbidden`.
  - Changes:
    - Updated `isAdminHostEnforced()` fallback in `auth.ts` from `process.env.NODE_ENV !== "test"` to `process.env.NODE_ENV === "production"`.
    - Preserved explicit env override behavior (`ADMIN_ENFORCE_HOST=true|false`) and existing allowlist semantics.
    - Added regression tests in `server-auth-adapter.test.ts`:
      - host enforcement defaults OFF in development when `ADMIN_ENFORCE_HOST` is unset.
      - host enforcement defaults ON in production when `ADMIN_ENFORCE_HOST` is unset.
      - existing strict-host tests (`ADMIN_ENFORCE_HOST=true`) remain intact.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/server-auth-adapter.test.ts tests/admin-host-middleware.test.ts` (`18 passed`)
    - `pnpm -C apps/web exec eslint src/lib/server/auth.ts tests/server-auth-adapter.test.ts` (pass)

## Latest Update (2026-02-24) — Show container accordion behavior for person credits

- February 24, 2026: Updated person credits interaction so show containers are clickable first, with season accordions and episode rows nested beneath.
  - Files:
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - Changes:
    - Made each show section (`current scoped show` and grouped other shows) render as collapsible containers.
    - Current show container now opens to role blocks with season-level accordions (`Season X • N episodes`) and episode title rows.
    - Other-show containers now expand to their summary rows.
    - Preserved cast/crew separation, role integrity, and existing null-role `Self` suppression behavior.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/person-credits-show-scope-wiring.test.ts tests/person-credits-route.test.ts` (`7 passed`)
    - `pnpm -C apps/web run lint` (pass; warnings only, no errors)

## Latest Update (2026-02-24) — Credits subsection labels replaced by show names

- February 24, 2026: Updated show-scoped person credits layout to remove static `Current Show`/`Other Shows` subsection labels and render show-name headings directly under Cast/Crew.
  - Files:
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/tests/person-credits-show-scope-wiring.test.ts`
  - Changes:
    - Replaced `Current Show` heading with the actual scoped show name (`show_scope.show_name` fallback to `Unknown Show`).
    - Grouped `other_show_credits` summaries by show and rendered each show name as its own subsection in both Cast and Crew.
    - Preserved current-show season/episode accordion behavior and existing cast/crew classification + null-role suppression for other-show `Self` rows.
    - Removed UI dependency on literal `Current Show`/`Other Shows` subsection titles in wiring tests.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/person-credits-show-scope-wiring.test.ts tests/person-credits-route.test.ts` (`7 passed`)
    - `pnpm -C apps/web run lint` (pass; warnings only, no errors)

## Latest Update (2026-02-24) — Person credits cast/crew-only integration for other shows

- February 24, 2026: Integrated other-show credits into cast/crew sections on show-scoped person credits (no standalone top-level `Other Shows` block).
  - Files:
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/tests/person-credits-show-scope-wiring.test.ts`
  - Changes:
    - Added UI-side partitioning for `show_scope.other_show_credits`:
      - Cast: `credit_category === "Self"` (case-insensitive).
      - Crew: all non-`Self`.
    - Added per-show suppression for blank-role `Self` rows in other-show summaries:
      - suppress when the same show has at least one explicit cast role (`Self` + non-blank role).
      - retain blank-role `Self` rows when no explicit cast role exists for that show.
    - Kept current-show cast/crew accordion behavior unchanged (`role -> season -> episodes`).
    - Rendered `Current Show` and `Other Shows` subsections inside both `Cast Credits` and `Crew Credits`.
    - Removed standalone top-level `Other Shows` section from the show-scoped credits tab.
    - Kept route/API contract unchanged (`credits` and `show_scope` shape unchanged).
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/person-credits-show-scope-wiring.test.ts tests/person-credits-route.test.ts tests/trr-shows-repository-person-episode-credits.test.ts` (`9 passed`)
    - `pnpm -C apps/web run test:ci` (`130 files, 503 tests passed`)
    - `pnpm -C apps/web run lint` (pass; warnings only, no errors)

## Latest Update (2026-02-23) — Local bypass guard hardening

- February 23, 2026: Suppressed null-role `Self` cast inflation when explicit cast roles exist in show-scoped person credits.
  - Files:
    - `apps/web/src/app/api/admin/trr-api/people/[personId]/credits/route.ts`
    - `apps/web/tests/person-credits-route.test.ts`
  - Changes:
    - Added explicit-cast-role detection (`Self` + non-blank role) per show scope.
    - Added `isBlankRole(...)` helper and suppression rule:
      - suppress `Self` + blank role only when explicit cast role exists.
      - keep null-role `Self` when no explicit cast role exists.
    - Preserved response contract (`credits` and `show_scope` shape unchanged).
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/person-credits-route.test.ts` (`6 passed`)

- February 23, 2026: Implemented person credits show-scoped cast/crew accordion with season-first episode drilldown and role-preserving grouping.
  - Files:
    - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
    - `apps/web/src/app/api/admin/trr-api/people/[personId]/credits/route.ts`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/tests/person-credits-route.test.ts` (new)
    - `apps/web/tests/trr-shows-repository-person-episode-credits.test.ts` (new)
    - `apps/web/tests/person-credits-show-scope-wiring.test.ts` (new)
  - Changes:
    - Added repository query helper `getEpisodeCreditsByPersonShowId(...)` backed by `core.v_episode_credits`, defaulting to exclude `archive_footage`.
    - Extended people credits API route to accept optional `showId` and return additive `show_scope` payload while preserving legacy `credits` array contract.
    - `show_scope` includes:
      - `cast_groups` / `crew_groups` (role-separated, season-grouped, episode lists)
      - `cast_non_episodic` / `crew_non_episodic`
      - `other_show_credits`
    - Updated person credits tab UI to:
      - show nested accordions (`credit group -> season -> episodes`) for show-scoped credits
      - keep cast classification strict to `credit_category === "Self"` (case-insensitive)
      - render non-episodic crew/cast fallback rows
      - render “Other Shows” summary list
      - retain legacy flat credits list when `show_scope` is absent.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/person-credits-route.test.ts tests/trr-shows-repository-person-episode-credits.test.ts tests/person-credits-show-scope-wiring.test.ts` (`6 passed`)
    - `pnpm -C apps/web run lint` (pass; warnings only, no errors)
    - `pnpm -C apps/web run test:ci` (`130 files, 500 tests passed`)

- February 23, 2026: Implemented Bravo cast-only preview as canonical `/people/*` probe diagnostics with rich profile cards, explicit missing/error statuses, and cast-only payload wiring.
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/tests/show-bravo-cast-only-wiring.test.ts`
    - `apps/web/tests/show-bravo-cast-only-preview-details.test.ts` (new)
  - Changes:
    - Preview payload now sends explicit cast-only intent:
      - `cast_only: selectedMode === "cast-only"`.
    - Preview response handling now parses and stores:
      - `person_candidate_results`
      - optional additive counters (`bravo_candidates_tested`, `bravo_candidates_valid`, `bravo_candidates_missing`, `bravo_candidates_errors`) with local fallback derivation.
    - Cast-only step-1 preview UI now shows:
      - probe summary (`tested/valid/missing/error`)
      - valid profile cards with `name`, canonical URL, hero image thumbnail, bio excerpt, and social links/handles
      - explicit missing/error list with status badges and reason text when present.
    - Cast-only confirm step now includes probe summary and uses valid profile count for “Cast Members Being Synced”.
    - Preview-to-confirm gating now allows cast-only flows that only return candidate probe results (supports missing-only runs that still persist N/A markers on commit).
    - Updated wiring test expectations to current UI labels and ensured both preview/commit cast-only payload assertions.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/show-bravo-cast-only-wiring.test.ts tests/show-bravo-cast-only-preview-details.test.ts tests/show-cast-lazy-loading-wiring.test.ts` (`10 passed`)
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' tests/show-bravo-cast-only-wiring.test.ts tests/show-bravo-cast-only-preview-details.test.ts` (pass; pre-existing `@next/next/no-img-element` warnings only)

- February 23, 2026: Hardened local admin bypass guard so social admin pages do not intermittently fail with section-level `Not authenticated` when bypass env flags are missing/mis-set.
  - Files:
    - `apps/web/src/lib/admin/useAdminGuard.ts`
    - `apps/web/tests/use-admin-guard-stability.test.tsx`
  - Root cause:
    - `useAdminGuard` bypass branch relied only on `isDevAdminBypassEnabledClient()`.
    - In local sessions where env bypass resolution is false/unstable, guard could skip bypass even on local hosts and downstream admin data fetches surfaced `Not authenticated`.
  - Changes:
    - Added local-host fallback in `useAdminGuard` bypass decision:
      - use bypass when either explicit bypass helper is enabled **or** hostname is local via `isLocalDevHostname(window.location.hostname)`.
    - Preserved existing bypass behavior:
      - non-null shim user when Firebase user is absent,
      - auth-state subscription updates when Firebase user appears,
      - bounded `authStateReady` fallback timing.
    - Added regression test proving fallback path:
      - bypass helper disabled + local-host detection true still yields `checking=0`, `hasAccess=1`, `user-present=1`.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/use-admin-guard-stability.test.tsx tests/admin-client-auth.test.ts` (`20 passed`)
    - `pnpm -C apps/web exec eslint src/lib/admin/useAdminGuard.ts tests/use-admin-guard-stability.test.tsx` (pass)

- February 20, 2026: Updated Sync by Bravo mode picker to always prompt for sync scope and renamed options for clarity.
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Changes:
    - `Sync by Bravo` now always opens the mode picker.
    - Picker option labels are now:
      - `Sync All Info`
      - `Cast Info only`
    - Confirm-step action labels now mirror those names:
      - `Sync All Info`
      - `Sync Cast Info only`
    - Cast mode heading copy updated from `Cast Only` to `Cast Info only`.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (pass; warnings only, no errors).

- February 20, 2026: Implemented unified admin origin isolation for local dev (`admin.localhost`) with host-gated admin auth and stable transient-auth UX.
  - Files:
    - `apps/web/src/middleware.ts` (new)
    - `apps/web/src/lib/server/auth.ts`
    - `apps/web/src/lib/admin/dev-admin-bypass.ts`
    - `apps/web/src/lib/admin/useAdminGuard.ts`
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/.env.example`
    - `apps/web/README.md`
    - `apps/web/tests/admin-host-middleware.test.ts` (new)
    - `apps/web/tests/server-auth-adapter.test.ts`
    - `apps/web/tests/use-admin-guard-stability.test.tsx`
    - `apps/web/tests/dev-admin-bypass.test.ts`
  - Changes:
    - Added host-routing middleware behavior:
      - `/admin/*` on non-admin host -> `307` redirect to `ADMIN_APP_ORIGIN` preserving path/query.
      - `/api/admin/*` on non-admin host -> `403`.
      - optional strict host mode (`ADMIN_STRICT_HOST_ROUTING=true`) redirects non-admin paths on admin host to `/admin`.
    - Added server-side host gate in `requireAdmin(...)` using `ADMIN_APP_HOSTS` (+ `ADMIN_APP_ORIGIN` host), fail-closed when host is disallowed.
    - Added loopback-host equivalence handling (`localhost`, `127.0.0.1`, `[::1]`, `::1`) for reliable local admin enforcement across URL/host normalizations.
    - Updated dev bypass hostname detection to include `*.localhost`.
    - Stabilized `useAdminGuard` transient unauth handling to avoid flipping back into blocking full-page loading during grace-window recovery.
    - Reduced one auth-churn refetch trigger in show admin page by removing raw `user` dependency from slug-resolution effect.
    - Updated admin-host env/docs defaults to:
      - `ADMIN_APP_ORIGIN=http://admin.localhost:3000`
      - `ADMIN_APP_HOSTS=admin.localhost,localhost,127.0.0.1,[::1]`
      - `ADMIN_ENFORCE_HOST=true`
      - `ADMIN_STRICT_HOST_ROUTING=false`
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/admin-host-middleware.test.ts tests/server-auth-adapter.test.ts tests/use-admin-guard-stability.test.tsx tests/dev-admin-bypass.test.ts` (`4 files, 29 tests passed`)
    - `pnpm -C apps/web run lint` (pass; warnings only, no errors)
    - `pnpm -C apps/web exec next build --webpack` (pass; Next warning: `middleware` convention deprecated in favor of `proxy`)
    - `pnpm -C apps/web run test:ci` (`124 files, 469 tests passed`)

## Latest Update (2026-02-19) — Admin deep-link hard refresh rendering

- February 19, 2026: Fixed hard-entry admin deep-link render stall on localhost (`/admin/trr-shows/{slug}` showing shell-only UI instead of admin content).
  - Files:
    - `apps/web/src/lib/admin/useAdminGuard.ts`
    - `apps/web/tests/use-admin-guard-stability.test.tsx`
  - Root cause:
    - `useAdminGuard` dev-bypass branch (`isDevAdminBypassEnabledClient()`) took a one-time `auth.currentUser` snapshot and returned early.
    - On hard refresh, Firebase often emits `currentUser = null` before hydration completes; guard set `hasAccess=true`, `checking=false`, and `user=null`, then never subscribed for later auth recovery.
    - Admin pages that gate on `!user || !hasAccess` rendered `null`, leaving only shared shell/sidebar visible at admin URL.
  - Changes:
    - Dev-bypass path now:
      - subscribes to `auth.onAuthStateChanged(...)`,
      - applies later auth emissions to `user`/`userKey`,
      - keeps bounded readiness fallback via existing `NEXT_PUBLIC_ADMIN_AUTH_READY_TIMEOUT_MS` logic,
      - preserves bypass access semantics (`hasAccess=true`).
    - Added regression test ensuring bypass mode recovers from initial `null` user to authenticated user emission without redirect.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/use-admin-guard-stability.test.tsx` (`10 passed`)
    - `pnpm -C apps/web exec eslint src/lib/admin/useAdminGuard.ts tests/use-admin-guard-stability.test.tsx` (pass)
    - Chrome DevTools MCP manual validation:
      - Hard reload of `http://localhost:3000/admin/trr-shows/the-real-housewives-of-salt-lake-city` now renders full admin page (breadcrumbs, `Sync by Bravo`, tabs), not shell-only content.

## Latest Update (2026-02-19) — Docker footprint docs

- February 19, 2026: Clarified stale local-only Screenalytics env setting.
  - File:
    - `apps/web/.env.local`
  - Change:
    - Commented `SCREENALYTICS_API_URL=http://127.0.0.1:8888` and documented it as unused for TRR-APP runtime.
    - Runtime backend routing remains driven by `TRR_API_URL`.

## Latest Update (2026-02-19)

- February 19, 2026: Fixed `canSyncByBravo` TDZ crash in show admin page Sync by Bravo flow.
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Changes:
    - Resolved runtime `ReferenceError: Cannot access 'canSyncByBravo' before initialization` by moving Sync-by-Bravo readiness derivations (`syncedSeasonCount`, `syncedEpisodeCount`, `syncedCastCount`, `syncBravoReadinessIssues`, `canSyncByBravo`, `syncBravoReadinessMessage`) above `startSyncBravoFlow` hook initialization.
    - Kept behavior unchanged otherwise; removed duplicate late declarations in render section.
  - Validation:
    - `pnpm -C TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (pass; pre-existing `@next/next/no-img-element` warnings only)
    - `pnpm -C TRR-APP/apps/web exec vitest run tests/show-bravo-cast-only-wiring.test.ts` (`2 passed`)

- February 19, 2026: Fixed multi-tab admin loading stalls by bounding client auth readiness waits and decoupling guard completion from `authStateReady`.
  - Files:
    - `apps/web/src/lib/admin/client-auth.ts`
    - `apps/web/src/lib/admin/useAdminGuard.ts`
    - `apps/web/tests/admin-client-auth.test.ts`
    - `apps/web/tests/use-admin-guard-stability.test.tsx`
  - Changes:
    - Added bounded Firebase auth readiness wait in `getClientAuthHeaders(...)` using `NEXT_PUBLIC_ADMIN_AUTH_READY_TIMEOUT_MS` (default `2500ms`) so admin token retrieval cannot block indefinitely.
    - Preserved fail-closed behavior (`Not authenticated`) and existing token retry/refresh semantics.
    - Updated `useAdminGuard` so first `onAuthStateChanged` emission can clear `checking` even if `authStateReady` is delayed.
    - Added bounded guard fallback timer (same env/default timeout) so redirect decisions (`/` and `/hub`) still complete when readiness is slow.
    - Added regression coverage for:
      - unresolved `authStateReady` + admin emission,
      - slow `authStateReady` + unauth redirect fallback,
      - readiness timeout + token success,
      - readiness timeout + deterministic unauth failure.
  - Validation:
    - `pnpm -C TRR-APP/apps/web exec vitest run tests/use-admin-guard-stability.test.tsx tests/admin-client-auth.test.ts` (`15 passed`)
    - `pnpm -C TRR-APP/apps/web exec eslint src/lib/admin/useAdminGuard.ts src/lib/admin/client-auth.ts tests/use-admin-guard-stability.test.tsx tests/admin-client-auth.test.ts` (pass)
    - Manual browser validation for dual-tab `/admin/fonts` + show social route not executed in this session.

- February 19, 2026: Implemented admin multi-tab auth stabilization across shared auth primitives, guard redirect behavior, and admin surfaces.
  - Files:
    - `apps/web/src/lib/admin/client-auth.ts`
    - `apps/web/src/lib/admin/useAdminGuard.ts`
    - `apps/web/src/app/admin/networks/page.tsx`
    - `apps/web/src/app/admin/surveys/page.tsx`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/src/components/admin/ImageScrapeDrawer.tsx`
    - `apps/web/src/components/admin/ShowBrandEditor.tsx`
    - `apps/web/src/components/admin/SurveyQuestionsEditor.tsx`
    - `apps/web/src/components/admin/reddit-sources-manager.tsx`
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/tests/admin-client-auth.test.ts` (new)
    - `apps/web/tests/use-admin-guard-stability.test.tsx`
    - `apps/web/tests/admin-networks-page-auth.test.tsx`
    - `apps/web/tests/admin-surveys-userkey-fetch-stability.test.tsx`
  - Changes:
    - Added resilient client auth token retrieval with retry/backoff and preferred-user support.
    - Added shared authenticated admin fetch wrapper behavior for retry-on-`401/403` plus forced-refresh retry path.
    - Stabilized `useAdminGuard` against transient post-auth null emissions via 2500ms grace window and single redirect behavior.
    - Removed direct `auth.currentUser?.getIdToken()` usage in targeted admin routes/components and routed through shared auth helpers.
    - Preserved dev admin bypass behavior for TRR show/season/person admin flows.
    - Stabilized surveys page fetch identity behavior by keying on `userKey` and storing preferred user in a ref (prevents unnecessary refetches on equivalent auth emissions).
    - Updated admin tests for recovery-first auth behavior and added dedicated helper coverage.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/admin-client-auth.test.ts tests/use-admin-guard-stability.test.tsx tests/admin-networks-page-auth.test.tsx tests/admin-surveys-userkey-fetch-stability.test.tsx` (`15 passed`)
    - `pnpm -C apps/web run lint` (pass; warnings only, no errors)
    - `pnpm -C apps/web exec next build --webpack` (pass)
    - `pnpm -C apps/web run test:ci` (`115 files, 434 tests passed`)

- February 19, 2026: Fixed show gallery default media sections, batch-job target scoping, and profile-picture false positives.
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/lib/admin/asset-sectioning.ts`
    - `apps/web/tests/asset-sectioning.test.ts`
  - Changes:
    - Show gallery default section set (when no explicit content-type filter is selected) now focuses on:
      - `Cast Photos` (OSA-scoped classifier),
      - `Profile Pictures`,
      - `Posters`,
      - `Backdrops`.
    - Batch Jobs default content-type checkboxes now match that same section set.
    - Batch job target resolution now uses currently visible gallery section assets instead of all filtered assets, so Count/Crop/ID Text/Resize only runs on assets currently shown for selected sections.
    - Profile-picture classification is now stricter: `PROFILE PICTURE` inferred from loose text alone no longer classifies into the Profile section without stronger profile signals (context/kind or explicit profile content type metadata).
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/asset-sectioning.test.ts` (`4 passed`)
    - `pnpm -C apps/web exec vitest run tests/show-assets-batch-jobs-stream-route.test.ts tests/show-admin-routes.test.ts tests/show-section-redirect-page.test.ts` (`15 passed`)
    - `pnpm -C apps/web exec tsc --noEmit` currently reports unrelated pre-existing errors in `apps/web/src/app/admin/networks/page.tsx` and `apps/web/src/app/admin/scrape-images/page.tsx`.

- February 19, 2026: Added `/admin/networks` type pills and aligned summary aggregation to include all watch-provider availability rows.
  - Files:
    - `apps/web/src/lib/server/admin/networks-streaming-repository.ts`
    - `apps/web/src/app/admin/networks/page.tsx`
    - `apps/web/tests/admin-networks-page-auth.test.tsx`
  - Changes:
    - Summary provider aggregation now includes all rows from `core.show_watch_providers` (no `US/flatrate+ads` restriction), while preserving fallback from `core.shows.streaming_providers`.
    - Added pill controls above the table on `/admin/networks`:
      - `Both`
      - `Network`
      - `Streaming Services`
    - Table now renders filtered rows based on selected pill.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/admin-networks-page-auth.test.tsx tests/networks-streaming-summary-route.test.ts tests/networks-streaming-sync-proxy-route.test.ts tests/use-admin-guard-stability.test.tsx tests/admin-surveys-userkey-fetch-stability.test.tsx` (`13 passed`)

- February 19, 2026: Added a localhost-only dev admin auth bypass path so TRR admin pages can run without Firebase login during local development/debugging.
  - Files:
    - `apps/web/src/lib/server/auth.ts`
    - `apps/web/src/lib/admin/dev-admin-bypass.ts` (new)
    - `apps/web/src/lib/admin/useAdminGuard.ts`
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
    - `apps/web/tests/dev-admin-bypass.test.ts` (new)
  - Changes:
    - `requireAdmin(...)` now supports local bypass when hostname is `localhost`/`127.0.0.1`/`[::1]` and bypass is enabled.
    - Bypass enablement behavior:
      - default ON in `NODE_ENV=development`,
      - explicit override via `TRR_DEV_ADMIN_BYPASS` (server) and `NEXT_PUBLIC_DEV_ADMIN_BYPASS` (client).
    - Consolidated client bypass logic into shared `isDevAdminBypassEnabledClient(...)` helper and reused it in admin guard + TRR show/season/person admin pages.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/dev-admin-bypass.test.ts tests/use-admin-guard-stability.test.tsx tests/server-auth-adapter.test.ts tests/admin-networks-page-auth.test.tsx` (`15 passed`)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - Runtime sanity: `curl http://localhost:3000/api/admin/auth/status` returns `200` locally without bearer token.

- February 19, 2026: Re-validated admin auth stability and networks/streaming admin flows against latest backend completion contract.
  - Files:
    - `apps/web/src/lib/admin/useAdminGuard.ts`
    - `apps/web/src/app/admin/dev-dashboard/page.tsx`
    - `apps/web/src/app/admin/survey-responses/page.tsx`
    - `apps/web/src/app/admin/surveys/page.tsx`
    - `apps/web/src/app/admin/surveys/normalized/page.tsx`
    - `apps/web/src/app/admin/surveys/normalized/[surveySlug]/page.tsx`
    - `apps/web/src/app/admin/surveys/[surveyKey]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/page.tsx`
    - `apps/web/src/app/admin/networks/page.tsx`
    - `apps/web/src/lib/server/admin/networks-streaming-repository.ts`
    - `apps/web/src/app/api/admin/networks-streaming/sync/route.ts`
    - `apps/web/tests/use-admin-guard-stability.test.tsx`
    - `apps/web/tests/admin-surveys-userkey-fetch-stability.test.tsx`
    - `apps/web/tests/admin-networks-page-auth.test.tsx`
    - `apps/web/tests/networks-streaming-summary-route.test.ts`
    - `apps/web/tests/networks-streaming-sync-proxy-route.test.ts`
    - `apps/web/tests/networks-streaming-overrides-route.test.ts`
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/use-admin-guard-stability.test.tsx tests/admin-surveys-userkey-fetch-stability.test.tsx tests/admin-networks-page-auth.test.tsx tests/networks-streaming-summary-route.test.ts tests/networks-streaming-sync-proxy-route.test.ts tests/networks-streaming-overrides-route.test.ts` (`16 passed`)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web run lint` (pass; warnings only)
    - `pnpm -C apps/web run test:ci` (1 unrelated pre-existing failing test: `tests/show-news-tab-google-wiring.test.ts`)

- February 19, 2026: Reduced perceived load latency on season social Reddit tab and hardened auth-token readiness for admin fetches.
  - Files:
    - `apps/web/src/components/admin/reddit-sources-manager.tsx`
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
  - Changes:
    - `getAuthHeaders()` in both components now awaits Firebase `authStateReady()` before requesting ID tokens, preventing early `currentUser` races that caused empty/failed initial loads.
    - `SeasonSocialAnalyticsSection.refreshAll()` now short-circuits heavyweight analytics/targets/runs/jobs fetches when `platformTab === "reddit"`, so Reddit manager loads without waiting on non-Reddit social pipelines.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx tests/reddit-sources-manager.test.tsx tests/reddit-discovery-service.test.ts tests/reddit-community-route.test.ts` (`30 passed`)
    - `pnpm -C apps/web exec next build --webpack` (pass)

- February 19, 2026: Added dual reddit flair gating modes per community (`all posts` vs `scan by show/cast terms`) for better multi-show subreddit handling.
  - Files:
    - `apps/web/db/migrations/026_add_analysis_all_flares_to_admin_reddit_communities.sql` (new)
    - `apps/web/src/lib/server/admin/reddit-sources-repository.ts`
    - `apps/web/src/app/api/admin/reddit/communities/[communityId]/route.ts`
    - `apps/web/src/app/api/admin/reddit/communities/[communityId]/discover/route.ts`
    - `apps/web/src/lib/server/admin/reddit-discovery-service.ts`
    - `apps/web/src/components/admin/reddit-sources-manager.tsx`
    - `apps/web/tests/reddit-discovery-service.test.ts`
    - `apps/web/tests/reddit-sources-manager.test.tsx`
    - `apps/web/tests/reddit-community-route.test.ts`
  - Changes:
    - Added persisted `analysis_all_flares` array on `admin.reddit_communities` (JSONB array + check constraint).
    - Kept existing `analysis_flares` as `scan flare for relevant terms` mode.
    - Discovery gating now supports both modes simultaneously:
      - `analysis_all_flares`: include all posts with matched flair (term match not required).
      - `analysis_flares`: include only posts with matched flair AND show/cast term matches.
      - If either mode has selections, posts outside selected flairs are excluded.
    - Updated Reddit manager UI with two separate chip groups:
      - `All Posts With Flair`
      - `Scan Flair For Relevant Terms`
      - flare assignments are mutually exclusive per flair and persisted together via PATCH.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/reddit-discovery-service.test.ts tests/reddit-sources-manager.test.tsx tests/reddit-community-route.test.ts tests/reddit-flairs-service.test.ts tests/reddit-community-flares-refresh-route.test.ts` (`23 passed`)
    - `pnpm -C apps/web exec next build --webpack` (pass)

- February 19, 2026: Implemented social tab URL deep links, Reddit analysis flair persistence/gating, and RHOSLC flair normalization cleanup.
  - Files:
    - `apps/web/db/migrations/025_add_analysis_flares_to_admin_reddit_communities.sql` (new)
    - `apps/web/src/lib/server/admin/reddit-flair-normalization.ts` (new)
    - `apps/web/src/lib/server/admin/reddit-flairs-service.ts`
    - `apps/web/src/lib/server/admin/reddit-sources-repository.ts`
    - `apps/web/src/lib/server/admin/reddit-discovery-service.ts`
    - `apps/web/src/app/api/admin/reddit/communities/[communityId]/route.ts`
    - `apps/web/src/app/api/admin/reddit/communities/[communityId]/discover/route.ts`
    - `apps/web/src/components/admin/reddit-sources-manager.tsx`
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/tests/reddit-flairs-service.test.ts`
    - `apps/web/tests/reddit-discovery-service.test.ts`
    - `apps/web/tests/reddit-sources-manager.test.tsx`
    - `apps/web/tests/reddit-community-route.test.ts` (new)
    - `apps/web/tests/season-social-analytics-section.test.tsx`
  - Changes:
    - Added persisted `analysis_flares` array on admin reddit communities with migration + JSON array constraint.
    - Added shared flair sanitizer with RHOSLC-specific cleanup rules (token removal, decorative cleanup, `:Whitney:` exclusion, case-insensitive dedupe, alphabetical sort).
    - Applied sanitizer on flair refresh, repository parsing, and PATCH writes.
    - Extended community PATCH route to accept/validate `analysis_flares: string[]` and return persisted normalized values.
    - Extended discovery payload to include `link_flair_text`, `matched_cast_terms`, and `passes_flair_filter`.
    - Discovery now supports cast-term matching and enforces flair + show/cast gating when analysis flares are configured.
    - Reddit manager UI now supports show-community analysis flair chip selection with optimistic save/rollback and flair-aware discovery card badges.
    - Season social platform tabs moved above filters and now deep-link via `social_platform` query param with reload/share support and invalid-value fallback to `overview`.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx tests/reddit-sources-manager.test.tsx tests/reddit-discovery-service.test.ts tests/reddit-flairs-service.test.ts tests/reddit-community-flares-refresh-route.test.ts tests/reddit-community-route.test.ts` (`37 passed`)
    - `pnpm -C apps/web run lint` / `pnpm -C apps/web exec next build --webpack` were blocked in current dirty worktree by unrelated pre-existing parse/type errors in untracked `apps/web/src/lib/admin/asset-sectioning.ts` (not part of this task scope).

- February 19, 2026: Restored Season Social Analytics weekly-table hyperlinks to canonical week detail routes.
  - Files:
    - `apps/web/src/lib/admin/show-admin-routes.ts`
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/tests/show-admin-routes.test.ts`
    - `apps/web/tests/season-social-analytics-section.test.tsx`
  - Changes:
    - Added `buildSeasonSocialWeekUrl(...)` helper to generate canonical week-detail links:
      - `/admin/trr-shows/{slug}/seasons/{season}/social/week/{week}`
      - with optional query params via existing `appendQuery(...)`.
    - Replaced malformed week link concatenation in season social analytics table that produced:
      - `...?tab=social/week/{n}?...`
      - now links correctly to `/social/week/{n}` and preserves `source_scope`.
    - Added regression coverage for:
      - week URL helper output + query preservation,
      - weekly table `Week 1` href shape and negative assertion against `?tab=social/week`.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/show-admin-routes.test.ts tests/season-social-analytics-section.test.tsx` (`24 passed`)
    - `pnpm -C apps/web exec eslint src/lib/admin/show-admin-routes.ts src/components/admin/season-social-analytics-section.tsx` (pass)

- February 19, 2026: Redesigned the Season Social Analytics header container to improve hierarchy and readability while preserving all ingest/filter behavior.
  - Files:
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
  - Changes:
    - Reworked the top section into a two-tier layout:
      - upper row now shows branded title block, live/idle status pill, and a dedicated current-run summary card.
      - lower row now separates interactive filters (scope/week/run) from season metadata (season ID, last updated, and active window).
    - Added a responsive card/grid structure and subtle gradient backdrop to reduce visual density and improve scanability on desktop and mobile widths.
    - Kept existing select wiring, run label computation, and API-facing behavior unchanged.
  - Validation:
    - `pnpm -C apps/web exec eslint src/components/admin/season-social-analytics-section.tsx` (pass)

- February 19, 2026: Updated admin show link-discovery notice to reflect backend auto-approval of validated person sources.
  - Files:
    - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - Changes:
    - Updated discovery success copy in `discoverShowLinks` to state that validated person sources are auto-approved and only remaining pending items require review.
  - Validation:
    - UI copy-only change; no API contract or route behavior changes.

- February 19, 2026: Hardened News tab proxy error handling to replace opaque `fetch failed` with actionable backend diagnostics.
  - Files:
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/news/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/google-news/sync/route.ts`
  - Changes:
    - Added explicit timeout protection (`20s`) with `AbortController` to unified news read and Google News sync proxy calls.
    - Added network-error normalization:
      - maps raw fetch failures to `502` with backend reachability guidance and `TRR_API_URL` context,
      - maps proxy timeouts to `504` with clear timeout messaging.
    - Preserved existing auth/config guards and backend error pass-through behavior.
  - Validation:
    - `pnpm -C apps/web exec eslint 'src/app/api/admin/trr-api/shows/[showId]/news/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/google-news/sync/route.ts'` (pass)

- February 19, 2026: Stabilized admin auth guard identity to prevent cross-tab refetch cascades from equivalent Firebase auth emissions.
  - Files:
    - `apps/web/src/lib/admin/useAdminGuard.ts`
    - `apps/web/src/app/admin/dev-dashboard/page.tsx`
    - `apps/web/src/app/admin/survey-responses/page.tsx`
    - `apps/web/src/app/admin/surveys/page.tsx`
    - `apps/web/src/app/admin/surveys/normalized/page.tsx`
    - `apps/web/src/app/admin/surveys/normalized/[surveySlug]/page.tsx`
    - `apps/web/src/app/admin/surveys/[surveyKey]/page.tsx`
    - `apps/web/src/app/admin/trr-shows/page.tsx`
    - `apps/web/tests/use-admin-guard-stability.test.tsx` (new)
    - `apps/web/tests/admin-surveys-userkey-fetch-stability.test.tsx` (new)
  - Changes:
    - `useAdminGuard` now computes and returns `userKey` (`uid|email|displayName`) and avoids `setUser` churn when auth emissions are identity-equivalent.
    - Guard redirects are transition-based and evaluated after `authStateReady` + first auth emission, preventing transient churn from causing repeated route side effects.
    - Admin data-loading effects in targeted pages now depend on `userKey` instead of mutable `user` object references.
    - Added hook-level regression coverage for duplicate auth emissions and redirect paths (`/`, `/hub`, no redirect for admin).
    - Added page-level regression coverage proving no refetch when user object identity changes but `userKey` remains unchanged.
  - Validation:
    - `pnpm -C apps/web exec vitest run tests/use-admin-guard-stability.test.tsx tests/admin-surveys-userkey-fetch-stability.test.tsx tests/admin-networks-page-auth.test.tsx` (`7 passed`)
    - `pnpm -C apps/web exec tsc --noEmit` (fails due to pre-existing typed route errors in `admin/trr-shows/[showId]/page.tsx` and `admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`; unrelated to this change set)

- February 19, 2026: Implemented social ingest run UI progress updates (scraped-primary counters, saved-secondary counters, activity metadata) and polling timeout resilience.
  - Files:
    - `apps/web/src/components/admin/season-social-analytics-section.tsx`
    - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
    - `apps/web/src/lib/server/trr-api/social-admin-proxy.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
    - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts`
  - Changes:
    - Season panel + week detail sync UI now render scraped counts as primary live progress using job `stage_counters`/`items_found`.
    - Added saved/upserted secondary counters (`metadata.persist_counters`) and activity diagnostics (`metadata.activity`) to run log and stage rows where available.
    - Preserved backward compatibility fallbacks when additive metadata keys are absent.
    - Increased TRR social admin read-route timeout budgets from 20s to 45s for jobs/runs/targets polling.
    - Improved social admin proxy error normalization to preserve structured backend `detail` messages.
  - Validation:
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/season-social-analytics-section.test.tsx tests/week-social-thumbnails.test.tsx tests/social-admin-proxy.test.ts` (`16 passed`)
    - Note: `act(...)` warnings appear in `season-social-analytics-section` tests but suite passes.

- February 19, 2026: Implemented `/admin/networks` completion-gate UX + override operations for per-entity metadata/logo recovery.
  - Files:
    - `apps/web/src/app/admin/networks/page.tsx`
    - `apps/web/src/lib/server/admin/networks-streaming-repository.ts`
    - `apps/web/src/app/api/admin/networks-streaming/sync/route.ts`
    - `apps/web/src/app/api/admin/networks-streaming/overrides/route.ts` (new)
    - `apps/web/src/app/api/admin/networks-streaming/overrides/[id]/route.ts` (new)
    - `apps/web/tests/networks-streaming-summary-route.test.ts`
    - `apps/web/tests/networks-streaming-sync-proxy-route.test.ts`
    - `apps/web/tests/admin-networks-page-auth.test.tsx`
    - `apps/web/tests/networks-streaming-overrides-route.test.ts` (new)
  - Changes:
    - Summary repository moved to strict schema reads (`admin.covered_shows.trr_show_id`) and now joins completion metadata:
      - `resolution_status`, `resolution_reason`, `last_attempt_at`.
    - Sync proxy now forwards `unresolved_only` for unresolved reruns.
    - Added override proxy endpoints (GET/POST/PATCH/DELETE) to backend override APIs.
    - `/admin/networks` now includes:
      - completion gate progress bar and hard-gate state,
      - schema health panel from sync response (`missing_columns[]`),
      - unresolved table with CSV export,
      - inline override editor per unresolved entity,
      - `Re-run Unresolved Only` action,
      - retained Firebase bearer auth headers on summary/sync/override requests.
  - Validation:
    - `pnpm -C apps/web exec vitest run -c vitest.config.ts tests/networks-streaming-summary-route.test.ts tests/networks-streaming-sync-proxy-route.test.ts tests/admin-networks-page-auth.test.tsx tests/networks-streaming-overrides-route.test.ts` (`11 passed`)
    - `pnpm -C apps/web exec tsc --noEmit` (pass)
    - `pnpm -C apps/web run lint` (pass with pre-existing repo warnings only; no new errors)

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

Continuation (same session, 2026-02-19) — show/season admin route canonicalization + stale-request guards:
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/[showSection]/page.tsx`
  - `apps/web/src/lib/admin/show-admin-routes.ts`
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `apps/web/tests/show-admin-routes.test.ts`
  - `apps/web/tests/show-section-redirect-page.test.ts` (new)
- Changes:
  - Added missing show-section aliases for deep links: `overview -> tab=details`, `settings -> tab=settings`.
  - Canonicalized show assets URLs from `/assets/{subtab}` to one-segment aliases: `/media-gallery`, `/media-videos`, `/media-brand` (parser still accepts legacy paths).
  - Canonicalized season admin URL builder to query-based tabs only (`?tab=...`, optional `&assets=...`) on `/seasons/{n}` base route.
  - Added stale-response guards for show-level async loaders (`fetchShow`, `fetchSeasons`, `fetchCast`, `checkCoverage`, `loadBravoData`, `loadUnifiedNews`, and `syncGoogleNews`) so old-show requests cannot overwrite current show state.
  - Added auth-hydration retry/backoff for show and season slug resolution when token is transiently unavailable (`Not authenticated`).
  - Added stale-request guards for season-level loading (`loadSeasonData`, `fetchSeasonBravoVideos`) plus reset of `showCastFetchAttemptedRef` and `trrShowCast` on show/season change.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/show-admin-routes.test.ts` (`10 passed`)
  - `pnpm -C apps/web exec vitest run tests/show-admin-routes.test.ts tests/show-section-redirect-page.test.ts` (`12 passed`)
  - `pnpm -C apps/web exec tsc --noEmit` (pass)
  - `pnpm -C apps/web exec eslint src/app/admin/trr-shows/[showId]/page.tsx src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx src/lib/admin/show-admin-routes.ts src/app/admin/trr-shows/[showId]/[showSection]/page.tsx tests/show-admin-routes.test.ts tests/show-section-redirect-page.test.ts` (pass with existing `no-img-element` warnings in show page)

Continuation (same session, 2026-02-19) — person gallery refresh clarity + media-view chip gating + show section loop fix:
- Files:
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/[showSection]/page.tsx`
  - `apps/web/src/lib/admin/person-gallery-media-view.ts` (new)
  - `apps/web/src/lib/admin/person-refresh-summary.ts` (new)
  - `apps/web/tests/show-section-redirect-page.test.ts`
  - `apps/web/tests/person-gallery-media-view.test.ts` (new)
  - `apps/web/tests/person-refresh-summary.test.ts` (new)
- Changes:
  - Person gallery refresh now requests backend stream with `enforce_show_source_policy: false` to avoid show-scoped source suppression.
  - Person gallery photo loading now paginates `GET /people/{id}/photos` at `limit=500` until exhausted (replacing the previous single `limit=250` request).
  - Refresh summary formatting now appends explicit text-overlay status notes:
    - `Text overlay skipped (not configured).`
    - `Text overlay already up to date (no pending images).`
  - Added shared media-view helper logic for show bucket classification and filter fallback behavior.
  - Media View chips are now conditional:
    - Show `WWHL` only when matching photos exist.
    - Show `Other Shows` only when matching photos exist.
    - Show `All Media` only when non-this-show photos exist.
  - Added automatic fallback from unavailable chip filters back to `this-show` in show context.
  - Updated show section route behavior to render known sections directly (no `?tab=...` redirect), eliminating `/media-gallery` <-> query URL bounce loops.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/show-section-redirect-page.test.ts tests/show-admin-routes.test.ts` (`13 passed`)
  - `pnpm -C apps/web exec vitest run tests/person-gallery-media-view.test.ts tests/person-refresh-summary.test.ts` (`5 passed`)
  - `pnpm -C apps/web exec vitest run tests/person-refresh-images-stream-route.test.ts` (`2 passed`)

Continuation (same session, 2026-02-19) — unified News tab featured image rendering fallback:
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Added unified news item image fields support in card rendering path (`hosted_image_url`, `image_url`, `original_image_url`).
  - Reworked News tab card map rendering to a clean block body and image fallback priority:
    1) `hosted_image_url`
    2) `image_url`
    3) `original_image_url`
- Validation:
  - `pnpm -C apps/web exec tsc --noEmit` (pass)
  - `pnpm -C apps/web exec eslint src/app/admin/trr-shows/[showId]/page.tsx` (pass; existing `@next/next/no-img-element` warnings only)

Continuation (same session, 2026-02-19) — social analytics weekly trend calendar heatmap + day-level platform schedule support:
- Files:
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `apps/web/tests/season-social-analytics-section.test.tsx`
- Changes:
  - Replaced weekly engagement-bar trend visualization with a daily-square calendar heatmap (`grid-cols-7`) grouped by week.
  - Added heatmap metric toggle pills:
    - `Post Count` (default)
    - `Comment Count`
  - Added day-value selection by active platform tab:
    - `Overview` uses day totals (`total_posts` / `total_comments`)
    - platform tabs (`Instagram`/`TikTok`/`Twitter/X`/`YouTube`) use platform-specific daily values.
  - Added green stepped intensity scale for non-zero values and neutral gray for zeros (no artificial minimum widths).
  - Added contextual sublabel `YouTube Posts Schedule` when `YouTube` tab + `Post Count` metric are active.
  - Added compatibility fallback message when backend daily payload is missing:
    - `Daily schedule unavailable for selected filters.`
  - Extended analytics response typing to include additive backend field `weekly_daily_activity`.
  - Updated targeted component tests for:
    - day-square heatmap rendering and zero-day visibility,
    - metric toggle behavior,
    - YouTube-specific day-scope behavior + schedule label,
    - compatibility fallback rendering.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/components/admin/season-social-analytics-section.tsx' 'tests/season-social-analytics-section.test.tsx'` (pass)
  - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx` (`12 passed`)

Continuation (same session, 2026-02-19) — heatmap date labeling + YouTube day-placement bugfix:
- Files:
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `apps/web/tests/season-social-analytics-section.test.tsx`
- Changes:
  - Updated heatmap tile label text from day-only to month+day format (`OCT 9` style).
  - Kept tile tooltips aligned with day metric values.
  - Added/updated test coverage after backend day-index fix and tile-label updates.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/components/admin/season-social-analytics-section.tsx' 'tests/season-social-analytics-section.test.tsx'` (pass)
  - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx` (`13 passed`)

Continuation (same session, 2026-02-19) — media admin stabilization (ownership hardening, batch jobs, season scope, URL loop):
- Files:
  - `apps/web/src/lib/server/trr-api/fandom-ownership.ts`
  - `apps/web/src/lib/admin/asset-sectioning.ts` (new)
  - `apps/web/src/app/admin/trr-shows/[showId]/[showSection]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/refresh-photos/stream/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream/route.ts` (new)
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream/route.ts` (new)
  - `apps/web/tests/fandom-person-ownership.test.ts`
  - `apps/web/tests/asset-sectioning.test.ts` (new)
  - `apps/web/tests/show-refresh-photos-stream-route.test.ts`
  - `apps/web/tests/show-assets-batch-jobs-stream-route.test.ts` (new)
  - `apps/web/tests/season-assets-batch-jobs-stream-route.test.ts` (new)
  - `apps/web/tests/show-section-redirect-page.test.ts`
  - `apps/web/tests/show-admin-routes.test.ts`
  - `apps/web/tests/person-refresh-summary.test.ts`
  - `apps/web/tests/person-gallery-media-view.test.ts`
- Changes:
  - Hardened Fandom ownership checks for static Wikia file URLs (`static.wikia.nocookie.net`) using trusted filename owner extraction; trusted mismatch now blocks wrong-person display.
  - Added shared season/show asset section classifier with strict OSA-only `cast_photos` policy and dedicated sections:
    - `profile_pictures`, `cast_photos`, `confessionals`, `reunion`, `intro_card`, `episode_stills`, `posters`, `backdrops`, `other`.
  - Season assets page now uses shared sectioning, includes new section renders, and adds Batch Jobs modal/workflow (operation + content-type multi-select, SSE progress/logging).
  - Season refresh stream calls now pass `season_number` and removed broad show-level fallback behavior on season page failures.
  - Show refresh-photos proxy normalizes `skip_mirror -> skip_s3` and forwards `season_number`.
  - Added new proxy routes for show/season asset batch-job stream endpoints.
  - Show section alias route now renders known sections directly (no query redirect), preventing `/media-gallery` URL ping-pong.
  - Kept prior person refresh/media-chip/summary fixes in place and validated in same run.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/fandom-person-ownership.test.ts tests/person-refresh-summary.test.ts tests/person-gallery-media-view.test.ts tests/show-refresh-photos-stream-route.test.ts tests/show-section-redirect-page.test.ts tests/show-admin-routes.test.ts` (`29 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/asset-sectioning.test.ts tests/show-assets-batch-jobs-stream-route.test.ts tests/season-assets-batch-jobs-stream-route.test.ts` (`5 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit --pretty false` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx src/app/admin/trr-shows/[showId]/page.tsx src/app/api/admin/trr-api/shows/[showId]/refresh-photos/stream/route.ts src/app/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream/route.ts src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream/route.ts src/lib/server/trr-api/fandom-ownership.ts src/lib/admin/asset-sectioning.ts` (pass with existing `@next/next/no-img-element` warnings in show page)

Continuation (same session, 2026-02-19) — season cast gallery scope cleanup (season roles + season episode counts only):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
- Changes:
  - Removed series-level total episode display from season cast cards.
  - Removed series-level total episode display from archive cast cards.
  - Tightened role resolution on season cast tab to use season-scoped role members (no show-cast role fallback for displayed season role).
  - Added explicit `Role: ...` text on cast/crew/archive cards with `Unspecified for season` fallback when no season role is available.
  - Updated archive wording to season-scoped count: `archived episodes this season`.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit --pretty false` (pass)

Continuation (same session, 2026-02-19) — social ingest UI reliability and proxy diagnostics pass-through:
- Files:
  - `apps/web/src/lib/server/trr-api/social-admin-proxy.ts`
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `apps/web/tests/social-admin-proxy.test.ts`
  - `apps/web/tests/season-social-analytics-section.test.tsx`
- Changes:
  - Enhanced proxy standardized error envelope with additive upstream fields:
    - `upstream_detail`
    - `upstream_detail_code` (from backend `detail.code`)
  - Preserved existing envelope fields (`error`, `code`, `retryable`, `upstream_status`).
  - Updated ingest payload from season analytics run actions to include:
    - `allow_inline_dev_fallback: true`
  - Added ingest error formatter (exported helper) that turns worker-unavailable upstream details into actionable guidance for operators.
  - Added/updated tests for:
    - run payload carrying `allow_inline_dev_fallback`,
    - worker-unavailable actionable message formatting,
    - proxy pass-through of `upstream_detail` and `upstream_detail_code`,
    - continued month-day heatmap tile labeling assertion (`JAN 14`).
- Validation:
  - `pnpm -C apps/web exec eslint 'src/lib/server/trr-api/social-admin-proxy.ts' 'src/components/admin/season-social-analytics-section.tsx' 'tests/season-social-analytics-section.test.tsx'` (pass)
  - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx` (`16 passed`)
  - Extra verification: `pnpm -C apps/web exec vitest run tests/social-admin-proxy.test.ts` (`2 passed`)
- Notes:
  - Vitest run emits existing React `act(...)` warnings from pre-existing async polling behavior in this component test suite; tests still pass.

Continuation (same session, 2026-02-19) — media reliability + live job telemetry + season-cast scope hardening:
- Files:
  - `apps/web/src/lib/admin/image-url-candidates.ts` (new)
  - `apps/web/src/lib/admin/job-live-counts.ts` (new)
  - `apps/web/src/components/admin/ImageLightbox.tsx`
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `apps/web/src/lib/server/trr-api/fandom-ownership.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route.ts`
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `apps/web/tests/image-url-candidates.test.ts` (new)
  - `apps/web/tests/job-live-counts.test.ts` (new)
  - `apps/web/tests/person-gallery-thumbnail-wiring.test.ts`
  - `apps/web/tests/season-cast-route-fallback.test.ts`
  - `apps/web/tests/fandom-person-ownership.test.ts`
- Changes:
  - Added ordered multi-URL candidate fallback utilities for gallery cards/detail views and person originals.
  - Upgraded gallery/image rendering to retry through all known URL candidates before placeholder:
    - show assets page,
    - season assets page,
    - person gallery tiles,
    - `ImageLightbox` now supports sequential `fallbackSrcs`.
  - Added diagnostics when all image URL candidates fail (`asset/origin + attempted count`).
  - Added normalized live counter reducer/utilities (`synced`, `mirrored`, `counted`, `cropped`, `id_text`, `resized`) and wired them into stream progress/complete handling for:
    - show refresh photos stream,
    - show and season batch-job streams,
    - person refresh/reprocess streams,
    - person per-image pipeline completion logging.
  - Hardened season-cast scoping:
    - season repository response now keeps `total_episodes` season-scoped,
    - season cast route fallback now reports season-only totals (`0` in show-fallback mode).
  - Extended Fandom ownership trusted URL candidates to include metadata `original_url` / `url_original`.
  - Tightened show page canonicalization effect to avoid unnecessary replaces unless path mismatch or legacy routing query keys are present.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/image-url-candidates.test.ts tests/job-live-counts.test.ts tests/person-gallery-thumbnail-wiring.test.ts tests/season-cast-route-fallback.test.ts tests/show-admin-routes.test.ts tests/show-section-redirect-page.test.ts tests/show-refresh-photos-stream-route.test.ts tests/show-assets-batch-jobs-stream-route.test.ts tests/season-assets-batch-jobs-stream-route.test.ts` (`29 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/fandom-person-ownership.test.ts tests/image-lightbox-metadata.test.tsx tests/person-refresh-summary.test.ts tests/person-gallery-media-view.test.ts` (`22 passed`; existing jsdom `scrollTo` warning logs)

Continuation (same session, 2026-02-19) — show social UX refactor (neutral hero, external platform tabs, social sub-pages):
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `apps/web/tests/season-social-analytics-section.test.tsx`
  - `apps/web/tests/show-social-subnav-wiring.test.ts` (new)
- Changes:
  - Added show-level social sub-view query model via `social_view=bravo|sentiment|hashtags|advanced` (default `bravo`) and second-row social sub-nav under main show tabs.
  - Moved social platform tabs (`Overview/Instagram/TikTok/Twitter/X/YouTube/Reddit`) into the first social container above `Social Scope`.
  - Wired show page to control season analytics platform/view state via props:
    - `platformTab`, `onPlatformTabChange`, `hidePlatformTabs`, `analyticsView`.
  - Added controlled/uncontrolled platform-tab behavior in `SeasonSocialAnalyticsSection`; internal tab row is suppressible with `hidePlatformTabs`.
  - Removed gradient hero styling in season analytics and shifted top status styling to neutral grayscale while preserving readability.
  - Added social sub-page rendering modes:
    - `bravo`: full baseline analytics layout.
    - `sentiment`: sentiment-focused sections.
    - `hashtags`: configured target hashtags + observed hashtag extraction from leaderboard text with platform-aware aggregation/filtering.
    - `advanced`: ingest/export + weekly count table + ingest job status + manual sources.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/components/admin/season-social-analytics-section.tsx' 'tests/season-social-analytics-section.test.tsx' 'tests/show-social-subnav-wiring.test.ts'` (pass; existing `@next/next/no-img-element` warnings in show page)
  - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx tests/show-social-subnav-wiring.test.ts` (`22 passed`; existing React `act(...)` warnings from legacy async polling patterns)

Continuation (same session, 2026-02-19) — social/season reliability pass (25 bug plan: validation, auth readiness, routing context, UI guardrails):
- Files:
  - `apps/web/src/lib/server/validation/identifiers.ts` (new)
  - `apps/web/src/lib/admin/client-auth.ts` (new)
  - `apps/web/src/app/api/admin/reddit/communities/[communityId]/route.ts`
  - `apps/web/src/app/api/admin/reddit/communities/[communityId]/discover/route.ts`
  - `apps/web/src/app/api/admin/reddit/communities/[communityId]/flares/refresh/route.ts`
  - `apps/web/src/app/api/admin/reddit/communities/route.ts`
  - `apps/web/src/app/api/admin/reddit/threads/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/social-posts/route.ts`
  - `apps/web/src/app/api/admin/social-posts/[postId]/route.ts`
  - `apps/web/src/lib/admin/show-admin-routes.ts`
  - `apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `apps/web/src/components/admin/social-posts-section.tsx`
  - `apps/web/src/components/admin/reddit-sources-manager.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/[showSection]/[seasonTab]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `apps/web/tests/reddit-communities-route.test.ts`
  - `apps/web/tests/reddit-community-route.test.ts` (new in workspace state)
  - `apps/web/tests/reddit-community-flares-refresh-route.test.ts`
  - `apps/web/tests/reddit-threads-route.test.ts`
  - `apps/web/tests/reddit-sources-manager.test.tsx`
  - `apps/web/tests/season-social-analytics-section.test.tsx`
  - `apps/web/tests/week-social-thumbnails.test.tsx`
  - `apps/web/tests/show-admin-routes.test.ts`
  - `apps/web/tests/social-posts-show-route.test.ts` (new)
  - `apps/web/tests/social-posts-postid-route.test.ts` (new)
  - `apps/web/tests/season-tab-alias-redirect.test.ts` (new)
  - `apps/web/tests/show-social-subnav-no-season.test.tsx` (new)
  - `apps/web/tests/season-page-error-reset.test.tsx` (new)
- Changes:
  - Added shared UUID validator and applied deterministic `400` handling across affected Reddit/admin routes.
  - Added shared client auth-header helper that waits for auth readiness (`authStateReady`) and standardized `"Not authenticated"` behavior.
  - Hardened social-post APIs:
    - `GET /shows/[showId]/social-posts` now validates IDs and enforces season→show ownership before season-scoped reads.
    - `POST /shows/[showId]/social-posts` validates `trr_season_id` and rejects cross-show assignments.
    - `PUT /social-posts/[postId]` validates `postId` and rejects season reassignment outside the post’s show.
  - Preserved query params in season tab alias redirects.
  - Extended legacy query cleanup to remove stale social-only keys (`social_platform`, `social_view`, `source_scope`, `scope`) when changing non-social contexts.
  - Replaced `window.history.replaceState` in season social platform-tab deep links with App Router `router.replace`.
  - Fixed Reddit discovery UI filtering so all-flair inclusions are not hidden by “Show matched only”.
  - Added week-page numeric path param validation (`seasonNumber`, `weekIndex`) before analytics/sync fetches and preserved `source_scope` on season-back navigation.
  - Replaced blank unauthorized season page fallback with explicit access-required UI.
  - Ensured season data load failures clear stale season slices (`season`, `episodes`, `assets`, `cast`, `archiveCast`).
  - Gated show-level social platform tabs when no season context is selected (fallback `SocialPostsSection` mode).
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/reddit-communities-route.test.ts tests/reddit-community-route.test.ts tests/reddit-community-flares-refresh-route.test.ts tests/reddit-threads-route.test.ts tests/social-posts-show-route.test.ts tests/social-posts-postid-route.test.ts tests/reddit-sources-manager.test.tsx tests/season-social-analytics-section.test.tsx tests/week-social-thumbnails.test.tsx tests/show-social-subnav-no-season.test.tsx tests/season-tab-alias-redirect.test.ts tests/season-page-error-reset.test.tsx tests/show-admin-routes.test.ts` (`74 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass; existing non-blocking warnings only)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec next build --webpack` (pass)

Continuation (same session, 2026-02-19) — Instagram metadata UX + period leaderboard thumbnails:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/week-social-thumbnails.test.tsx`
- Changes:
  - Added leaderboard thumbnail support for period analytics cards in both `bravo_content` and `viewer_discussion` lists via additive `thumbnail_url` typing/rendering.
  - Extended week-detail/post-detail Instagram client types with enriched metadata fields: `post_format`, `profile_tags`, `collaborators`, `hashtags`, `mentions`, and `duration_seconds`.
  - Rendered Instagram metadata chips in week post cards and Post Stats drawer (format, duration, profile tags, collaborators) while preserving existing hashtags/mentions presentation.
  - Kept all UI contract changes additive/backward-compatible with null-safe fallbacks.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/components/admin/season-social-analytics-section.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'tests/season-social-analytics-section.test.tsx' 'tests/week-social-thumbnails.test.tsx'` (pass)
  - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx tests/week-social-thumbnails.test.tsx` (`25 passed`; existing non-blocking React `act(...)` warnings from prior async polling tests)

Continuation (same session, 2026-02-19) — social/reddit hardening pass (20 additional fixes request):
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/export/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/threads/[threadId]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/threads/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-sources-repository.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/discover/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/social-media/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/social-media/bravo-content/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/social-media/creator-content/page.tsx`
- Changes:
  - Hardened season-social proxy routes with deterministic identifier/path validation (`showId` UUID, `seasonNumber` positive int, `weekIndex` non-negative int, `runId` UUID where applicable).
  - Added post detail route guards for allowed social platform enum and safe `sourceId` format.
  - Added stricter `PUT /social/targets` payload shape validation before backend passthrough.
  - Hardened Reddit thread detail route:
    - UUID validation for `threadId`.
    - UUID validation for `community_id` and `trr_season_id` in PATCH.
    - Season ownership enforcement when reassigning/setting `trr_season_id`.
  - Hardened Reddit thread create route with `trr_season_id` ownership enforcement against selected community show.
  - Prevented silent cross-community thread reassignment via upsert conflict path:
    - Upsert now only updates on matching `community_id`.
    - Conflicts across communities now return explicit conflict error path.
  - Deduped discovery sort modes in community discovery route to avoid duplicate fetches and unnecessary Reddit rate pressure.
  - Replaced unauthorized `return null` fallbacks on social admin pages with explicit access-required UI blocks.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass with existing warnings)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/reddit-threads-route.test.ts tests/social-admin-proxy.test.ts tests/reddit-discovery-service.test.ts` (`10 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec next build --webpack` failed on unrelated pre-existing error in `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/scrape-images/page.tsx:995` (`Cannot find name 'getAuthHeaders'`).

Continuation (same session, 2026-02-19) — Sync by Bravo mode picker + cast-only flow wiring:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-cast-only-wiring.test.ts` (new)
- Changes:
  - Added cast URL inference helper for show cast names (`https://www.bravotv.com/people/{firstname-lastname}`) and threaded inferred URLs into Bravo preview/commit payloads via `person_url_candidates`.
  - Added existing-run mode picker modal for Sync by Bravo with:
    - `Cast Only`
    - `Re-Run Show URL`
  - Wired `Cast Only` to run preview/commit with `cast_only=true`, suppress full show/video/news editing UI, and focus on valid cast profile URL results.
  - Kept full rerun path intact for existing behavior, including show metadata, images, videos, and news flow.
  - Added reset guards so sync modal/mode state and image-selection state are cleared on show change and when entering cast-only mode.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/show-news-tab-google-wiring.test.ts tests/show-social-subnav-wiring.test.ts tests/show-bravo-cast-only-wiring.test.ts` (`7 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass; existing repo warnings only, no new errors)

Continuation (same session, 2026-02-19) — TRR-APP admin page-load latency remediation (runtime-first):
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/cast/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/covered-shows-repository.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-route-default-min-episodes.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-cast-route-fallback.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/trr-shows-repository-photo-fallback.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-lazy-loading-wiring.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/covered-shows-route-metadata.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/covered-shows-page-no-fanout-wiring.test.ts` (new)
- Changes:
  - Added explicit cast photo fallback policy to cast APIs via query param `photo_fallback=none|bravo` (default `none`) on:
    - `GET /api/admin/trr-api/shows/[showId]/cast`
    - `GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast`
  - Refactored cast photo lookup in repository to use typed fallback mode (`none` default, `bravo` opt-in), removing hardcoded always-on Bravo HTML fallback behavior.
  - Added cast photo lookup diagnostics plumbing and route-level structured timing logs (gated by `TRR_CAST_PERF_LOGS`) including:
    - total request ms
    - repo call ms
    - `db_queries_ms`
    - `photo_map_stage_ms`
    - `external_fetch_ms`
    - external fetch attempted/resolved counts
  - Changed show detail page initial load to stop blocking on cast fetch:
    - initial load now waits on show + seasons + coverage only
    - cast is lazy-loaded when Cast tab is opened
    - cast fetch errors are localized to Cast UI (`castLoadError`) instead of global page-fatal error
  - Added on-demand cast enrichment UI action: `Enrich Missing Cast Photos`:
    - calls cast endpoint with `photo_fallback=bravo`
    - merges only missing `photo_url`/thumbnail fields into existing cast state
  - Updated season show-cast fetch for brand workflows to explicit fast mode:
    - `/api/admin/trr-api/shows/{showId}/cast?limit=500&photo_fallback=none`
  - Eliminated covered-shows N+1 fan-out:
    - enriched `/api/admin/covered-shows` server payload with optional `canonical_slug`, `show_total_episodes`, `poster_url`
    - updated `/admin/trr-shows` covered cards to consume enriched payload directly
    - removed per-show seasons/show fetch worker loop
- Timing baseline and after-status:
  - Before (from workspace logs): `show_cast_api` avg total ~22.96s, avg render ~21.9s; repeated ~24.6s–30.8s spikes.
  - After (code-path policy): default mode is now `photo_fallback=none`, so Bravo profile HTML fetch stage is disabled unless explicitly requested.
  - After (instrumentation evidence path): when default mode is used, `external_fetch_ms` should remain `0` in cast timing logs; when `photo_fallback=bravo`, external stage is isolated and measurable.
  - After (UX path): `/admin/trr-shows/[showId]` no longer blocks initial readiness on cast API completion.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/show-cast-route-default-min-episodes.test.ts tests/season-cast-route-fallback.test.ts tests/trr-shows-repository-photo-fallback.test.ts tests/show-cast-lazy-loading-wiring.test.ts tests/covered-shows-route-metadata.test.ts tests/covered-shows-page-no-fanout-wiring.test.ts` (`18 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass; warnings only, no errors)
- Notes:
  - Live end-to-end timing replay in this session was limited by admin-authenticated runtime access; added diagnostics are in place to capture before/after in active dev runs.

Continuation (same session, 2026-02-19) — covered-shows join type hotfix:
- File:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/covered-shows-repository.ts`
- Fix:
  - Resolved Postgres type mismatch (`operator does not exist: text = uuid`) in covered-shows enrichment join by normalizing both sides to text:
    - from: `s.id::text = cs.trr_show_id`
    - to: `s.id::text = cs.trr_show_id::text`
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/vitest.config.ts tests/covered-shows-route-metadata.test.ts` (`1 passed`)

Continuation (same session, 2026-02-19) — covered-shows canonical slug schema hotfix:
- File:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/covered-shows-repository.ts`
- Fix:
  - Removed dependency on missing `core.shows.canonical_slug` column in covered-shows enrichment query.
  - Added local slug derivation (`SHOW_SLUG_SQL`) + collision-safe canonical slug generation using `core.shows.name` and `id` suffix, matching TRR show-repository behavior.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/vitest.config.ts tests/covered-shows-route-metadata.test.ts tests/covered-shows-page-no-fanout-wiring.test.ts` (`3 passed`)

Continuation (same session, 2026-02-19) — `/admin` loading spinner deadlock fix:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/useAdminGuard.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/use-admin-guard-stability.test.tsx`
- Fix:
  - Resolved a guard deadlock where `/admin` could stay indefinitely on `Preparing admin dashboard...` when Firebase auth listener emission was delayed or missing.
  - On auth-ready timeout, guard now seeds a one-time auth snapshot from `auth.currentUser`, sets `user/userKey/hasAccess`, clears `checking`, and applies existing redirect rules (`/` for unauthenticated, `/hub` for non-admin).
  - This preserves normal emission-based behavior while preventing infinite spinner state.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/use-admin-guard-stability.test.tsx` (`9 passed`)
  - Browser check with Playwright on `http://127.0.0.1:3000/admin`: spinner text `Preparing admin dashboard...` no longer persists.

Continuation (same session, 2026-02-19) — Sync by Fandom app wiring (person + season tabs):
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/FandomSyncModal.tsx` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/people/[personId]/fandom/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/people/[personId]/import-fandom/preview/route.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/people/[personId]/import-fandom/commit/route.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom/route.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview/route.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit/route.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/show-admin-routes.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-admin-routes.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/person-fandom-route-proxy.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-fandom-route-proxy.test.ts` (new)
- Changes:
  - Added reusable read-only two-step `Sync by Fandom` modal (`preview -> save`).
  - Switched person fandom read route to backend proxy contract (`/api/v1/admin/person/{person_id}/fandom`).
  - Added proxy routes for person and season fandom preview/commit workflows.
  - Added person tab UX wiring:
    - Sync button in Fandom tab.
    - preview/commit handlers.
    - rendering for `casting_summary`, `bio_card`, `dynamic_sections`, `citations`, `conflicts`.
  - Added season tab UX wiring:
    - new `Fandom` tab in season admin nav.
    - season fandom fetch + sync modal integration.
    - rendering for dynamic sections/citations/conflicts.
  - Updated season route parsing/building types to include `fandom` tab.
  - Extended shared fandom interfaces with dynamic/AI/citation/conflict/source-variant fields.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm vitest run tests/show-admin-routes.test.ts tests/person-fandom-route-proxy.test.ts tests/season-fandom-route-proxy.test.ts` (`13 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm run lint` (pass; warnings only, no errors)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-19) — final issue sweep + suite stabilization:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-sources-manager.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
- Fixes:
  - Hardened covered-shows fetch lifecycle in shows admin page to avoid pre-auth fetch attempts/log noise:
    - skip initial covered-shows fetch until `checking === false`, `user` exists, and admin guard state is resolved.
    - suppress expected transient `Not authenticated` fetch errors from being logged as failures.
  - Stabilized flaky integration tests under full-suite parallel load:
    - `reddit-sources-manager` now waits for `Discover Threads` button availability before clicking and uses a per-test timeout.
    - `season-social-analytics-section` canonical week-link test now uses explicit find timeout and per-test timeout.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/asset-sectioning.test.ts tests/reddit-sources-manager.test.tsx tests/season-social-analytics-section.test.tsx` (`32 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts` (`122 files, 456 passed`)
  - Browser smoke (`Playwright`): `http://127.0.0.1:3000/admin/trr-shows` no longer emits `Failed to fetch covered shows: Not authenticated` console error in this session.

Continuation (same session, 2026-02-19) — show media gallery allow-list hardening:
- File:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Enforced a strict show gallery section allow-list for image media: `cast_photos` (displayed as "Cast Promos"), `profile_pictures`, `posters`, `backdrops`.
  - Added `SHOW_GALLERY_ALLOWED_SECTIONS` and scoped gallery assets to this set before advanced filtering.
  - Removed show-gallery "Other" expansion behavior (`showOtherAssets`/`hasHiddenOther`) so non-allowed sections cannot surface in show media view.
  - Limited batch jobs selection and target derivation to the same allow-list (jobs only run on visible, allowed show gallery sections).
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/asset-sectioning.test.ts` (`5 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' src/lib/admin/asset-sectioning.ts tests/asset-sectioning.test.ts` (pass; existing `no-img-element` warnings only)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-19) — direct-entry admin slug URL hardening (`the-` / non-`the-` aliases):
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/trr-shows-repository-resolve-slug.test.ts` (new)
- Changes:
  - Hardened `resolveShowSlug(...)` to try alias candidates for leading article variance so direct URL entry works when slug is typed with or without `the-`.
  - Candidate behavior:
    - input `the-foo-bar` tries: `the-foo-bar`, then `foo-bar`
    - input `foo-bar` tries: `foo-bar`, then `the-foo-bar`
  - Keeps existing collision-safe suffix handling (`--{idPrefix}`) and canonical slug return shape.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/trr-shows-repository-resolve-slug.test.ts tests/trr-shows-slug-route.test.ts` (`4 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/lib/server/trr-api/trr-shows-repository.ts' 'tests/trr-shows-repository-resolve-slug.test.ts'` (pass; existing repo warning only for pre-existing unused helper)

Continuation (same session, 2026-02-20) — cast tab split workflow (IMDb sync refresh + separate enrich media):
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/job-live-counts.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/cast-refresh-orchestration.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/job-live-counts.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/cast-refresh-orchestration.test.ts` (new)
- Changes:
  - Updated cast top-level Refresh flow to run in explicit phases:
    1) cast credits refresh (`includeCastProfiles: false`),
    2) cast matrix sync,
    3) cast roster fetch (`imdb_show_membership`, `minEpisodes=0`),
    4) per-member ingest-only media pass (`refresh-images` with `sources=[imdb,tmdb]` and skip flags for count/word/crop/resize).
  - Added new top-level `Enrich Media` action in Cast tab that batch-runs per-member `reprocess-images/stream` (post-processing only).
  - Kept per-card `Refresh Person` behavior as full pipeline (default mode).
  - Added `refreshPersonImages` mode support (`full` default, `ingest_only` additive) and added `reprocessPersonImages` stream wrapper.
  - Added orchestration helper module for deterministic cast workflow sequencing and enrich-media behavior.
  - Updated live-count resolver to ignore payloads with no count-bearing signals, removing misleading `synced: 0, mirrored: 0, ...` suffixes on non-count progress events.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/job-live-counts.test.ts tests/cast-refresh-orchestration.test.ts` (`7 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint 'src/lib/admin/job-live-counts.ts' 'src/lib/admin/cast-refresh-orchestration.ts' 'src/app/admin/trr-shows/[showId]/page.tsx' 'tests/job-live-counts.test.ts' 'tests/cast-refresh-orchestration.test.ts'` (pass; existing `no-img-element` warnings only)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-23) — admin bypass contract fix + staged social landing loads/timeouts:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/useAdminGuard.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/use-admin-guard-stability.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts`
- Root cause/focus:
  - In local bypass mode, `hasAccess=true` could coexist with `user=null`, causing admin page guards to render blank states.
  - Social landing initial load blocked on analytics + runs + targets together, so slow analytics made page interactivity and MCP debugging unstable.
  - Proxy retries/timeouts were long enough to amplify stalls.
- Changes:
  - `useAdminGuard` bypass path now guarantees non-null `user` via a stable dev bypass user shim when Firebase user is absent.
  - Preserved existing bypass `userKey` behavior (`dev-admin-bypass` when no Firebase user).
  - Added per-request timeout wrapper (`AbortController`) in season social analytics section.
  - Staged initial load:
    - Stage A: load `targets` + `runs`, clear loading state.
    - Stage B: load `analytics` asynchronously; section error is surfaced without blocking UI.
  - Preserved last-good section data on transient failures (no forced clears on failed fetches).
  - Tightened proxy settings:
    - analytics route: `retries=1`, `timeoutMs=20000`
    - runs route: `retries=1`, `timeoutMs=12000`
    - targets route: `retries=1`, `timeoutMs=12000`
  - Added regressions:
    - bypass mode with no Firebase user still reports `user-present=1`.
    - analytics failure still renders runs/targets.
    - timeout scenario exits loading and surfaces section timeout error.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/use-admin-guard-stability.test.tsx tests/season-social-analytics-section.test.tsx` (`33 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint src/lib/admin/useAdminGuard.ts src/components/admin/season-social-analytics-section.tsx src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts` (pass)

Continuation (same session, 2026-02-23) — cast refresh notice/state conflict fix (running vs finished):
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-lazy-loading-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/cast-refresh-orchestration.test.ts`
- Root cause/focus:
  - Cast refresh showed `Refreshed Cast & Credits (...)` immediately after phase 1 (`cast_credits`) while phases 2–4 were still running, causing conflicting UI state (`Refreshing...` + success notice).
- Changes:
  - Added internal `suppressSuccessNotice?: boolean` to `ShowRefreshRunOptions`.
  - Updated `refreshShow(...)` to skip success notice writes when suppression is enabled (stream complete, fallback complete, and no-complete fallback branch), while keeping error behavior unchanged.
  - Updated cast refresh orchestration (`refreshShowCast`) to:
    - clear stale cast notice/error at start,
    - run `refreshShow("cast_credits", { includeCastProfiles: false, suppressSuccessNotice: true })`,
    - set explicit phase messages for all 4 phases,
    - set final success notice only after full pipeline completion.
  - Added ingest-phase progress messaging for large casts:
    - `Ingesting media: X/Y complete (Z in flight)`,
    - long-run hint for casts larger than 30 members.
  - Replaced generic running label with phase-aware button label:
    - `Syncing Credits...`, `Syncing Matrix...`, `Loading Roster...`, `Ingesting Media...`.
  - Added/updated tests for wiring and orchestration to assert suppression and final-notice timing.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/show-cast-lazy-loading-wiring.test.ts tests/cast-refresh-orchestration.test.ts tests/job-live-counts.test.ts` (`13 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'tests/show-cast-lazy-loading-wiring.test.ts' 'tests/cast-refresh-orchestration.test.ts'` (pass; existing `@next/next/no-img-element` warnings only)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-23) — phase-based cast refresh pipeline + cast-role-members timeout hardening:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/cast-role-members/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/cast-refresh-orchestration.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-role-members-proxy-route.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/cast-refresh-orchestration.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-lazy-loading-wiring.test.ts`
- Root cause/focus:
  - Cast refresh UI could show completion while pipeline work was still running.
  - Cast-role-members proxy timed out at 70s with no retry envelope metadata.
- Changes:
  - Hardened cast-role-members proxy route:
    - Increased backend timeout to `120_000`.
    - Added one retry (`MAX_ATTEMPTS=2`) for retryable upstream/network failures (`502/503/504`, abort/network errors).
    - Added additive error envelope fields while preserving `error`: `code`, `retryable`, `upstream_status`.
  - Extended orchestration helper with phase primitives:
    - `CastRefreshPhaseId/Status/State/Definition`.
    - `runWithTimeout(...)` and `runPhasedCastRefresh(...)` with fail-fast timeout/failure behavior.
  - Reworked cast refresh in show admin page into canonical 5 phases:
    1) `credits_sync`,
    2) `profile_links_sync`,
    3) `bio_sync`,
    4) `network_augmentation` (skips for non-Bravo shows),
    5) `media_ingest`.
  - Added per-phase timeout budgets and phase-aware button labels.
  - Added cast pipeline panel in Cast tab (phase list + status chips + active messages).
  - Ensured final success notice is only written after all phases complete.
  - Added non-blocking cast-role-members failure handling:
    - preserves last successful role-member snapshot,
    - surfaces warning + manual retry action instead of clearing cast intelligence data.
  - Added `profile_only` person refresh mode wiring (bio/profile sync pass) and kept per-person refresh semantics unchanged.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/show-cast-role-members-proxy-route.test.ts tests/cast-refresh-orchestration.test.ts tests/show-cast-lazy-loading-wiring.test.ts tests/job-live-counts.test.ts` (`19 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec tsc --noEmit` (pass)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'tests/show-cast-lazy-loading-wiring.test.ts' 'tests/cast-refresh-orchestration.test.ts' 'tests/show-cast-role-members-proxy-route.test.ts' 'tests/job-live-counts.test.ts'` (pass with existing `@next/next/no-img-element` warnings in `page.tsx`)

Continuation (same session, 2026-02-23) — social landing timeout stabilization + previous-run visibility hardening:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/trr-api/social-admin-proxy.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/client-auth.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/social-admin-proxy.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/admin-client-auth.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
- Root cause/focus:
  - Social landing could appear empty/timeout under transient backend slowness due retry amplification, repeated season-resolution lookup hops, and lack of robust per-section stale-data retention.
- Changes:
  - Added optional season-id hint support in social proxy (`seasonIdHint`) with UUID validation.
    - Valid `season_id` skips `getSeasonByShowAndNumber(...)` lookup.
    - Invalid/missing hint preserves previous lookup behavior.
  - Updated social proxy routes (`analytics`, `runs`, `targets`) to:
    - accept `season_id` query hint,
    - strip it before upstream forwarding,
    - pass `seasonIdHint` into proxy,
    - use `retries=0` to avoid long retry chains.
  - `client-auth` now has a local dev bypass fast-path that returns `Bearer dev-admin-bypass` immediately when bypass is enabled and no Firebase user is present.
  - Social section now:
    - includes `season_id` in analytics/runs/targets requests,
    - dedupes in-flight requests per section,
    - retains last-good section data on failures,
    - surfaces section-level stale-data timestamp message (`Showing last successful data from ...`).
  - Updated/new tests for season-id hint behavior, bypass fast-path, and stale-data UI behavior.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx tests/use-admin-guard-stability.test.tsx` (`36 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/lib/admin/client-auth.ts src/components/admin/season-social-analytics-section.tsx src/lib/server/trr-api/social-admin-proxy.ts 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts'` (pass)
- Rollback notes:
  - Proxy-only rollback: revert `social-admin-proxy.ts` + three social route handlers.
  - UI-only rollback: revert `season-social-analytics-section.tsx` and related tests.
  - Auth fast-path rollback: revert `client-auth.ts` only.

Continuation (same session, 2026-02-23) — health popup close fix + social landing auth/dev relax + Reddit analytics tab move:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/client-auth.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/middleware.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-social-subnav-wiring.test.ts`
- Root cause/focus:
  - Health Center close interaction was fighting an auto-reopen path while refresh was active.
  - Social landing local-dev auth still intermittently surfaced `Not authenticated` due strict token assumptions during development workflows.
  - Reddit entry point was still implemented as a platform tab instead of a top-level analytics view tab.
- Changes:
  - Health popup behavior (`page.tsx`):
    - removed auto-open-on-hover while refresh is busy,
    - added `Escape` close handling,
    - enabled backdrop-click close with propagation guard on modal body.
  - Social tab structure:
    - moved Reddit to analytics view row as `REDDIT ANALYTICS`,
    - removed Reddit from platform-tab row,
    - updated `SocialAnalyticsView` to include `reddit`, and rendered `RedditSourcesManager` off analytics view selection.
  - Social section refresh behavior:
    - reddit view short-circuits analytics/runs/targets fetch loop via `analyticsView === "reddit"`.
  - Dev auth relaxation:
    - `getClientAuthHeaders` now treats `allowDevAdminBypass` as immediate bypass in non-production (and still supports local-host bypass in production-like local workflows).
  - Host enforcement relaxation for local development:
    - middleware now defaults `ADMIN_ENFORCE_HOST` to `false` outside production unless explicitly set.
  - Regression coverage update:
    - `show-social-subnav-wiring.test.ts` now asserts `REDDIT ANALYTICS` is present.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx tests/show-social-subnav-wiring.test.ts tests/admin-client-auth.test.ts tests/dev-admin-bypass.test.ts tests/admin-host-middleware.test.ts tests/use-admin-guard-stability.test.tsx` (`59 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/components/admin/season-social-analytics-section.tsx src/lib/admin/client-auth.ts src/middleware.ts 'src/app/admin/trr-shows/[showId]/page.tsx'` (pass with existing `@next/next/no-img-element` warnings in `page.tsx`)
  - Manual endpoint verification from local host (no auth token provided):
    - `GET /api/admin/trr-api/shows/resolve-slug?...` -> `200`
    - `GET /api/admin/trr-api/shows/{showId}/seasons/6/social/analytics?...` -> `200`
    - `GET /api/admin/trr-api/shows/{showId}/seasons/6/social/targets?...` -> `200`
    - `GET /api/admin/trr-api/shows/{showId}/seasons/6/social/runs?...` -> `200`
- Rollback notes:
  - UI-only rollback: revert `page.tsx` + `season-social-analytics-section.tsx`.
  - Dev auth rollback: revert `client-auth.ts`.
  - Host-routing rollback: revert `middleware.ts` or set `ADMIN_ENFORCE_HOST=true` in local env.
- Follow-up regression:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
    - added mock for `RedditSourcesManager` and coverage that `analyticsView="reddit"` renders the Reddit manager while analytics sections stay hidden.

Continuation (same session, 2026-02-24) — Bravo cast-only stream preview UI (auto-start + progressive rows):
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream/route.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-preview-stream-proxy-route.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-cast-only-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-cast-only-preview-details.test.ts`
- Root cause/focus:
  - Cast-only modal showed static counters and no candidate progress while backend probing was in flight.
- Changes:
  - Added new TRR-APP SSE proxy route for cast-only preview stream:
    - `POST /api/admin/trr-api/shows/[showId]/import-bravo/preview/stream`
    - admin auth gate + backend pass-through + retry once on retryable upstream/network failures + SSE error envelopes.
  - Updated cast-only preview orchestration in show admin page:
    - uses stream route in cast-only mode (full mode remains existing blocking `/preview` path),
    - seeds canonical cast `/people/*` rows immediately as `pending`,
    - updates rows one-by-one from streamed `progress` events,
    - updates live probe summary counters and active in-flight message,
    - auto-start behavior retained on modal open.
  - Added stream lifecycle hardening:
    - per-run `AbortController`,
    - prior run aborted before new run,
    - run-id stale event guard,
    - abort on modal close/unmount.
  - Updated cast-only preview UI:
    - new `Probe Queue` section with status badges (`pending|in_progress|ok|missing|error`),
    - live probing message + large-cast hint,
    - existing valid-profile cards and missing/error detail list preserved.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web exec tsc --noEmit` (pass)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web exec vitest run tests/show-bravo-preview-stream-proxy-route.test.ts tests/show-bravo-cast-only-wiring.test.ts tests/show-bravo-cast-only-preview-details.test.ts` (`7 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream/route.ts' 'tests/show-bravo-preview-stream-proxy-route.test.ts' 'tests/show-bravo-cast-only-wiring.test.ts' 'tests/show-bravo-cast-only-preview-details.test.ts'`
    - no new errors; existing `@next/next/no-img-element` warnings in `page.tsx` remain.

Continuation (same session, 2026-02-24) — weekly Bravo table now shows comment coverage percent:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
- Root cause/focus:
  - Weekly Bravo Post Count Table showed only post/comment totals per week; operators could not see comment backfill completeness at a glance.
- Changes:
  - Extended analytics row typing to consume additive backend fields:
    - `reported_comments`, `total_reported_comments`, `comments_saved_pct`.
  - Added UI line under weekly total comments in each row:
    - `X.X% saved to DB (saved/reported)`.
  - Keeps display backward-compatible:
    - coverage line only renders when a valid reported-comments denominator exists.
  - Added regression test to assert coverage string rendering in the weekly table.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx` (`25 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/components/admin/season-social-analytics-section.tsx tests/season-social-analytics-section.test.tsx` (pass)

Continuation (same session, 2026-02-24) — admin DB DNS/SSL stabilization for show/social loading:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/postgres.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/postgres-connection-string-resolution.test.ts`
- Root cause/focus:
  - Admin pages intermittently surfaced DB connection failures (`getaddrinfo ENOTFOUND aws-1-us-east-1.pooler.supabase.com` and local SSL mismatch incidents) from direct Postgres access paths.
- Changes:
  - Added deterministic DB URL resolver helper:
    - `resolvePostgresConnectionString(...)` with fallback order:
      - `DATABASE_URL` -> `SUPABASE_DB_URL` -> `TRR_DB_URL`.
  - Added SSL resolver helper:
    - `resolvePostgresSslConfig(...)`.
    - auto-disables SSL for localhost/127.0.0.1 unless explicitly `DATABASE_SSL=require`.
  - Updated pool initialization to use the resolver helpers.
  - Added regression tests for URL priority/fallback and SSL behavior.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/postgres-connection-string-resolution.test.ts` (`6 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/lib/server/postgres.ts tests/postgres-connection-string-resolution.test.ts` (pass)
  - Manual endpoint checks after restarting local app/backend:
    - `GET /api/admin/covered-shows` -> `200`
    - `GET /api/admin/trr-api/shows/resolve-slug?slug=the-real-housewives-of-salt-lake-city` -> `200`
    - `GET /api/admin/trr-api/shows/{showId}/seasons/6/social/runs?source_scope=bravo` -> `200`
    - `GET /api/admin/trr-api/shows/{showId}/seasons/6/social/analytics?source_scope=bravo` -> `200`

Continuation (same session, 2026-02-24) — cast-only Bravo commit now reuses streamed preview payload:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-cast-only-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-cast-only-preview-details.test.ts`
- Root cause/focus:
  - Cast-only commit still triggered a second backend probe pass because preview output was not persisted/sent on commit.
- Changes:
  - Added local cast-only preview payload state (`syncBravoPreviewResult`) in show admin page.
  - Persists final stream `complete` payload and full-mode preview payload into that state.
  - Clears preview-result state on new preview run, show changes, and flow restarts to avoid stale client reuse.
  - Cast-only commit now sends additive request field:
    - `preview_result` (when available).
  - Added explicit stale-preview UX for backend `409`:
    - surfaces `Preview stale. Re-run preview before committing cast-only sync.`
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/show-bravo-cast-only-wiring.test.ts tests/show-bravo-cast-only-preview-details.test.ts tests/show-bravo-preview-stream-proxy-route.test.ts` (`7 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' tests/show-bravo-cast-only-wiring.test.ts tests/show-bravo-cast-only-preview-details.test.ts` (pass with existing `@next/next/no-img-element` warnings in `page.tsx`)

Continuation (same session, 2026-02-24) — social landing timeout resilience on reload:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
- Root cause/focus:
  - Social page fallback was only in-memory (`sectionLastSuccessAt`), so a browser reload during transient backend outages/timings (`UPSTREAM_TIMEOUT` / `BACKEND_UNREACHABLE`) had no data to fall back to and surfaced section timeout banners (`Analytics/Targets/Runs ... timed out`).
- Changes:
  - Added client-side persisted snapshot cache for social landing state (versioned key):
    - caches `analytics`, `runs`, `targets`, `lastUpdated`, and section success timestamps keyed by show/season/scope/platform/week.
    - hydrates cached snapshot on load before live fetch completes.
  - Added transient-error suppression when stale data exists:
    - hides per-section timeout/unreachable banners for `analytics/targets/runs` when that section has last-success data.
    - shows a single neutral notice: `Showing last successful social data while live refresh retries.`
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx` (`26 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/components/admin/season-social-analytics-section.tsx tests/season-social-analytics-section.test.tsx` (pass)
  - Local endpoint timing probe (same session):
    - `GET /api/admin/trr-api/shows/{showId}/seasons/6/social/analytics?...` returned `200` across 25/25 calls (no failures; typically ~3.2s, one ~5.3s).

Continuation (same session, 2026-02-24) — per-platform comment coverage in weekly Bravo table:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
- Root cause/focus:
  - Weekly table displayed only aggregate `% saved to DB`; operators requested platform-level coverage under each platform comment count.
- Changes:
  - Added per-platform coverage lines under each platform comment count cell (Instagram, YouTube, TikTok, Twitter/X):
    - `X.X% saved to DB (saved/reported)` when reported-comment denominator exists.
  - Kept existing aggregate total coverage line unchanged.
  - Extended regression test to assert per-platform coverage rendering.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx` (`26 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/components/admin/season-social-analytics-section.tsx tests/season-social-analytics-section.test.tsx` (pass)

Continuation (same session, 2026-02-24) — Reddit community focus assignment + show-focused discovery behavior:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/db/migrations/027_add_focus_fields_to_admin_reddit_communities.sql`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-community-focus.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-sources-repository.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-discovery-service.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/discover/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/reddit-sources-manager.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-communities-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-discovery-service.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-sources-manager.test.tsx`
- Changes:
  - Added community focus schema fields on `admin.reddit_communities`:
    - `is_show_focused`, `network_focus_targets`, `franchise_focus_targets` (JSON array constraints).
  - Added migration backfill rules:
    - show-focused for `realhousewivesofslc`, `rhoslc`.
    - network/franchise targets for `bravorealhousewives`, `realhousewives`.
  - Added shared server helper for focus-target sanitization + show-exclusivity enforcement.
  - Extended repository models/read/write paths for focus fields.
  - Added server-side overlap enforcement between `analysis_all_flares` and `analysis_flares` on community update.
  - Extended community POST/PATCH route payload validation and persistence for focus fields.
  - Updated discovery input/logic:
    - accepts `isShowFocused`.
    - bypasses flair gating when show-focused (includes no-flair posts).
  - Updated Reddit manager UI:
    - focus editor (show-focused toggle + network/franchise chips with suggestions).
    - create-community form supports focus fields.
    - hides flair assignment controls in show-focused mode.
    - hides "Show matched only" toggle in show-focused mode.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run db:migrate` (applied migrations 025/026/027).
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass, existing warnings only).
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/reddit-communities-route.test.ts tests/reddit-community-route.test.ts tests/reddit-discovery-service.test.ts tests/reddit-sources-manager.test.tsx` (`25 passed`).
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec next build --webpack` failed on unrelated pre-existing module issue:
    - `src/app/admin/trr-shows/people/%5BpersonId%5D/page.tsx` — `Type error: ... is not a module`.

Continuation (same session, 2026-02-24) — Bravo cast-only commit now forces cast intelligence refresh after sync:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-cast-only-wiring.test.ts`
- Root cause/focus:
  - After Bravo cast-only commit, UI refreshed show + cast list but did not force-refresh cast-role-members supplemental intelligence, which could delay visible thumbnail/profile updates.
- Changes:
  - `commitSyncByBravo(...)` now refreshes in parallel:
    - `fetchShow()`
    - `fetchCast({ rosterMode: "imdb_show_membership", minEpisodes: 0 })`
    - `fetchCastRoleMembers({ force: true })`
  - Added wiring assertion to keep `fetchCastRoleMembers({ force: true })` tied to Bravo commit flow.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/show-bravo-cast-only-wiring.test.ts` (`2 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/show-bravo-cast-only-preview-details.test.ts` (`2 passed`)

Continuation (same session, 2026-02-24) — Social analytics week/platform UX + day-ingest operator controls:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
- Root cause/focus:
  - Operators needed faster run targeting and clearer week/platform completeness status.
  - Weekly table coverage messaging used noisy ratio text and lacked total progress.
  - Date/time stamps still included seconds in multiple social admin surfaces.
- Changes:
  - Added **Specific Day ingest controls** in `Ingest + Export`:
    - date picker
    - `Run Specific Day (All Platforms)`
    - per-platform day-run buttons (`Instagram Day`, `YouTube Day`, etc.)
    - client validation for missing/invalid day selection.
  - Day ingest payload wiring:
    - derives `date_start/date_end` ISO boundaries from selected day
    - preserves existing run payload/route shape and `season_id` hint behavior.
  - Weekly Bravo table updates:
    - added new `PROGRESS` column next to `Total`
    - computes total week progress as `(posts + saved comments) / (posts + expected comments)`
    - per-platform rows now show simplified `% saved to DB` text (removed `(saved/reported)` ratio display)
    - shows `Up-to-Date` when coverage reaches 100%.
  - Week-link routing enhancements:
    - keeps `source_scope`
    - now preserves `social_platform` and `social_view` context when navigating to week detail.
  - Weekly heatmap row headers now show week date range below week label.
  - Date/time formatting standardization:
    - removed seconds from displayed timestamps (`M/D/YYYY, h:mm AM/PM`)
    - removed seconds from live run log times.
  - Minor robustness cleanup:
    - deterministic sort for weekly table rows by `week_index`
    - safer week filter parsing fallback to `all`
    - removed noisy ingest `console.log` debug output.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/components/admin/season-social-analytics-section.tsx tests/season-social-analytics-section.test.tsx` (pass)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx` (`31 passed`, existing pre-existing React `act(...)` warnings in one long-poll test remain non-fatal)

Continuation (same session, 2026-02-24) — Bravo modal now surfaces combined Bravo + Fandom cast coverage and commit outcomes:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-cast-only-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-cast-only-preview-details.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-fandom-integration-wiring.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-settings-links-fandom-visibility.test.ts` (new)
- Changes:
  - Extended Bravo modal state model with additive Fandom state:
    - `syncFandomPreviewPeople`, `syncFandomPersonCandidateResults`, `syncFandomCandidateSummary`, `syncFandomDomainsUsed`.
  - Cast-only stream preview now consumes source-aware progress (`source: bravo|fandom`):
    - seeds pending queues from both `candidates` and `fandom_candidates`,
    - applies row-by-row updates per source,
    - keeps live per-source counters and combined in-flight messaging.
  - Full preview now maps additive fandom payload fields:
    - `fandom_people`, `fandom_candidate_results`, `fandom_domains_used`, fandom counters.
  - Preview/confirm UI now renders Fandom coverage explicitly:
    - per-source summary counters,
    - fandom domains used,
    - fandom queue/profile cards/missing-error sections,
    - confirm step shows Bravo + Fandom summaries/lists.
  - Commit success messaging now includes additive fandom outcome counts (profiles upserted and fallback images imported when returned).
  - Settings behavior remains persisted-link based (no synthetic rows), compatible with backend show-level fandom link discovery.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web exec vitest run tests/show-bravo-cast-only-wiring.test.ts tests/show-bravo-cast-only-preview-details.test.ts tests/show-bravo-fandom-integration-wiring.test.ts tests/show-settings-links-fandom-visibility.test.ts tests/show-bravo-preview-stream-proxy-route.test.ts` (`5 files, 10 tests passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' tests/show-bravo-cast-only-wiring.test.ts tests/show-bravo-cast-only-preview-details.test.ts tests/show-bravo-fandom-integration-wiring.test.ts tests/show-settings-links-fandom-visibility.test.ts` (pass; existing pre-existing `@next/next/no-img-element` warnings only)

Continuation (same session, 2026-02-24) — Reddit Community View UX + season-aware Episode Discussion refresh/save:
- Scope:
  - `TRR-APP/apps/web` only.
- Delivered:
  - Added community-level episode discussion rule storage + seed migration:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/db/migrations/028_add_episode_discussion_rules_to_admin_reddit_communities.sql`
    - New fields on `admin.reddit_communities`:
      - `episode_title_patterns` (jsonb array)
      - `episode_required_flares` (jsonb array)
    - Seeded `bravorealhousewives` patterns:
      - `Live Episode Discussion`
      - `Post Episode Discussion`
      - `Weekly Episode Discussion`
  - Added rule sanitization helper:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-episode-rules.ts`
  - Extended repository model/persistence:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-sources-repository.ts`
    - Community read/create/update now includes/sanitizes `episode_title_patterns`, `episode_required_flares`.
  - Extended communities APIs:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/route.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/route.ts`
    - POST/PATCH validate and accept new episode rule arrays.
  - Added episode discovery service path:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-discovery-service.ts`
    - New `discoverEpisodeDiscussionThreads(...)` with deterministic gates:
      1. Title contains configured episode phrase.
      2. Text contains show term/alias.
      3. Season token match (`Season N` or `S<N>`).
      4. For non-show-focused with `episode_required_flares`, flair must match.
  - Added new APIs:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/refresh/route.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/save/route.ts`
  - Added Community View page:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/social-media/reddit/communities/[communityId]/page.tsx`
    - Supports season context query params + `return_to` back navigation.
  - Updated Reddit manager UX:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/reddit-sources-manager.tsx`
    - Replaced heading text `Selected Community` -> `Community`.
    - Added Community View button and title hyperlink.
    - Added focused mode props:
      - `initialCommunityId`
      - `hideCommunityList`
      - `backHref`
    - Moved Community Focus controls into new `Community Settings` section.
    - Added `Episode Discussion Communities` controls:
      - pattern chips + add/remove
      - required-flair chips (non-show-focused)
      - `REFRESH` + candidate preview with upvotes/comments/flair/timestamp
      - `Save Selected` bulk persist.
  - Build unblock fix encountered during validation:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/AdminBreadcrumbs.tsx`
    - Switched breadcrumb links to anchors for string href compatibility with typed-link constraints.

- Tests added/updated:
  - Updated:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-communities-route.test.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-route.test.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-discovery-service.test.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-sources-manager.test.tsx`
  - Added:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-episode-refresh-route.test.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-episode-save-route.test.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-view-page.test.tsx`

- Validation run:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/reddit-communities-route.test.ts tests/reddit-community-route.test.ts tests/reddit-discovery-service.test.ts tests/reddit-sources-manager.test.tsx tests/reddit-community-episode-refresh-route.test.ts tests/reddit-community-episode-save-route.test.ts tests/reddit-community-view-page.test.tsx` (`7 files, 41 tests passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (`0 errors, 9 warnings` pre-existing/non-blocking)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec next build --webpack` (pass)

- Known unrelated test instability observed:
  - `tests/season-social-analytics-section.test.tsx` has one existing time-window assertion failure in `supports day-specific ingest runs` (`end-start` exceeds 24h by ~1s in CI/local timing), plus existing non-fatal `act(...)` warnings.
- Additional validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run db:migrate` (applied `028_add_episode_discussion_rules_to_admin_reddit_communities.sql`)

Continuation (same session, 2026-02-24) — Bravo/Social analytics hardening pass (timeouts, season hints, ET consistency, partial-render resilience):
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/social-season-hint-routes.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/social-week-detail-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-social-load-resilience-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-load-resilience-wiring.test.ts`
- Root cause/focus:
  - Social/Bravo surfaces still had fail-closed loading dependencies, request amplification on some routes, missing `season_id` hint forwarding in week/detail flows, and timezone drift (browser-local vs ET) in day-range/window display.
- Changes:
  - Social component (`season-social-analytics-section`):
    - Added ET-standardized formatting (`America/New_York`) for date/time display and day range generation.
    - Reworked day ingest range generation to ET day boundaries using UTC conversion of ET midnight + next-day-minus-1ms.
    - Added exported request-key helpers and switched in-flight dedupe from single shared promise slots to key-scoped maps to prevent stale cross-filter reuse.
    - Weekly week links now include `season_id` and preserve existing query context.
  - Show page (`[showId]/page.tsx`):
    - Added core-load timeout usage for show/seasons/coverage fetches.
    - Replaced fail-closed seasons dependency behavior with social-scoped warning (`socialDependencyError`) so social area remains usable when season dependency fetches degrade.
    - Initial load now uses `Promise.allSettled([fetchSeasons(), checkCoverage()])` to avoid blocking on secondary dependency failures.
  - Season page (`seasons/[seasonNumber]/page.tsx`):
    - Split load path into core identity fetch vs supplemental season data fetch.
    - Supplemental failures now set scoped warning (`seasonSupplementalWarning`) instead of global `error`, keeping social analytics section renderable once core season identity resolves.
  - Week detail page:
    - ET date/time display normalization.
    - Added `season_id` + `timezone` forwarding to week detail fetch.
    - Added `season_id` forwarding to week runs/jobs polling and week ingest trigger.
    - Back-link now preserves `source_scope`, `social_platform`, `social_view`, and `season_id`.
    - Activity log timestamps no longer include seconds.
  - Proxy routes:
    - `social/jobs`: added `season_id` validation + `seasonIdHint` forwarding; reduced to `retries: 0`, `timeoutMs: 15_000`.
    - `social/analytics/week/[weekIndex]`: added `season_id` validation + `seasonIdHint`; reduced retries to `0`.
    - `social/analytics/posts/[platform]/[sourceId]`: added `season_id` validation + `seasonIdHint` for GET and POST; GET retries reduced to `0`.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx tests/social-admin-proxy.test.ts tests/use-admin-guard-stability.test.tsx`
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx tests/social-season-hint-routes.test.ts tests/social-week-detail-wiring.test.ts tests/show-social-load-resilience-wiring.test.ts tests/season-social-load-resilience-wiring.test.ts`
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/components/admin/season-social-analytics-section.tsx 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route.ts' tests/season-social-analytics-section.test.tsx tests/social-season-hint-routes.test.ts tests/social-week-detail-wiring.test.ts tests/show-social-load-resilience-wiring.test.ts tests/season-social-load-resilience-wiring.test.ts`
  - ESLint produced only pre-existing warnings in `[showId]/page.tsx` (`@next/next/no-img-element`), no new errors.

Continuation (same session, 2026-02-24) — Admin Networks detail gallery + not-found suggestions + wrap hardening:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/networks-streaming-repository.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/networks-streaming/detail/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/networks/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/networks/[entityType]/[entitySlug]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/networks-streaming-detail-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/admin-networks-page-auth.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/admin-network-detail-page.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/admin-network-detail-page-auth.test.tsx`
- Changes:
  - Added DB-backed detail repository for networks/streaming with `logo_assets[]` sourced from `admin.network_streaming_logo_assets`.
  - Added not-found suggestion resolver (`top 8`) and expanded detail API 404 payload to `{ error: "not_found", suggestions }`.
  - Updated `/admin/networks/[entityType]/[entitySlug]`:
    - canonical Color/Black/White cards remain,
    - added full “Mirrored Logo Gallery” grid with source, rank, format, dimensions, status, source URL, and primary badge,
    - added suggestion-based not-found container for invalid slugs.
  - Updated `/admin/networks` summary UI:
    - row links now route to detail pages,
    - sync success panel now shows `logo_assets_*` counters,
    - retained type pill filter (Both/Network/Streaming Services),
    - hardened long-text wrapping in table and unresolved sections.
  - Hardened admin dashboard card/header wrapping in `/admin/page.tsx` so long text does not clip.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web exec vitest run tests/networks-streaming-detail-route.test.ts tests/admin-networks-page-auth.test.tsx tests/admin-network-detail-page.test.tsx tests/admin-network-detail-page-auth.test.tsx` (`14 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-24) — Season social analytics UX compaction + operator trust/readability pass:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-social-subnav-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/social-admin-proxy.test.ts`
- Changes:
  - Weekly heatmap readability/size fixes:
    - compact fixed-size tiles (`compact`/`comfortable`) with `social_density` query persistence,
    - `inline-grid` + non-stretched day cells,
    - stacked month/day labels and keyboard-focusable day buttons.
  - Day/week drilldown:
    - day tiles route to week-detail with `day=YYYY-MM-DD` prefilter and preserved social query context.
  - Data trust UX:
    - data-quality badges (`Coverage`, `Freshness`, `Last Ingest`) rendered above heatmap.
  - Weekly anomaly UX:
    - per-week flag chips rendered from `weekly_flags`,
    - alerts toggle persisted via `social_alerts=on|off`.
  - Advanced/operator panel upgrades:
    - `Run Health` card (success rate, median duration, grouped active failures),
    - `Consistency & Momentum` compare card (prev-week vs trailing baseline toggle),
    - comment-gap callout with one-click comments-only backfill action,
    - failed job rows now include `Retry Failed Stage` CTA.
- Tests:
  - Added/expanded tests for:
    - data-quality badge rendering,
    - density toggle + query sync,
    - weekly flags visibility + alerts toggle behavior,
    - advanced run-health/benchmark panel rendering.
  - Existing heatmap/platform/schedule tests remain passing.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/components/admin/season-social-analytics-section.tsx' 'src/lib/server/trr-api/social-admin-proxy.ts' 'tests/season-social-analytics-section.test.tsx' 'tests/show-social-subnav-wiring.test.ts' 'tests/social-admin-proxy.test.ts'` (pass with 2 pre-existing `@next/next/no-img-element` warnings in `/src/app/admin/trr-shows/[showId]/page.tsx`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx tests/show-social-subnav-wiring.test.ts tests/social-admin-proxy.test.ts` (`43 passed`)
- Note:
  - Vitest still emits pre-existing React `act(...)` warnings for the long-running polling test path in `tests/season-social-analytics-section.test.tsx`; tests pass and behavior unchanged.

Continuation (same session, 2026-02-24) — Week-detail breadcrumb show crumb clickability:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/admin-breadcrumbs.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/admin-breadcrumbs.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/social-week-detail-wiring.test.ts`
- Changes:
  - Extended breadcrumb helpers to support optional `showHref` through `buildShowBreadcrumb`, `buildSeasonBreadcrumb`, and `buildSeasonWeekBreadcrumb`.
  - Week-detail page now computes `breadcrumbShowHref` via `buildShowAdminUrl({ showSlug: showSlugForRouting })` and passes it into `buildSeasonWeekBreadcrumb(...)` so the show segment is a clickable ancestor crumb.
  - Added wiring coverage to assert week page includes `buildShowAdminUrl(...)` + `showHref` handoff in breadcrumb construction.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web exec vitest run -c vitest.config.ts tests/admin-breadcrumbs.test.ts tests/social-week-detail-wiring.test.ts` (`10 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP && pnpm -C apps/web run lint` (pass; warnings only, no errors)

Continuation (same session, 2026-02-24) — Week-view sync progress refresh stability during comment fill:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/social-week-detail-wiring.test.ts`
- Root cause focus:
  - Week-detail polling retried immediately on transient misses and showed timeout banner on single failures.
  - Poll request shape for runs was broad (`limit=100`) instead of run-scoped, increasing backend load under active ingest.
- Changes:
  - Runs polling is now run-scoped: `run_id=<syncRunId>&limit=1` (plus `season_id` hint when available).
  - Added adaptive poll backoff (`3s -> 6s -> 10s -> 15s`) during failure streaks, reset on success.
  - Added consecutive-failure threshold for bannering: `Progress refresh issue...` now shows only after 2 consecutive poll failures.
  - Preserved last-good run/jobs snapshot during transient empty/missing responses to reduce UI churn.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/social-week-detail-wiring.test.ts tests/season-social-analytics-section.test.tsx` (`41 passed`)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts' tests/social-week-detail-wiring.test.ts` (pass)

Continuation (same session, 2026-02-24) — Social live-update retry banner stabilization for active ingest runs:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/social-season-hint-routes.test.ts`
- Root cause evidence:
  - `/Users/thomashulihan/Projects/TRR/.logs/workspace/trr-app.log` showed recurring `/social/runs` and `/social/jobs` requests completing near the 15s timeout edge, followed by 504 timeout errors and retry banner flips.
  - Poll path was querying full runs list (`limit=100`) every cycle and jobs requests could overlap from multiple callers (selected-run fetch + poll fetch), increasing load and timeout risk.
- Changes:
  - Increased UI/proxy timeout margins for runs/jobs from `15_000` to `20_000` ms.
  - Poll runs request now uses run-scoped query (`run_id=<activeRunId>&limit=1`) instead of fetching full run list.
  - Added jobs single-flight dedupe in `season-social-analytics-section` (`jobsByKey`) to prevent concurrent duplicate `/social/jobs` calls for the same run.
  - Kept retry banner threshold behavior (2 consecutive failures), but reduced poll-path sensitivity by throttling analytics refresh during poll (`ANALYTICS_POLL_REFRESH_MS=30_000`) and making analytics refresh best-effort (does not fail runs/jobs progress polling).
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx tests/social-season-hint-routes.test.ts` (`44 passed`; existing React `act(...)` warnings remain non-fatal)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint 'src/components/admin/season-social-analytics-section.tsx' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts' tests/season-social-analytics-section.test.tsx tests/social-season-hint-routes.test.ts` (pass)

Continuation (same session, 2026-02-24) — Reddit Sources timeout resilience during season-context preload:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/reddit-sources-manager.tsx`
- Root cause evidence:
  - Manager-wide abort timeout (`20_000ms`) surfaced as global `Request timed out. Please try again.`.
  - Season/period context preload effect (`loadSeasonAndPeriodContext`) wrote failures into global `error`, so slow season/social analytics requests could look like core community load failure.
  - Episode refresh previously hard-required local season context (`episodeSeasonId` + `episodeSeasonNumber`) and blocked refresh when context preload failed.
- Changes:
  - Increased admin request timeout in manager from `20_000` -> `60_000` ms.
  - Added local episode-context warning state and stopped routing season-context preload failures to global error banner.
  - Episode refresh now allows server-default context fallback (omits `season_id`/`season_number` when unavailable).
  - On refresh response, manager hydrates local season context from `meta.season_context` when provided.
  - Season selector period-load failures now set local episode warning instead of global manager error.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint src/components/admin/reddit-sources-manager.tsx` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/reddit-sources-manager.test.tsx` (`10 passed`)

Continuation (same session, 2026-02-24) — Editorial redesign of Season Social Analytics header container (top + immediate controls):
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
- Scope:
  - Reworked only top surface (identity/header + current run + filters + season details + platform tabs + live status banners).
  - No backend/API contract changes.
- UI/UX changes:
  - Introduced clearer editorial hierarchy with differentiated card weights.
  - Current Run block now has actionable empty state:
    - `Select Latest Run` (when runs exist)
    - `Start New Ingest` (scroll/focus into Ingest + Export controls)
  - Season Details now shows readable/truncated season id with `Copy` action and inline copied/failed feedback.
  - Platform tabs retained behavior but got stronger active/focus styling.
  - Live polling/retry banners and section-level warning cards moved into the top controls surface for immediate operator context.
  - Added helper utilities:
    - `truncateIdentifier(...)`
    - `copyTextToClipboard(...)` with clipboard API + fallback.
- Accessibility/interaction notes:
  - Added semantic region labels (`aria-label`) on top controls groups.
  - Added focus target to ingest panel and run-ingest button for empty-state CTA handoff.
  - Preserved all existing query/state behavior for scope/week/run/platform.
- Tests:
  - Added coverage for new header behaviors:
    - actionable empty state rendering
    - latest-run selection action
    - season-id copy action
  - Existing ordering test (platform tabs above filters) remains green.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx tests/social-week-detail-wiring.test.ts` (`44 passed`; existing non-fatal React `act(...)` warnings persist on long-polling test path)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/components/admin/season-social-analytics-section.tsx tests/season-social-analytics-section.test.tsx` (pass)
- Intentional deviation from figma-specific workflow:
  - No Figma file/node URL was provided; implementation followed existing TRR design language and requested editorial direction without design-token contract changes.

Continuation (same session, 2026-02-24) — Cast tab reliability pass + roles timeout hardening:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/roles/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/roles/[roleId]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-roles-proxy-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-role-mutation-proxy-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-lazy-loading-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-cast-tab-quality-wiring.test.ts`
- Changes:
  - Hardened show roles proxy GET:
    - timeout increased to `120_000`,
    - retry once on retryable upstream/network failures,
    - additive error envelope fields (`code`, `retryable`, `upstream_status`).
  - Added timeout guards for roles mutations:
    - roles `POST` timeout (`60_000`) in show roles route,
    - roles `PATCH` timeout (`60_000`) in role detail route.
  - Show cast page reliability:
    - aborts in-flight cast pipeline/media runs on show switch/reset,
    - role-catalog loading now retries once and preserves stale snapshot with warning text,
    - cast tab now shows explicit `Retry Roles` controls for warning/error states,
    - role assignment flow removed redundant double role reload and batches missing-role creation with bounded concurrency.
  - Cast progress UX:
    - cast progress bar now prefers active phase progress (`castRefreshPhaseStates`) before falling back to legacy `cast_credits` progress.
  - Season cast page reliability:
    - aborts in-flight season cast refresh on show/season change,
    - split retry banners so `castRoleMembersError` retries `fetchCastRoleMembers(...)` and `trrShowCastError` retries `fetchShowCastForBrand()`.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/show-roles-proxy-route.test.ts tests/show-role-mutation-proxy-route.test.ts tests/show-cast-lazy-loading-wiring.test.ts tests/season-cast-tab-quality-wiring.test.ts` (`21 passed`)

Continuation (same session, 2026-02-24) — Senior frontend QA hardening pass on redesigned social header:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
- QA findings addressed:
  - Prevented potential horizontal overflow in top header grid under long run labels/metadata by adding `min-w-0` to grid columns.
  - Improved copy feedback accessibility by marking season ID copy feedback as live status (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`).
  - Replaced timeout-based ingest focus handoff with `requestAnimationFrame` for more deterministic focus transfer after CTA click.
  - Added regression assertion for live status copy feedback in component tests.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx` (`39 passed`; existing non-fatal React `act(...)` warnings persist on long-polling scenario)
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/components/admin/season-social-analytics-section.tsx tests/season-social-analytics-section.test.tsx` (pass)

Continuation (same session, 2026-02-24) — News tab hardening for async Google sync, backend filtering/pagination, and timeout alignment.
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/news/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/google-news/sync/route.ts`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]/route.ts` (new)
  - `apps/web/tests/show-news-proxy-route.test.ts`
  - `apps/web/tests/show-google-news-sync-proxy-route.test.ts`
  - `apps/web/tests/show-google-news-sync-status-proxy-route.test.ts` (new)
- Changes:
  - Increased proxy timeouts for news read/sync to align with backend budgets.
  - Added proxy route for Google sync job status polling.
  - Updated News tab sync flow to call Google sync in async mode and poll job status with explicit timeout handling.
  - Fixed auto-sync bookkeeping so `newsAutoSyncAttempted` is set only after successful sync.
  - Switched unified news loads to backend-driven filters (`person_id`, `source`, `topic`, `season_number`) and pagination (`limit`, `cursor`) with load-more support.
  - Added additive UI support for new item fields (`canonical_article_url`, mirror status/attempt metadata, quality score).
- Validation:
  - `pnpm -C apps/web exec tsc --noEmit` (pass)
  - `pnpm -C apps/web exec vitest run tests/show-news-proxy-route.test.ts tests/show-google-news-sync-proxy-route.test.ts tests/show-google-news-sync-status-proxy-route.test.ts tests/show-news-tab-google-wiring.test.ts` (`6 passed`)
  - `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/news/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/google-news/sync/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]/route.ts' 'tests/show-news-proxy-route.test.ts' 'tests/show-google-news-sync-proxy-route.test.ts' 'tests/show-google-news-sync-status-proxy-route.test.ts'` (pass with existing `@next/next/no-img-element` warnings in show page)

## 2026-02-24 Media Pipeline Stabilization (Codex)
- Fixed person gallery stage button wiring so Sync/Count/Crop/ID Text/Auto-Crop trigger stage-specific refresh/reprocess payloads.
- Updated image pipeline partial-failure handling to complete with warnings (no fatal throw when `allowPartialFailures=true`).
- Fixed lightbox auto-crop refresh action to run auto-count + variants pipeline.
- Increased show/season cast-person stream idle watchdog from 90s to 600s.
- Hardened `/api/admin/trr-api/shows/[showId]/refresh/stream` proxy with retryable upstream fetch handling and no-store SSE headers.
- Allowed explicit `people_count=0` in cast-photo and media-link tag routes.
- Scoped media-link tag context writes to targeted links using per-link context updates.
- Updated tests:
  - `tests/tags-people-count-source-route.test.ts`
  - `tests/show-refresh-stream-route.test.ts`

Continuation (same session, 2026-02-24) — Shows/Seasons admin a11y + reliability fixes from audit backlog.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/AdminBreadcrumbs.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
- Changes:
  - `AdminBreadcrumbs` now uses Next.js client navigation (`next/link`) for ancestor crumbs and no longer uses index-based keys.
  - Show page:
    - Replaced network/show header raw `<img>` usages with `next/image`.
    - Replaced remaining index-based/URL+index list keys in targeted admin sections with stable keys.
    - Replaced prompt-based edit flows for links/roles/cast-role assignment with controlled modal editors.
    - Added user-visible coverage mutation errors (instead of console-only failures).
    - Added request timeout guards for Google News link mutations, cast-matrix sync, and covered-shows mutations.
    - Upgraded refresh-log/sync-by-bravo/batch-jobs modal structures with dialog semantics (`role="dialog"`, `aria-modal`, focus target, Escape close, keyboard-accessible backdrop).
  - Season page:
    - Replaced blocking media delete `alert(...)` path with inline admin error channel (`assetsRefreshError`).
    - Converted batch-jobs and add-backdrops overlays to keyboard-accessible backdrop buttons.
    - Added dialog semantics + focus/Escape handling to season batch-jobs and add-backdrops panels.
    - Replaced remaining targeted unstable list keys with stable keys.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/components/admin/AdminBreadcrumbs.tsx' 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx'` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/admin-breadcrumbs.test.ts tests/admin-breadcrumbs-component.test.tsx tests/admin-networks-page-auth.test.tsx tests/admin-network-detail-page-auth.test.tsx tests/person-credits-show-scope-wiring.test.ts` (`14 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass with pre-existing workspace warnings unrelated to these files)

Continuation (same session, 2026-02-24) — News hardening phase 2 UI/proxy updates.
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]/route.ts`
  - `apps/web/tests/show-news-tab-google-wiring.test.ts`
  - `apps/web/tests/show-google-news-sync-status-proxy-route.test.ts`
- Changes:
  - News request race protection:
    - Added in-flight query-key guard + request sequence ref so stale in-flight reads do not clobber newer filter/sort requests.
    - Added follow-up rerun behavior when query intent changes while a request is in flight.
  - Backend-facet-driven filter UI:
    - Added additive news facet types/state (`sources`, `people`, `topics`, `seasons`).
    - Filter dropdown options now come from backend facets instead of client-side page-local derivation.
    - Removed redundant client-side filtering (`filteredUnifiedNews`) for server-backed filters.
  - Count display and pagination semantics:
    - Added page count state and updated UI copy to `Showing X of Y` using backend count/total.
  - Proxy timeout alignment:
    - Increased Google sync-status proxy timeout to 60s to match polling envelope.
- Validation:
  - `pnpm -C apps/web exec vitest run tests/show-news-proxy-route.test.ts tests/show-google-news-sync-status-proxy-route.test.ts tests/show-news-tab-google-wiring.test.ts` (`6 passed`)
  - `pnpm -C apps/web exec vitest run tests/show-google-news-sync-proxy-route.test.ts` (`1 passed`)
  - `pnpm -C apps/web exec tsc --noEmit` (fails due pre-existing unrelated type issue in `src/components/admin/AdminBreadcrumbs.tsx` from workspace-local changes)
- Follow-up validation (same continuation):
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)
  - Re-ran breadcrumb/admin targeted vitest set after typed-route `Link` update (`14 passed`).

Continuation (same session, 2026-02-24) — Social analytics timeout/reliability fixes (targeted bug pass).
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/social-season-hint-routes.test.ts`
- Changes:
  - Enforced strict `season_id` UUID validation on runs summary route (returns `400` on malformed value).
  - Raised targets timeout budget (`12s` -> `15s`) on both client and proxy route to reduce false timeout churn.
  - Tuned jobs/week-analytics proxy routes to poll-friendly settings (`retries: 0`, lower timeout) to avoid retry amplification.
  - Added week-view post drawer propagation of `season_id` for both post detail GET and refresh POST.
  - Added timeout-bound post drawer network calls (GET/POST) to prevent indefinite waits.
  - Hardened week-view sync progress fetch to tolerate partial endpoint failure (`runs` or `jobs`) instead of fail-closed behavior when one side succeeds.
  - Added route regression for runs summary invalid `season_id`.
  - Updated analytics-timeout test timer envelope to cover current timeout budget and avoid false negatives in fake-timer mode.
  - Added explicit poll error surfacing in season social polling catch path (no silent swallow).
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/social-season-hint-routes.test.ts tests/social-week-detail-wiring.test.ts` (`14 passed`).
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts' 'src/components/admin/season-social-analytics-section.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'tests/social-season-hint-routes.test.ts'` (pass with one pre-existing hook-deps warning in week detail page).
  - Note: `tests/season-social-analytics-section.test.tsx` contains an existing timer-sensitive timeout assertion that remained flaky in this workspace after broader social header/polling changes.

Continuation (same session, 2026-02-24) — Sync-by-Bravo mode confirmation + preview-signature commit guard wiring.
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/tests/show-bravo-cast-only-wiring.test.ts`
- Changes:
  - Added sticky selected-mode summary in Sync-by-Bravo modal (`Sync All Info` vs `Cast Info only`) through preview/commit flow.
  - Stored preview `preview_signature` from both preview JSON and preview stream complete payload.
  - Required cast-only preview signature before commit and sent additive `preview_signature` in commit payload.
  - Cleared preview-signature state on flow reset/cancel to prevent stale commit payload reuse.
  - Updated wiring tests to assert `preview_signature` propagation and mode-summary UI text.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/show-bravo-cast-only-wiring.test.ts` (`2 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'tests/show-bravo-cast-only-wiring.test.ts'` (pass)

Continuation (same session, 2026-02-24) — Reliable comment sync auto-pass loop + coverage-aware completion.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/comments-coverage/route.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/week-social-thumbnails.test.tsx`
- Changes:
  - Added reusable comments-coverage proxy route and wired frontend orchestrators to evaluate strict up-to-date (`saved >= reported`) after each terminal run.
  - Implemented pass-based auto-continuation for week and season run flows with guardrail stop (`8 passes` or `90 minutes`), including explicit `Stalled` state.
  - Ensured orchestrated follow-up passes use:
    - `ingest_mode: "comments_only"`
    - `sync_strategy: "incremental"`
    - `allow_inline_dev_fallback: true`
  - Hardened proxy route budgets:
    - week detail `45s` / `1 retry`
    - runs/jobs `30s` / `2 retries`
    - analytics `35s` / `1 retry`
  - Updated week sync test expectations to the pass-based UX copy and coverage endpoint flow.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/week-social-thumbnails.test.tsx tests/season-social-analytics-section.test.tsx` (`44 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass; warnings only, no errors)
  - Note: full-suite `vitest` in this workspace currently has unrelated pre-existing failures outside social sync scope (person gallery thumbnail wiring and person refresh stream route contract assertion).

Continuation (same session, 2026-02-24) — final alignment updates for reliable multi-pass comment sync.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/week-social-thumbnails.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/social-season-hint-routes.test.ts`
- Changes:
  - Updated proxy budgets to match plan:
    - week analytics route => `retries: 1`, `timeoutMs: 45_000`
    - jobs route => `retries: 2`, `timeoutMs: 30_000`
  - Week page now uses scoped `/analytics/comments-coverage` snapshot as live coverage preview during active multi-pass sync sessions, preventing stale in-memory `Saved/Actual` display while auto-continuing.
  - Updated week sync test and season-id hint route tests to new pass-based UX and timeout/retry expectations.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/week-social-thumbnails.test.tsx tests/social-season-hint-routes.test.ts tests/social-week-detail-wiring.test.ts tests/season-social-analytics-section.test.tsx` (`58 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts' 'src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts' 'tests/week-social-thumbnails.test.tsx' 'tests/social-season-hint-routes.test.ts'` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` currently fails from unrelated pre-existing show page issue (`SurveysSection` undefined in `src/app/admin/trr-shows/[showId]/page.tsx`).

Continuation (same session, 2026-02-24) — BravoRealHousewives RHOSLC episode discussion matrix + effective flair rules:
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-episode-rules.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-discovery-service.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/refresh/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/reddit-sources-manager.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-discovery-service.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-episode-refresh-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-sources-manager.test.tsx`
- Changes:
  - Added episode rule resolver for `r/BravoRealHousewives` to enforce unioned default title patterns (`Live/Post/Weekly Episode Discussion`) and RHOSLC temporary flair auto-seed (`Salt Lake City`) when non-show-focused and `analysis_all_flares` is empty.
  - Expanded episode discovery candidates with deterministic `episode_number` + `discussion_type` parsing from title.
  - Added episode matrix aggregation (`Episode x Type`) with per-cell `post_count`, `total_comments`, `total_upvotes`, and `top_post_id`.
  - Updated episode refresh route payload to return:
    - `episode_matrix`
    - `meta.effective_episode_title_patterns`
    - `meta.effective_required_flares`
    - `meta.auto_seeded_required_flares`
  - Updated Reddit Sources manager episode section to render grouped matrix and top-post links, show auto-seed banner, and rename secondary refresh CTA to `Refresh Episode Discussions`.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass with existing warnings only)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/reddit-discovery-service.test.ts tests/reddit-community-episode-refresh-route.test.ts tests/reddit-sources-manager.test.tsx` (`25 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec next build --webpack` (fails due unrelated existing TS error in `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx:5424` — `Cannot find name 'addBackdropsDialogRef'`)

Continuation (same session, 2026-02-24) — SHOW pages hardening + incremental modularization.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/trr-api/trr-shows-repository.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/_components/ShowTabsNav.tsx` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/_components/ShowSeasonCards.tsx` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/_components/ShowAssetsImageSections.tsx` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-featured-image-validation-route.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/trr-shows-repository-featured-image-validation.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-page-modularization-wiring.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/trr-shows-slug-route.test.ts`
- Changes:
  - Added server-side featured-image validation for show PUT updates:
    - `validateShowImageForField(showId, imageId, expectedKind)` checks `core.show_images` ownership (`show_id`) and normalized kind (`poster`/`backdrop`, including `background` alias).
    - `PUT /api/admin/trr-api/shows/[showId]` now validates non-null `primary_poster_image_id` and `primary_backdrop_image_id` before update.
    - Invalid assignments now return `400` with explicit field-level errors and emit warning logs with `showId`, field, and rejected image ID.
    - `null` clear semantics and existing response shape (`{ show }` / `{ error }`) remain unchanged.
  - Incremental show-page modularization (behavior-preserving):
    - Extracted show tab nav to `ShowTabsNav`.
    - Extracted season cards + deep-link chips to `ShowSeasonCards`.
    - Extracted featured-aware backdrops/posters gallery sections to `ShowAssetsImageSections`.
    - Kept state/fetch orchestration and lightbox featured-action wiring in `[showId]/page.tsx`.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/show-admin-routes.test.ts tests/season-tab-alias-redirect.test.ts tests/show-page-tab-order-wiring.test.ts tests/season-page-tab-order-wiring.test.ts tests/show-featured-image-lightbox-wiring.test.ts tests/show-featured-image-validation-route.test.ts tests/trr-shows-repository-featured-image-validation.test.ts tests/show-page-modularization-wiring.test.ts tests/trr-shows-slug-route.test.ts` (`34 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/api/admin/trr-api/shows/[showId]/route.ts' src/lib/server/trr-api/trr-shows-repository.ts 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/_components/ShowTabsNav.tsx' 'src/app/admin/trr-shows/[showId]/_components/ShowSeasonCards.tsx' 'src/app/admin/trr-shows/[showId]/_components/ShowAssetsImageSections.tsx' tests/show-featured-image-validation-route.test.ts tests/trr-shows-repository-featured-image-validation.test.ts tests/show-page-modularization-wiring.test.ts tests/trr-shows-slug-route.test.ts` (no errors; existing warnings remain in large show page and one pre-existing repository helper warning)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (fails on pre-existing unrelated show-page type narrowing at `src/app/admin/trr-shows/[showId]/page.tsx:7915-7916`, `failedMembers` on `never`)
- One-time audit query (dev/staging) for invalid featured references:
  - `SELECT s.id AS show_id, s.name, s.primary_poster_image_id, p.show_id AS poster_show_id, p.image_type AS poster_image_type, s.primary_backdrop_image_id, b.show_id AS backdrop_show_id, b.image_type AS backdrop_image_type FROM core.shows s LEFT JOIN core.show_images p ON p.id = s.primary_poster_image_id LEFT JOIN core.show_images b ON b.id = s.primary_backdrop_image_id WHERE (s.primary_poster_image_id IS NOT NULL AND (p.id IS NULL OR p.show_id <> s.id OR lower(coalesce(p.image_type, p.kind, '')) NOT IN ('poster'))) OR (s.primary_backdrop_image_id IS NOT NULL AND (b.id IS NULL OR b.show_id <> s.id OR lower(coalesce(b.image_type, b.kind, '')) NOT IN ('backdrop','background')));`

Continuation (same session, 2026-02-24) — Phase 2 admin hardening: shared modal, shared fetch helper, and tab extraction pass.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/AdminModal.tsx` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/admin-fetch.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/show-tabs/ShowSurveysTab.tsx` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-tabs/SeasonSurveysTab.tsx` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-tabs/SeasonOverviewTab.tsx` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/admin-modal.test.tsx` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/admin-fetch.test.ts` (new)
- Changes:
  - Added shared `AdminModal` primitive with:
    - `role="dialog"` + `aria-modal`,
    - keyboard escape handling,
    - backdrop close behavior,
    - focus trap (Tab / Shift+Tab loop),
    - focus restore to the previously-focused element on close,
    - disable-close mode for in-flight operations.
  - Added shared admin fetch utility in `lib/admin/admin-fetch.ts` and moved show/season pages to import `fetchWithTimeout` from this shared helper (removed duplicated local implementations).
  - Migrated concrete modals to `AdminModal`:
    - show page: batch jobs, link edit, role rename, cast-role edit,
    - season page: batch jobs modal and add-backdrops drawer.
  - Started tab modularization pass by extracting:
    - show surveys tab -> `ShowSurveysTab`,
    - season surveys tab -> `SeasonSurveysTab`,
    - season overview tab -> `SeasonOverviewTab`.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/components/admin/AdminModal.tsx' 'src/lib/admin/admin-fetch.ts' 'src/components/admin/show-tabs/ShowSurveysTab.tsx' 'src/components/admin/season-tabs/SeasonSurveysTab.tsx' 'src/components/admin/season-tabs/SeasonOverviewTab.tsx' 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx'` (pass; warnings only)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/admin-modal.test.tsx tests/admin-fetch.test.ts tests/show-social-subnav-wiring.test.ts tests/season-social-subnav-wiring.test.ts tests/show-page-tab-order-wiring.test.ts tests/season-page-tab-order-wiring.test.ts tests/show-settings-links-fandom-visibility.test.ts tests/admin-breadcrumbs.test.ts tests/admin-breadcrumbs-component.test.tsx` (`21 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass with pre-existing repo warnings)

Continuation (same session, 2026-02-24) — News Stability Patch Set (remaining app-side fixes + typed Link blocker).
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/AdminBreadcrumbs.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-news-tab-google-wiring.test.ts`
- Changes:
  - Reworked show-page News loading flow to deterministic latest-request-wins:
    - removed waiter-chaining behavior,
    - added single pending follow-up queue refs:
      - `pendingNewsReloadRef`
      - `pendingNewsReloadArgsRef`,
    - retained `newsRequestSeqRef` stale-response guard.
  - Added cursor/query-key safety for pagination:
    - new `newsCursorQueryKeyRef`,
    - append now requires both `newsNextCursor` and cursor-query-key match,
    - stale/mismatched append intents auto-fallback to non-append forced reload.
  - Added append-failure cleanup:
    - clears `newsNextCursor` + `newsCursorQueryKeyRef`,
    - preserves already-rendered items,
    - surfaces actionable cursor-reset error message.
  - Cleared pending/cursor refs on show reset to avoid cross-show state bleed.
  - Fixed breadcrumb typed-route blocker:
    - internal paths continue using `next/link` with `Route` cast,
    - non-internal hrefs render as plain anchors.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/show-news-tab-google-wiring.test.ts tests/show-google-news-sync-status-proxy-route.test.ts tests/admin-breadcrumbs-component.test.tsx` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/components/admin/AdminBreadcrumbs.tsx'` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-24) — Social analytics 22-item hardening pass (app segment).
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/comments-coverage/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/export/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-load-resilience-wiring.test.ts`
- Changes:
  - Removed retry amplification on core social polling endpoints and standardized bounded timeouts (`runs/jobs 15s`, `analytics 22s`, `week/comments-coverage 20s`, retries `0`).
  - Standardized `season_id` UUID validation + `seasonIdHint` forwarding in social proxy routes touched this pass.
  - Landing poll loop now runs `runs` + `jobs` in parallel with `Promise.allSettled`, keeps independent section errors, and applies adaptive backoff (`3s -> 6s -> 10s -> 15s`) while preserving stale data.
  - Reduced jobs poll payload for active runs (`limit=100`) and aligned client timeout constants with proxy settings.
  - Week sync panel now tracks and renders `Last successful progress refresh` timestamp; sync poll timeouts aligned to `15s`.
  - Show/season social tabs are fail-open against optional/supplemental fetch issues (`if (!show)` / `if (!show || !season)` gating only).
  - Updated resilience wiring test to assert current non-blocking supplemental-load pattern instead of brittle old source-string for `Promise.allSettled`.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec vitest run tests/season-social-analytics-section.test.tsx tests/social-week-detail-wiring.test.ts tests/social-season-hint-routes.test.ts tests/show-social-load-resilience-wiring.test.ts tests/season-social-load-resilience-wiring.test.ts` (`62 passed`)
- `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm exec eslint src/components/admin/season-social-analytics-section.tsx src/app/admin/trr-shows/[showId]/page.tsx src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route.ts src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route.ts src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route.ts src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/comments-coverage/route.ts` (pass)

Continuation (same session, 2026-02-24) — Phase 2 modal migration completion (show page remaining dialogs).
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Changes:
  - Finished migrating remaining show-page dialogs to shared `AdminModal`:
    - Health Center (`refreshLogOpen`)
    - Sync by Bravo mode picker (`syncBravoModePickerOpen`)
    - Import by Bravo main dialog (`syncBravoOpen`)
  - Removed now-obsolete manual dialog refs:
    - `refreshLogDialogRef`
    - `syncBravoModeDialogRef`
    - `syncBravoDialogRef`
  - Removed leftover manual Escape key listener for sync mode picker (behavior now owned by `AdminModal`).
  - Preserved existing close semantics for in-flight Bravo sync by wiring `disableClose={syncBravoLoading}` and guarded close handler.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx'` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/admin-modal.test.tsx tests/admin-fetch.test.ts tests/show-social-subnav-wiring.test.ts tests/season-social-subnav-wiring.test.ts tests/show-page-tab-order-wiring.test.ts tests/season-page-tab-order-wiring.test.ts tests/admin-breadcrumbs.test.ts tests/admin-breadcrumbs-component.test.tsx tests/person-credits-show-scope-wiring.test.ts` (`21 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass with existing repo warnings)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` currently fails on unrelated in-progress files outside this slice:
    - `src/app/admin/trr-shows/people/[personId]/page.tsx` (button handler typing)
    - `src/lib/server/admin/reddit-discovery-service.ts` (shape/type updates)

Continuation (same session, 2026-02-24) — show admin TS contract stabilization for Sync-by-Bravo wiring.
- Files:
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/_components/ShowSeasonCards.tsx`
  - `apps/web/tests/show-bravo-cast-only-wiring.test.ts`
- Changes:
  - Tightened local date-range formatter type contract to accept `string | null | undefined` and normalized inputs internally.
  - Removed tab-selection cast at show tabs callsite by passing typed callback directly.
  - Simplified season-card formatter wiring to pass the typed formatter directly.
  - Added cast-only commit-guard wiring assertion in Sync-by-Bravo test (`cast-only` requires `syncBravoPreviewSignature`).
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/show-bravo-cast-only-wiring.test.ts` (`2 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/_components/ShowTabsNav.tsx' 'src/app/admin/trr-shows/[showId]/_components/ShowSeasonCards.tsx' 'tests/show-bravo-cast-only-wiring.test.ts'` (pass)

Continuation (same session, 2026-02-24) — Cast Tab additional quality pass (show + season, single frontend patch).
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/cast-route-state.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-lazy-loading-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-cast-tab-quality-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/cast-route-state.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/cast-incremental-render.test.tsx` (new)
- Changes:
  - Added cast URL-state helper (`cast_q`, `cast_sort`, `cast_order`, `cast_img`, plus show/season-specific filter keys) with parse/write round-trip support.
  - Added search + debounced URL persistence on show and season cast tabs; preserves non-cast query params and avoids replace loops.
  - Added show-page overlap guard `castAnyJobRunning` and disabled per-card `Refresh Person`/`Edit Roles` while top-level cast jobs are active.
  - Added deep-link role-edit wiring (`cast_person`, `cast_open_role_editor`) and season per-card parity actions (`Refresh Person`, `Edit Roles` deep-link to show cast editor).
  - Split season top-level cast actions into `Sync Cast` and `Enrich Media` (post-processing only), including cancel and phase-specific notices.
  - Added cast failed-member tracking + collapsible panel + `Retry failed only` action on show and season enrich flows.
  - Added stale snapshot recency metadata to warning surfaces (`Showing last successful snapshot from Xm ago`).
  - Added incremental render for large cast lists (initial 48 + batch 48 via `requestIdleCallback` fallback) and `Rendering X/Y` progress text.
  - Standardized filter-aware cast header counts on both pages: filtered/total cast, crew, and visible totals.
  - Split season loading labels into cast-intelligence vs supplemental-show-cast states.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/show-cast-lazy-loading-wiring.test.ts tests/season-cast-tab-quality-wiring.test.ts tests/cast-route-state.test.ts tests/cast-incremental-render.test.tsx` (`4 files passed`, `26 tests passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/lib/admin/cast-route-state.ts' 'tests/show-cast-lazy-loading-wiring.test.ts' 'tests/season-cast-tab-quality-wiring.test.ts' 'tests/cast-route-state.test.ts' 'tests/cast-incremental-render.test.tsx'` (pass)

Continuation (same session, 2026-02-24) — key-stability follow-up on cast failed-member lists.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
- Changes:
  - Replaced index-based React keys in failed-member list rendering with stable composite keys:
    - from `${member.personId}-${index}`
    - to `${member.personId}-${member.name}-${member.reason}`
  - This prevents reconciliation drift when the list order changes or rows are retried/removed.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx'` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/show-page-tab-order-wiring.test.ts tests/season-page-tab-order-wiring.test.ts tests/show-social-subnav-wiring.test.ts tests/season-social-subnav-wiring.test.ts` (`8 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-24) — season breadcrumb clickable show segment.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-page-tab-order-wiring.test.ts`
- Changes:
  - Updated season page breadcrumb wiring to pass `showHref` into `buildSeasonBreadcrumb(...)` using `buildShowAdminUrl({ showSlug: showSlugForRouting })`.
  - This makes the show-name breadcrumb segment clickable on season pages (consistent with week/person pages).
  - Added a wiring test assertion to prevent regressions of clickable show crumbs in season breadcrumbs.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' tests/season-page-tab-order-wiring.test.ts` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/season-page-tab-order-wiring.test.ts tests/social-week-detail-wiring.test.ts tests/admin-breadcrumbs.test.ts` (`13 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-24) — Reddit consolidation pass (20-item reliability/contract hardening).
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-discovery-service.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-episode-rules.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/refresh/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/save/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-sources-repository.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/reddit-sources-manager.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-discovery-service.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-episode-refresh-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-episode-save-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-communities-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-sources-manager.test.tsx`
- Changes:
  - Discovery service now uses resilient sort fetching via `Promise.allSettled` + retry/backoff (429/502/503/504), with partial-success behavior instead of full refresh failure.
  - Added discovery diagnostics across episode/general discovery outputs: `successful_sorts`, `failed_sorts`, `rate_limited_sorts`.
  - Added structured observability logging for discovery/refresh/save flows with community/show/season/sort/duration fields.
  - Hardened episode parsing:
    - safer episode extraction with ambiguity rejection (`Episode N`, `SxEy`, constrained `E<N>` context),
    - expanded deterministic discussion-type aliases (`live thread`, `post-episode discussion`, `weekly thread`).
  - Episode matrix cells now include `top_post_url` server-side (no client-side lookup requirement).
  - Refresh route now sanitizes/caps echoed `period_label` values (dedupe, trim, max labels/length).
  - Episode bulk-save route hardened:
    - strict ISO `posted_at` normalization,
    - max payload cap (`250`),
    - case-insensitive dedupe by `reddit_post_id` with `skipped_duplicates`,
    - controlled save concurrency pool (`5`),
    - non-negative integer normalization for score/comment inputs.
  - Community POST/PATCH deprecates `episode_required_flares` writes (ignored with warnings); behavior remains driven by `analysis_all_flares`.
  - Manager UX/perf hardening:
    - endpoint-specific timeout policy,
    - season/period context caching by show+season,
    - abort/race-safe context loading,
    - strictness copy fix when RHOSLC auto-seed is active,
    - surfaced sort diagnostics in Episode Discussions meta line,
    - matrix top-link uses direct `top_post_url`.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/reddit-discovery-service.test.ts tests/reddit-community-episode-refresh-route.test.ts tests/reddit-community-episode-save-route.test.ts tests/reddit-community-route.test.ts tests/reddit-communities-route.test.ts tests/reddit-sources-manager.test.tsx` (`54 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass; existing unrelated warnings only)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec next build --webpack` (pass)

Continuation (same session, 2026-02-24) — Bravo video thumbnail quality + auto-backfill wiring.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails/route.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-video-thumbnail-sync-proxy-route.test.ts` (new)
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-bravo-video-thumbnail-wiring.test.ts` (new)
- Changes:
  - Added show-level proxy route for backend thumbnail sync endpoint:
    - `POST /api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails`
    - 90s timeout + backend reachability error mapping.
  - Show/season/person video tabs now auto-trigger one thumbnail sync attempt when opening Videos view (in-flight dedupe + attempted ref).
  - Season/person refresh buttons now trigger forced thumbnail resync (`forceSync: true`) before reloading videos.
  - Video thumbnail rendering precedence updated on show/season/person pages:
    - `hosted_image_url` -> `image_url` -> `original_image_url`.
  - Added non-blocking sync status/warning messaging in video tab UIs.
  - Extended `BravoVideoItem` typing with additive thumbnail sync fields.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/app/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails/route.ts' 'tests/show-bravo-video-thumbnail-sync-proxy-route.test.ts' 'tests/show-bravo-video-thumbnail-wiring.test.ts'` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/show-bravo-video-thumbnail-sync-proxy-route.test.ts tests/show-bravo-video-thumbnail-wiring.test.ts tests/show-bravo-videos-proxy-route.test.ts tests/people-page-tabs-runtime.test.tsx` (`10 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)
- Cross-repo contract check:
  - `screenalytics` has no direct consumer references to these Bravo video admin routes/fields (no code changes required).
- Continuation (same session): completed legacy deprecation gate path.
  - Added request-time strict gate (`REDDIT_DISCOVERY_LEGACY_PARAMS_STRICT=1`) in:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/refresh/route.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/save/route.ts`
  - Added strict-mode tests:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-episode-refresh-route.test.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-episode-save-route.test.ts`
  - Validation:
    - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/reddit-community-episode-refresh-route.test.ts tests/reddit-community-episode-save-route.test.ts` (pass)
    - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/reddit-threads-route.test.ts tests/reddit-sources-manager.test.tsx tests/reddit-community-flares-refresh-route.test.ts tests/reddit-flairs-service.test.ts tests/reddit-discovery-service.test.ts tests/reddit-community-episode-refresh-route.test.ts tests/reddit-community-episode-save-route.test.ts tests/reddit-community-route.test.ts tests/reddit-communities-route.test.ts tests/reddit-community-view-page.test.tsx` (pass)
    - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass)
    - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec next build --webpack` (pass)

Continuation (same session, 2026-02-24) — Cast + Season tabs comprehensive quality pass (12-item follow-up).
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/cast-route-state.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/cast-route-state.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-lazy-loading-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-cast-tab-quality-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/cast-incremental-render.test.tsx`
- Changes:
  - Migrated cast query contract to canonical keys with legacy read support:
    - show: writes `cast_filters` (reads legacy `cast_roles` fallback)
    - season: writes `cast_role_filters` + `cast_credit_filters` (reads legacy `cast_roles`/`cast_credits` fallback)
    - writers clear legacy keys to prevent drift.
  - Show cast tab:
    - deep-link role editor now waits for role data readiness before consuming `cast_open_role_editor`.
    - top-level busy state now includes in-flight per-person refreshes.
    - top-level cast counters now show `rendered/matched/total`.
    - added deferred search compute path (`useDeferredValue`) for cast filter/sort pipeline.
    - added per-person refresh AbortController map, with abort on reset/unmount/cancel.
    - added `aria-pressed` for cast filter chips and `aria-live` status semantics for cast loading/render messages.
  - Season cast tab:
    - per-person refresh now triggers post-success reload of cast-role-members + supplemental show cast.
    - retry-failed enrich now also refreshes cast-role-members + supplemental show cast.
    - deduped season cast by `person_id` before merge/filter/sort.
    - top-level `Sync Cast` / `Enrich Cast & Crew Media` buttons block during per-person refresh in-flight.
    - added per-person refresh AbortController map with abort on reset/unmount/cancel.
    - deep-link `Edit Roles` now builds whitelisted show-cast query via `writeShowCastRouteState` instead of forwarding full season search params.
    - relabeled season enrich action/notice copy to `Cast & crew media` semantics.
    - added `aria-pressed` chips and `aria-live` status semantics for loading/render labels.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/cast-route-state.test.ts tests/show-cast-lazy-loading-wiring.test.ts tests/season-cast-tab-quality-wiring.test.ts tests/cast-incremental-render.test.tsx` (`4 files passed`, `31 tests passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/lib/admin/cast-route-state.ts' 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'tests/cast-route-state.test.ts' 'tests/show-cast-lazy-loading-wiring.test.ts' 'tests/season-cast-tab-quality-wiring.test.ts' 'tests/cast-incremental-render.test.tsx'` (no errors; pre-existing warnings in show page remain)

Continuation (same session, 2026-02-24) — Week-detail day prefilter wiring + run-failure readability + section skeletons.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/week-social-thumbnails.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-social-analytics-section.test.tsx`
- Changes:
  - Week detail now consumes `day=YYYY-MM-DD` and `social_platform` query params:
    - preselects platform filter from `social_platform`
    - applies day-level local-time filtering to post list, summary totals, and comments coverage
    - renders active day-filter banner with clear action
    - empty-state copy differentiates week vs day scope.
  - Advanced Run Health panel now includes:
    - grouped failure clusters (code + stage + platforms + count + sample)
    - latest 5 failure events list for triage.
  - Added explicit section-level loading skeletons for progressive reveal while analytics load.
  - Added run-summary loading state to avoid blank advanced panel while summary fetch is in-flight.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/components/admin/season-social-analytics-section.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'tests/season-social-analytics-section.test.tsx' 'tests/week-social-thumbnails.test.tsx'` (pass)
  - `pnpm -C apps/web exec vitest run tests/season-social-analytics-section.test.tsx tests/week-social-thumbnails.test.tsx tests/social-week-detail-wiring.test.ts` (`53 passed`; existing React act warnings in one long-running polling test remain pre-existing)

Continuation (same session, 2026-02-24) — Social timeout triage follow-up (comments coverage + jobs polling).
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-social-analytics-section.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
- Changes:
  - Reduced social jobs fetch default page size from `250` to `100` in season social landing fetch path.
  - Reduced week-detail sync polling jobs request `limit` from `250` to `100`.
  - This aligns with the hardening target to keep progress polling payloads bounded and reduce `UPSTREAM_TIMEOUT` risk under load.
- Findings validated during triage:
  - `comments-coverage` now returns `200` consistently after backend SQL alias fix (no more `missing FROM-clause entry for table "t"`).
  - Historical `galleryVisibleCount is not defined` no longer reproduces in current source/runtime after restart.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/season-social-analytics-section.test.tsx tests/social-week-detail-wiring.test.ts` (`47 passed`; existing React `act(...)` warnings remain in polling-heavy test path).
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/components/admin/season-social-analytics-section.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx'` (pass).
  - Manual proxy checks after restart:
    - `/api/admin/trr-api/shows/7782652f-783a-488b-8860-41b97de32e75/seasons/6/social/analytics/comments-coverage?...` -> `200`
    - `/api/admin/trr-api/shows/7782652f-783a-488b-8860-41b97de32e75/seasons/6/social/runs?...` -> `200`
    - `/api/admin/trr-api/shows/7782652f-783a-488b-8860-41b97de32e75/seasons/6/social/jobs?...run_id=933687e3-5345-4124-bfe0-75806793c6c6` -> `200`.

Continuation (same session, 2026-02-24) — requested revision pass: timeout standardization + key stability + lint follow-up.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/social-week-detail-wiring.test.ts`
- Changes:
  - Standardized remaining non-stream show-page calls to timeout-bounded fetches via `fetchWithTimeout`.
    - Covered slug resolution, show settings mutations, show-links CRUD/discovery, role mutations/assignment, Bravo preview+commit mutations, and media asset detection/archive/star/content-type/delete mutations.
    - Left stream endpoints and manual external-signal fallback fetches unchanged by design.
  - Added `BRAVO_IMPORT_MUTATION_TIMEOUT_MS = 120_000` for non-stream Bravo preview/commit mutations.
  - Week social page:
    - Replaced index-based sync log keying with stable job-id keying (`key={entry.id}`).
    - Refactored `syncLogs` memo to return `{ id, line }` entries.
    - Kept typed `router.replace` route-cast compatibility (`as Route`) for day-filter URL updates.
  - Added regression coverage in `social-week-detail-wiring.test.ts` to assert stable sync-log key wiring.
  - Verified people-page hook-dependency warning concern is no longer present on current file state.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/social-week-detail-wiring.test.ts tests/show-news-tab-google-wiring.test.ts tests/show-social-subnav-wiring.test.ts tests/season-social-subnav-wiring.test.ts tests/show-page-tab-order-wiring.test.ts tests/season-page-tab-order-wiring.test.ts tests/admin-fetch.test.ts` (`20 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx' tests/social-week-detail-wiring.test.ts` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass with existing repo warnings only; no errors)

Continuation (same session, 2026-02-24) — Reddit contract hardening follow-through (strict legacy rejection + deprecated field removal path).
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/refresh/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/reddit/communities/[communityId]/episode-discussions/save/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/reddit-sources-repository.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/reddit-sources-manager.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-communities-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-episode-refresh-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-community-episode-save-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reddit-sources-manager.test.tsx`
- Changes:
  - Removed compatibility-gated legacy fallback logic for episode refresh/save params.
    - `GET /episode-discussions/refresh` now rejects `show_id` and `season_number` unconditionally with `400`.
    - `POST /episode-discussions/save` now rejects `show_id` and `show_name` unconditionally with `400`.
  - Community write routes now reject deprecated `episode_required_flares` payloads with `400` and guidance to use `analysis_all_flares`.
  - Repository/community model cleanup continued:
    - operational/community row mapping no longer exposes `episode_required_flares` in returned API objects.
    - community create/update paths no longer write or resolve `episode_required_flares`.
  - Manager UI/types cleanup:
    - removed `episode_required_flares` from client community shape/merge normalization.
    - refresh request no longer sends legacy `season_number`; uses `season_id` + period window.
  - Test suite updated for strict behavior:
    - legacy refresh/save params now expected to fail.
    - deprecated `episode_required_flares` writes now expected to fail.
    - manager refresh query assertions updated to `season_id`/period-only.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/reddit-threads-route.test.ts tests/reddit-sources-manager.test.tsx tests/reddit-community-flares-refresh-route.test.ts tests/reddit-flairs-service.test.ts tests/reddit-discovery-service.test.ts tests/reddit-community-episode-refresh-route.test.ts tests/reddit-community-episode-save-route.test.ts tests/reddit-community-route.test.ts tests/reddit-communities-route.test.ts tests/reddit-community-view-page.test.tsx` (`10 files passed`, `72 tests passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web run lint` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec next build --webpack` (pass)

Continuation (same session, 2026-02-24) — MEDIA/GALLERY hardening pass (show/season/person reliability + diagnostics).
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/ImageLightbox.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/photo-metadata.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/paginated-gallery-fetch.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-gallery-pagination.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-gallery-pagination.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/person-gallery-broken-toggle.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-gallery-batch-preflight.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-gallery-batch-preflight.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-gallery-section-visibility.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/gallery-fallback-telemetry.test.ts`
- Changes:
  - Person gallery audit mode:
    - Added `Show Broken` toggle in person gallery toolbar (`showBrokenRows`, default off).
    - Person photo fetch now sends `include_broken=true` only when toggle is enabled.
    - Added broken card badge (`Broken`) and tooltip context for `broken_unreachable` rows.
  - Person gallery diagnostics:
    - Added fallback telemetry counters (`recovered`, `failed`, `attempted`) in gallery UI.
    - Gallery card loader now emits attempt/recovered/failed events and logs all-candidate failure as before.
  - Lightbox metadata visibility:
    - Added additive gallery status fields to `PhotoMetadata` (`galleryStatus`, `galleryStatusReason`, `galleryStatusCheckedAt`).
    - Mapped status values from metadata for person + season/show assets.
    - Lightbox now surfaces `BROKEN (UNREACHABLE)` badge and status rows in Metadata Coverage when present.
  - Show gallery hardening:
    - Removed dead/disallowed section branches from section-visible defaults and grouping keys, keeping only:
      - `cast_photos`
      - `profile_pictures`
      - `posters`
      - `backdrops`
  - Season batch preflight UX:
    - Added deterministic preflight summary text in season batch modal using the same computed target plan as submit payload.
  - Pagination metadata helper usage remains additive (`fetchAllPaginatedGalleryRowsWithMeta`) with truncation warnings preserved on show/season pages.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/person-gallery-broken-toggle.test.ts tests/show-gallery-pagination.test.ts tests/season-gallery-pagination.test.ts tests/show-gallery-batch-preflight.test.ts tests/season-gallery-batch-preflight.test.ts tests/show-gallery-section-visibility.test.ts tests/gallery-fallback-telemetry.test.ts` (`7 files passed`, `7 tests passed`).
  - Additional regressions:
    - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/person-gallery-thumbnail-wiring.test.ts tests/image-lightbox-metadata.test.tsx` (`2 files passed`, `13 tests passed`; expected jsdom `scrollTo` warnings only).
    - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/people-page-tabs-runtime.test.tsx tests/show-assets-image-sections.runtime.test.tsx` (`2 files passed`, `6 tests passed`; existing mocked fandom fetch stderr noise in runtime test path).

Continuation (same session, 2026-02-24) — Networks sync hardening rollout (ops/deploy follow-through).
- Scope:
  - Confirmed TRR-APP proxy/UI surfaces new sync controls (`refresh_external_sources`, `resume_run_id`, runtime/batch passthrough) and run metadata render path.
  - Executed production Vercel deploy for `apps/web`.
- Execution details:
  - Initial production deploy failed due lockfile mismatch in app-local lock:
    - `apps/web/package.json` expected `eslint-config-next@16.1.6`
    - `apps/web/pnpm-lock.yaml` pinned `eslint-config-next@15.5.0`
  - Lock refresh:
    - `cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web && pnpm install --lockfile-only --ignore-workspace`
  - Redeploy result:
    - `vercel deploy --prod` succeeded.
    - production deployment: `https://web-6s2s56rn1-the-reality-reports-projects.vercel.app`
    - `vercel inspect` status: `Ready`.
- Notes:
  - Backend Cloud Run remains pending (separate auth blocker in backend handoff); app deploy is complete.

Continuation (same session, 2026-02-24) — Networks finalization UI/proxy targeting support.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/networks-streaming/sync/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/networks/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/networks-streaming-sync-proxy-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/admin-networks-page-auth.test.tsx`
- Changes:
  - Extended sync proxy body sanitization/passthrough with additive targeting fields:
    - `entity_type: network|streaming|production`
    - `entity_keys: string[]` (normalized, trimmed, capped)
  - Added production-finalization helper flow on `/admin/networks`:
    - new action: `Re-run Unresolved Production Only`
    - sends unresolved-only sync with `entity_type=production` and specific unresolved production keys.
  - Added unresolved production count indicator to speed operator iteration.
  - Kept default sync credit-safe (`refresh_external_sources=false`) unchanged.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/networks-streaming-sync-proxy-route.test.ts tests/admin-networks-page-auth.test.tsx` (`7 passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)

Continuation (same session, 2026-02-24) — Bravo video thumbnail sync timeout hardening + RHOSLC videos smoke verification.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails/route.ts`
- Changes:
  - Increased Bravo video thumbnail sync proxy timeout from `90s` to `15 minutes`:
    - `BACKEND_TIMEOUT_MS = 15 * 60_000`
  - Rationale: forced one-time thumbnail mirror/backfill can legitimately exceed 90s.
- Validation:
  - `pnpm -C apps/web exec eslint 'src/app/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails/route.ts'` (pass)
  - `pnpm -C apps/web exec tsc --noEmit` (pass)
- RHOSLC data-path smoke checks after forced backfill (UI-serving endpoints):
  - Show videos: `/api/admin/trr-api/shows/7782652f-783a-488b-8860-41b97de32e75/bravo/videos?merge_person_sources=true`
    - `count=58`, `hosted_count=58`, `non_hosted_count=0`
  - Season videos: `/api/admin/trr-api/shows/7782652f-783a-488b-8860-41b97de32e75/bravo/videos?season_number=6&merge_person_sources=true`
    - `count=58`, `hosted_count=58`, `non_hosted_count=0`
  - Person videos (Heather Gay): `/api/admin/trr-api/shows/7782652f-783a-488b-8860-41b97de32e75/bravo/videos?person_id=a0f6454b-2ceb-4077-9e9a-a3b152e922f0&merge_person_sources=true`
    - `count=17`, `hosted_count=17`, `non_hosted_count=0`

Continuation (same session, 2026-02-24) — RHOSLC person refresh stream start-watchdog + metadata source-label fallback.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/ImageLightbox.tsx`
- Changes:
  - Person refresh stream reader hardening:
    - added explicit first-event start deadline (`PERSON_PAGE_STREAM_START_DEADLINE_MS = 20_000`).
    - aborts/returns clear timeout error when no SSE events arrive within 20s.
    - added refresh-log stream lifecycle entries:
      - `stream_connected` when first event arrives.
      - `stream_recovered` when retry attempt succeeds.
  - Lightbox “Found on” normalization robustness:
    - source label resolution now falls back to `metadata.originalImageUrl` when `sourceUrl` is missing, improving branding detection for imported/scraped assets.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/components/admin/ImageLightbox.tsx'` (pass)

Continuation (same session, 2026-02-24) — MEDIA/GALLERY post-hardening completion run.
- Files (gallery hardening scope):
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/people/[personId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/ImageLightbox.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/photo-metadata.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/person-gallery-broken-toggle.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-gallery-pagination.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-gallery-pagination.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-gallery-batch-preflight.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-gallery-batch-preflight.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-gallery-section-visibility.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/gallery-fallback-telemetry.test.ts`
- Validation completed:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/person-gallery-broken-toggle.test.ts tests/show-gallery-pagination.test.ts tests/season-gallery-pagination.test.ts tests/show-gallery-batch-preflight.test.ts tests/season-gallery-batch-preflight.test.ts tests/show-gallery-section-visibility.test.ts tests/gallery-fallback-telemetry.test.ts` (`7 files passed`, `7 tests passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/person-gallery-thumbnail-wiring.test.ts tests/image-lightbox-metadata.test.tsx` (`2 files passed`, `13 tests passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/people-page-tabs-runtime.test.tsx tests/show-assets-image-sections.runtime.test.tsx` (`2 files passed`, `6 tests passed`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' 'src/app/admin/trr-shows/people/[personId]/page.tsx' 'src/components/admin/ImageLightbox.tsx' 'src/lib/photo-metadata.ts' 'tests/person-gallery-broken-toggle.test.ts' 'tests/show-gallery-pagination.test.ts' 'tests/season-gallery-pagination.test.ts' 'tests/show-gallery-batch-preflight.test.ts' 'tests/season-gallery-batch-preflight.test.ts' 'tests/show-gallery-section-visibility.test.ts' 'tests/gallery-fallback-telemetry.test.ts'` (pass)
- Manual acceptance status:
  - Route-level check confirmed canonical show media-gallery path resolves directly on admin host:
    - `curl -I http://admin.localhost:3000/admin/trr-shows/the-real-housewives-of-salt-lake-city/media-gallery` -> `200` (no bounce redirect)
  - Interactive UI-level checks were not automatable in this run because both Playwright MCP and Chrome DevTools MCP transports were unavailable (`Transport closed`).
  - Full manual acceptance matrix remains pending human-in-browser verification on the current batch-1-repaired dataset.

Continuation (same session, 2026-02-24) — MEDIA/GALLERY completion follow-up.
- Re-validated frontend test gate:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/person-gallery-broken-toggle.test.ts tests/show-gallery-pagination.test.ts tests/season-gallery-pagination.test.ts tests/show-gallery-batch-preflight.test.ts tests/season-gallery-batch-preflight.test.ts tests/show-gallery-section-visibility.test.ts tests/gallery-fallback-telemetry.test.ts` (pass, `7 files`, `7 tests`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/person-gallery-thumbnail-wiring.test.ts tests/image-lightbox-metadata.test.tsx tests/people-page-tabs-runtime.test.tsx tests/show-assets-image-sections.runtime.test.tsx` (pass)
- Manual automation follow-up:
  - Browser-MCP tools still unavailable (`Transport closed`).
  - A local Node+Playwright scripted manual-check attempt was blocked because this workspace currently exposes Playwright CLI but not importable `playwright` package resolution for ad-hoc node scripts in app runtime context.
- Operational status:
  - API/UI regression gates remain green.
  - Full manual acceptance matrix remains pending direct browser operator verification on live admin pages.

Continuation (same session, 2026-02-24) — Cast tabs final reliability hardening + smoke preflight tooling.
- Files:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/roles/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/cast-role-members/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/scripts/cast-smoke-preflight.mjs`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/package.json`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-roles-proxy-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-role-members-proxy-route.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-lazy-loading-wiring.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/cast-smoke-preflight.test.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-cast-tab-quality-wiring.test.ts`
- Changes:
  - Raised show `roles` + `cast-role-members` proxy default GET timeout fallback from `20s` to `120s`.
  - Standardized retry backoff to deterministic `250ms` between retryable attempts.
  - Fixed show cast intelligence autoload loop risk by introducing stable refs + one-shot autoload attempt keys:
    - `showRolesSnapshotRef`, `showRolesLoadedOnceRef`, `showRolesAutoLoadAttemptedRef`
    - `castRoleMembersSnapshotRef`, `castRoleMembersLoadedOnceRef`, `castRoleMembersAutoLoadAttemptedRef`
  - Added non-blocking cast intelligence degraded banner in show cast tab with explicit actions:
    - `Retry Cast Intelligence`
    - `Retry Roles`
  - Added deep-link warning behavior when `cast_open_role_editor=1` is present but intelligence is unavailable; params are retained until successful recovery.
  - Added CLI smoke preflight utility:
    - `node scripts/cast-smoke-preflight.mjs --show-id <uuid> --app-origin <origin> --backend-origin <origin>`
    - checks backend health, show roles proxy, and cast-role-members proxy with latency + retryable envelope reporting.
  - Added package script:
    - `pnpm run smoke:cast:preflight -- --show-id <uuid> --app-origin http://admin.localhost:3000 --backend-origin http://127.0.0.1:8000`
- Expected preflight threshold before manual smoke:
  - all three checks `ok=true` and status `200`.
  - any 5xx/timeout should block manual QA and be treated as environment instability.

Continuation (same session, 2026-02-24) — SHOW pages finalization pass (runtime/a11y/fetch-stream + featured clear + audit + type/build closure).
- Files changed:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/show-tabs/ShowTabsNav.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-tabs/SeasonTabsNav.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/show-tabs/ShowOverviewTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/show-tabs/ShowSeasonsTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/show-tabs/ShowAssetsTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/show-tabs/ShowNewsTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/show-tabs/ShowCastTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/show-tabs/ShowSocialTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/show-tabs/ShowSettingsTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-tabs/SeasonOverviewTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-tabs/SeasonEpisodesTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-tabs/SeasonAssetsTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-tabs/SeasonVideosTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-tabs/SeasonFandomTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-tabs/SeasonCastTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/season-tabs/SeasonSocialTab.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/show-tabs/ShowAssetsImageSections.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/ImageLightbox.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/image-lightbox/useLightboxKeyboardFocus.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/image-lightbox/useLightboxManagementState.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/admin-fetch.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/show-page/constants.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/scripts/admin/show-featured-image-audit.sql`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-tabs-nav.runtime.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-tabs-nav.runtime.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-assets-image-sections.runtime.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/image-lightbox-metadata.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/admin-fetch.test.ts`
  - removed brittle source-string wiring tests:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-page-tab-order-wiring.test.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/season-page-tab-order-wiring.test.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-featured-image-lightbox-wiring.test.ts`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-page-modularization-wiring.test.ts`
  - removed legacy local show-page duplicates:
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/_components/ShowTabsNav.tsx`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/_components/ShowSeasonCards.tsx`
    - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/_components/ShowAssetsImageSections.tsx`
- Delivered behavior:
  - Show/season tab nav a11y upgraded: `tablist/tab` roles, `aria-selected`, `aria-controls`, keyboard nav (`ArrowLeft/ArrowRight/Home/End`).
  - Season page now uses shared `SeasonTabsNav` with canonical tab order and panel IDs.
  - Added show-details unsaved-change guard: prompt on tab switch away from details and `beforeunload` warning while dirty.
  - Added gallery auto-advance mode (`manual|auto`) with `IntersectionObserver` sentinels (default manual); per-section chunking preserved.
  - Added `adminStream(...)` wrapper (SSE parse + timeout/error normalization) and migrated show/season batch-jobs stream runners to it.
  - Added featured clear actions in lightbox management (`Clear Featured Poster/Backdrop`) and wired show page callbacks to send `null` featured IDs.
  - Added read-only featured-image data audit SQL script for dangling/cross-show/wrong-kind checks.
  - Addressed type regressions from stream integration and stale import path in `show-page/constants.ts`.
- Validation evidence:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/show-admin-routes.test.ts tests/season-tab-alias-redirect.test.ts tests/show-tabs-nav.runtime.test.tsx tests/season-tabs-nav.runtime.test.tsx tests/show-season-cards.runtime.test.tsx tests/show-assets-image-sections.runtime.test.tsx tests/image-lightbox-metadata.test.tsx tests/show-featured-image-validation-route.test.ts tests/trr-shows-repository-featured-image-validation.test.ts tests/admin-fetch.test.ts` (pass: `10 files`, `49 tests`)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint 'src/app/admin/trr-shows/[showId]/page.tsx' 'src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx' src/components/admin/ImageLightbox.tsx src/components/admin/image-lightbox src/components/admin/show-tabs src/components/admin/season-tabs src/lib/admin/admin-fetch.ts src/lib/admin/show-admin-routes.ts` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` (pass)
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec next build --webpack` (pass)
- Notes / residuals:
  - `showId/page.tsx` and `season/[seasonNumber]/page.tsx` remain very large; tab wrappers are now ARIA panel components but full heavy tab-body extraction into independently-owned modules is still incremental work.
  - jsdom still logs `window.scrollTo` “Not implemented” during lightbox metadata tests; tests pass and behavior is unchanged.

Continuation (same session, 2026-02-24) — cast intelligence reliability closure.
- Files adjusted:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/roles/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/admin/trr-api/shows/[showId]/cast-role-members/route.ts`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-cast-lazy-loading-wiring.test.ts`
- Final fix details:
  - Ensured GET proxy failure responses consistently include additive envelope fields on all branches (`error`, `code`, `retryable`, `upstream_status`), including auth/config/catch/internal fallback branches.
  - Updated one wiring assertion to match current `showCastIntelligenceUnavailable` guard conditions (`castSource`, loading gates, and error state).
- Validation evidence:
  - `pnpm exec vitest run -c vitest.config.ts tests/show-roles-proxy-route.test.ts tests/show-cast-role-members-proxy-route.test.ts tests/show-cast-lazy-loading-wiring.test.ts tests/cast-smoke-preflight.test.ts tests/season-cast-tab-quality-wiring.test.ts` (pass: `5 files`, `36 tests`).

Continuation (same session, 2026-02-24) — Social analytics soak validation + go/no-go.
- Scope executed:
  - Runtime reset and listener/health validation on `127.0.0.1:3000` + `127.0.0.1:8000`.
  - Baseline latency sample captured for:
    - `/social/runs`
    - `/social/jobs` (unscoped + run-scoped)
    - `/social/analytics`
    - `/social/analytics/comments-coverage`
  - Controlled ingest workload started from week-comments scenario:
    - run_id: `2014239f-1b37-43ea-ad89-b1a63c6392b3`
    - window: `2025-08-14T04:00:00Z` -> `2025-08-15T03:59:59.999Z`
  - Concurrent social landing + week-view traffic exercised during soak checks.
- Baseline (pre-soak) from `/tmp/social_soak_baseline.json`:
  - runs: `200/8`, p50 `0.019s`, p95 `0.031s`
  - jobs (unscoped): `200/8`, p50 `0.154s`, p95 `0.165s`
  - jobs (scoped): `200/8`, p50 `0.157s`, p95 `0.183s`
  - analytics: `200/8`, p50 `0.026s`, p95 `0.031s`
  - comments-coverage: `200/8`, p50 `2.526s`, p95 `4.986s`
- Observed soak checkpoints (UTC):
  - `2026-02-24T19:48:31.226951+00:00`: runs/jobs/jobs_scoped/comments/pages all `200`; run `running`.
  - `2026-02-24T19:49:31.232583+00:00`: runs/jobs/jobs_scoped/comments/pages all `200`; run `running`.
  - `2026-02-24T20:00:01.145859+00:00`: all probes degraded (`status 0` from app route timeouts/restarts).
  - `2026-02-24T20:00:31.150819+00:00`: all probes degraded (`status 0`).
- Log signal extraction (current app log window):
  - `UPSTREAM_TIMEOUT` occurrences: `96`
  - social route `504` count: `25`
    - runs: `8`
    - jobs: `6`
    - analytics: `6`
    - season 7 analytics: `4`
    - week analytics: `1`
  - `BACKEND_UNREACHABLE`: `0`
  - `ENOTFOUND`: `0`
- Workload terminal state:
  - run `2014239f-1b37-43ea-ad89-b1a63c6392b3` reached `completed` at `2026-02-24T20:00:33.808358Z`.
- Decision:
  - **NO_GO** for rollout.
  - Reason: repeated social polling/proxy timeout loops still present under concurrent admin traffic, despite successful ingest completion.
  - Notes: page-level fail-open behavior is intermittently preserved (many `200` page responses) but not consistently stable through timeout windows.
- Next patch target (priority):
  1. Backend job-list hot path optimization + response-size control for unscoped jobs polling.
  2. Tighten/guard app pollers around Next dev server restarts (`next.config.ts` reload windows), so transient app restarts do not collapse all social probes.
