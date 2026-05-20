# TRR App Bug Report

Date: 2026-05-19
Scope: TRR-APP admin social account profile and admin backend proxy behavior
DebugPro status: INCONCLUSIVE root cause, OPEN bug

## Root Cause

The app can trigger too many admin/social reads at once on the Instagram social account profile page. When the backend is under database pool pressure, the app sees slow proxy responses, `BACKEND_TIMEOUT` errors, and degraded operator actions such as catalog freshness checks.

The app is not the only cause. Current evidence shows the backend also has an expensive freshness/recent-run path. The app-side bug is that the page and proxy layer do not sufficiently prioritize or shed secondary reads when the same profile view loads posts, catalog posts, review queue, freshness, cookie health, and live status together.

## Evidence

- `src/components/admin/SocialAccountProfilePage.tsx:3705` fetches catalog posts for the selected catalog tab.
- `src/components/admin/SocialAccountProfilePage.tsx:3843` fetches the catalog review queue.
- `src/components/admin/SocialAccountProfilePage.tsx:4071` posts to catalog freshness.
- `src/components/admin/SocialAccountProfilePage.tsx:5899` checks cookie health with `posts_auth=true`.
- `src/lib/admin/admin-live-status.ts:24` and `src/lib/admin/admin-live-status.ts:25` define polling and stream live-status URLs for the same admin surface.
- `src/lib/server/trr-api/admin-read-proxy.ts:143` is the shared backend proxy helper. At `src/lib/server/trr-api/admin-read-proxy.ts:232`, aborted backend calls are normalized to `BACKEND_TIMEOUT`.
- `src/lib/server/postgres.ts:302` sizes the app Postgres pool and `src/lib/server/postgres.ts:382` emits `postgres_pool_queue_depth`; current app logs show `waiting=1`, `active=1`, and `max_concurrent_operations=1` for `application_name=trr-app:web`.
- `.logs/workspace/trr-app.log` shows `Admin read request timed out after 12s`, `BACKEND_TIMEOUT`, and fallback messages for covered-show detail, seasons, and social posts during the same window where the backend logs pool pressure and catalog freshness 503s.

## Minimal Reproduction or Failing Signal

Open the Instagram profile admin route and navigate through the account posts/catalog surfaces while background live status and cookie/freshness reads are active.

Observed failing signals from the current log:

- App route: `/social/instagram/thetraitorsus`
- App API calls:
  - `/api/admin/trr-api/social/profiles/instagram/thetraitorsus/catalog/posts?page=1&page_size=25`
  - `/api/admin/trr-api/social/profiles/instagram/thetraitorsus/catalog/review-queue`
  - `/api/admin/trr-api/social/profiles/instagram/thetraitorsus/catalog/freshness`
  - `/api/admin/trr-api/social/profiles/instagram/thetraitorsus/cookies/health?posts_auth=true`
  - `/api/admin/trr-api/social/ingest/live-status/stream`
- App log symptom: `Admin read request timed out after 12s`
- App error code: `BACKEND_TIMEOUT`

## Fix

Practical fix direction:

1. Treat catalog freshness and cookie health as operator-triggered or low-frequency reads, not automatic peers of catalog posts and review queue.
2. Add a request budget for `SocialAccountProfilePage` so tab reads, freshness reads, review queue reads, and live-status reads cannot pile up during the same render window.
3. Use existing pool-pressure signals to suppress secondary reads when the backend reports `DATABASE_SERVICE_UNAVAILABLE`, `BACKEND_TIMEOUT`, or session-pool pressure.
4. Keep the UI useful under pressure: show stale cached values and a retry action instead of repeatedly firing the same background requests.

Likely files:

- `apps/web/src/components/admin/SocialAccountProfilePage.tsx`
- `apps/web/src/lib/admin/admin-live-status.ts`
- `apps/web/src/lib/server/trr-api/admin-read-proxy.ts`
- `apps/web/tests/social-account-profile-page.runtime.test.tsx`
- `apps/web/tests/social-account-profile-auth-bypass.test.tsx`

## Verification

- Passed: `make app-check`
- Result: Node `v24.14.0`, TRR-APP lint passed, TRR-APP typecheck passed.
- Not yet run: browser reproduction after an app fix, because this report only documents the bug.
- Not yet run: a focused React/runtime test that proves secondary reads are deferred while a primary catalog read is active.

## Prevention

- Add a runtime test for the account profile page that verifies only the selected tab's primary read fires immediately.
- Add a timeout/pressure test for `admin-read-proxy` consumers so `BACKEND_TIMEOUT` pauses secondary reads rather than causing request churn.
- Add a browser smoke for `/social/instagram/thetraitorsus` under `make dev-hybrid` that checks the page remains usable when freshness returns 503 or times out.

## Adjacent Sweep

Bounded sweep completed by log/source inspection only:

- Social account profile page fetch effects
- Admin backend proxy timeout normalization
- App Postgres pool pressure logging
- Live-status route usage

No code fix was applied.

## Open Questions

- Should catalog freshness run automatically on page load, or only when the operator clicks a refresh/check action?
- Which reads should be classified as primary for the account profile page: snapshot, selected tab data, or live status?
- Should the app use a shared request scheduler for admin social pages instead of per-effect `fetchAdminWithAuth` calls?
