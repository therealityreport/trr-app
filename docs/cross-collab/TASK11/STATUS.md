# Status — Task 11 (Tab-Isolated Admin Operations + Resumable Streams)

Repo: TRR-APP  
Last updated: March 5, 2026

## Plan A Contract Freeze Consumption (Backend)

- Consumed backend freeze checkpoint from `TRR-Backend/docs/cross-collab/TASK11/STATUS.md`.
- Frozen additive fields acknowledged:
  - `operation_id`
  - `execution_owner`
  - `execution_mode_canonical`
- Resume path remains:
  - `GET /api/v1/admin/operations/{operation_id}`
  - `GET /api/v1/admin/operations/{operation_id}/stream?after_seq={n}`
- Policy lock acknowledged: auth shared across tabs; workflow/run state tab-scoped only.

### March 4 backend freeze refresh consumed

- Confirmed backend now includes operation replay support for additional stream families:
  - `admin_show_refresh_photos`
  - `admin_person_refresh_images`
  - `admin_person_reprocess_images`
- No contract-breaking changes required in TRR-APP; additive-only behavior remains in effect.

## Phase Status

| Phase | Description | Status | Notes |
|------:|-------------|--------|-------|
| 1 | Tab/session primitives | Complete | `tab-session` + admin auth header propagation are active. |
| 2 | Shared operation replay store/client | Complete | `operation-session` + `adminStream` replay resume (`operation_id` + `event_seq`) implemented. |
| 3 | Proxy forwarding + operation passthrough routes | Complete | Stream proxies forward `x-trr-tab-session-id` / `x-trr-flow-key` / `x-trr-request-id`; operation proxy routes are present. |
| 4 | Page-level migration (Plan B listed surfaces) | Complete | Show/person/networks/google-news/reddit/social run workflows now consume async kickoff handles with operation-first monitoring where available. |
| 5 | Manual attach parity for listed run surfaces | Complete | Social week + reddit window/details provide explicit manual attach from active run lists without cross-tab auto-hijack. |
| 6 | Validation and docs finalization | Complete with baseline blockers | Targeted suites pass (operation handles, proxy forwarding, lifecycle UI states); full build/test remain blocked by unrelated baseline failures. |

## Before/After Matrix (Listed Admin Surfaces)

| Surface | Before | After | Status |
|---|---|---|---|
| Scrape import page (`/admin/scrape-images`) | Legacy stream kickoff/resume differences between entry points | Shared `adminStream` replay behavior | Migrated |
| Scrape import drawer (`ImageScrapeDrawer`) | Separate stream handling path | Shared `adminStream` replay behavior | Migrated |
| Show admin (`trr-shows/[showId]`) stream workflows | Mixed manual stream parsing + manual fetch stream kicks | `adminStream` callback handlers + preserved stage/progress UX | Migrated |
| Season admin (`trr-shows/[showId]/seasons/[seasonNumber]`) stream workflows | Mixed manual stream parsing + manual fetch stream kicks | `adminStream` callback handlers + preserved stage/progress UX | Migrated |
| Person admin (`trr-shows/people/[personId]`) refresh/reprocess streams | Manual `ReadableStream` parsing (`getReader`/`TextDecoder`) | `adminStream` callback handlers with existing message/stage mapping retained | Migrated |
| Social week sync (`WeekDetailPageView`) | Run kickoff/poll with no tab-owned resume store, no explicit attach UX | Explicit run flow scope/key + run-session ownership + same-tab auto-resume + manual attach selector | Migrated |
| Reddit window posts (`admin/reddit-window-posts`) sync details | Kickoff/poll only; no tab-owned resume/ownership; manual run-id paste only | Explicit run flow scope/key + run-session ownership + same-tab auto-resume + active-run list manual attach | Migrated |
| Reddit post details (`admin/reddit-post-details`) sync details | Kickoff/poll only; no tab-owned resume/ownership; manual run-id paste only | Explicit run flow scope/key + run-session ownership + same-tab auto-resume + active-run list manual attach | Migrated |
| Networks admin page | Legacy kickoff expectation could block for long sync | Async kickoff + operation-first monitor + reconnect fallback | Migrated |

## Additive Backend Contract Used During Final Integration

- Added backend route: `GET /api/v1/admin/socials/reddit/runs` (filtered run list).
- Added app proxy: `GET /api/admin/reddit/runs`.
- Purpose: keep auto-resume tab-owned while allowing explicit manual attach from full active run list on reddit window/details surfaces.
- Operation contract consumed as frozen/additive fields only: `operation_id`, `execution_owner`, `execution_mode_canonical` with legacy `run_id`/`job_id` fallback unchanged.

## Validation

### Targeted suites (pass)

- `pnpm -C apps/web exec vitest run tests/reddit-runs-route.test.ts tests/reddit-window-posts-page.test.tsx tests/reddit-post-details-page.test.tsx tests/run-session.test.ts tests/season-refresh-request-id-wiring.test.ts tests/season-cast-tab-quality-wiring.test.ts tests/social-week-detail-wiring.test.ts tests/people-page-tabs-runtime.test.tsx`
- `pnpm -C apps/web exec vitest run tests/run-session.test.ts tests/reddit-window-posts-page.test.tsx tests/reddit-post-details-page.test.tsx tests/social-week-detail-wiring.test.ts tests/people-page-tabs-runtime.test.tsx tests/season-refresh-request-id-wiring.test.ts`
- `pnpm -C apps/web exec vitest --run tests/async-handles.test.ts tests/networks-streaming-sync-proxy-route.test.ts tests/show-google-news-sync-proxy-route.test.ts tests/show-google-news-sync-status-proxy-route.test.ts tests/reddit-post-details-page.test.tsx tests/reddit-window-posts-page.test.tsx tests/reddit-sources-manager.test.tsx tests/season-social-analytics-section.test.tsx tests/social-week-detail-wiring.test.ts tests/admin-fetch.test.ts tests/run-session.test.ts`

### Full checks

- `pnpm -C apps/web run lint` -> pass with warnings only (no errors).
- `pnpm -C apps/web exec next build --webpack` -> fails on pre-existing unrelated `src/components/admin/ImageLightbox.tsx:621` type error.
- `pnpm -C apps/web run test:ci` -> fails only on pre-existing unrelated suite:
  - `tests/social-season-hint-routes.test.ts` (5 failures; response `500` vs expected `200`).

## Blockers (Known Baseline, Not Introduced by Task 11)

- Build blocker: `ImageLightbox` type mismatch (`number | undefined` -> `number`) at `src/components/admin/ImageLightbox.tsx:621`.
- Broad test blocker: `tests/social-season-hint-routes.test.ts` currently red in baseline.

## Residual Risks

- Show/season/person progress parsing remains duplicated across large files (functionally consistent but maintenance-heavy).
- Two-tab manual matrix was validated through targeted runtime wiring tests; no dedicated browser E2E automation was added in this pass.

## March 5, 2026 — Backend Ops Readiness Checkpoint (Phase 7/8/9)

Backend evidence root:
- `/Users/thomashulihan/Projects/TRR/TRR-Backend/docs/ai/evidence/aws-worker-plane/20260304-191411`

Consumer-impact summary:
- Backend Phase 7 validation/alarm pack is complete and staging alarm target is now 7/7.
- Screenalytics outage rollback scenario completed in staging.
- Three backend resilience checks that directly impact operation replay confidence are still blocked in staging runtime:
  - API recycle continuity
  - worker recycle continuity
  - SSE replay from `after_seq`

Observed blocker signature (backend-owned):
- Stream kickoff endpoints did not emit operation envelope data (`operation_id`/`event_seq`) in staging under both ALB path and API-host-local fallback, so replay continuation proofs could not be completed.

Plan B consumption stance:
- Keep additive contract consumption unchanged.
- Treat backend replay continuity evidence for those 3 scenarios as pending before final production canary confidence sign-off.

## March 5, 2026 — Consumer Checkpoint After Task 11 Unblock Execution

Backend evidence root:
- `/Users/thomashulihan/Projects/TRR/TRR-Backend/docs/ai/evidence/aws-worker-plane/20260304-195705-task11-unblock`

Consumer-impact summary:
- Backend staging runtime/network correction was applied:
  - `trr-api-sg` and `trr-worker-sg` now allow `tcp/6543` egress.
  - `/trr/staging/SUPABASE_DB_URL` now explicitly matches `/trr/staging/DATABASE_URL`.
- API instance was recycled and `/health` recovered.
- Required backend resilience reruns were executed (`30/31/32`) and all still failed due missing envelope emission.

Observed backend blocker signature (post-fix):
- Kickoff stream endpoints still fail to emit `operation_id`/`event_seq`.
- Public and API-host-local fallback kickoff paths both return `Internal Server Error`.
- Replay continuity evidence remains incomplete (`operation_ids.txt` missing; replay stream transcript empty).

TRR-APP stance:
- Keep additive operation contract consumption unchanged.
- Do not advance canary confidence to green until backend provides successful rerun evidence set with non-empty:
  - `operation_ids.txt`
  - `request_ids.txt`
  - `scenario_sse_initial_stream.txt`
  - `scenario_sse_replay_stream.txt`

## March 5, 2026 — Consumer checkpoint after DB parity fix + rerun continuation

Backend evidence root (unchanged):
- `/Users/thomashulihan/Projects/TRR/TRR-Backend/docs/ai/evidence/aws-worker-plane/20260304-195705-task11-unblock`

Backend progress consumed:
- Staging DB runtime parity was restored (`0172`/`0173` applied on active API DB endpoint).
- `30/31/32` were rerun against the same evidence root.
- Kickoff envelopes now emit `operation_id`/`event_seq` and `operation_ids.txt` is populated.

Remaining backend blockers that still affect canary confidence:
- `30` and `31` operations remain `pending` until scenario timeout (no terminal state reached).
- `32` replay scenario still red; replay stream transcript is empty in current run.

TRR-APP stance:
- Contract consumption remains unchanged.
- Keep canary confidence blocked until backend supplies a green replay-continuity evidence set, including non-empty `scenario_sse_replay_stream.txt` with monotonic replay sequence continuity.
