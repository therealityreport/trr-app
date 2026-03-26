# Reddit Stable Reads Proxy Cutover

Last updated: 2026-03-26

## Status
- App Batch 2.5 stable Reddit read lane is wired to backend-owned narrow reads.

## What changed
- Rewired the stable Reddit admin read routes under `/api/admin/reddit/...` into thin proxies for backend-owned reads at `/admin/reddit/...`.
- Added user-scoped app cache plus in-flight dedupe for the stable Reddit list, detail, summary, and resolve surfaces.
- Preserved existing stable route contracts for:
  - communities
  - community detail
  - threads
  - thread detail
  - stored post counts
  - analytics summary
  - stored posts
  - analytics posts
  - post resolve
- Hardened the shared stable-read helper so backend query strings are forwarded correctly and backend failures only fall back locally for explicit fallback-eligible statuses.
- Invalidated the stable Reddit cache namespaces after community and thread mutations so the migrated read paths do not serve stale data after writes.

## Validation
- Passed: `pnpm -C apps/web exec vitest --run tests/reddit-communities-route.test.ts tests/reddit-community-route.test.ts tests/reddit-community-stored-post-counts-route.test.ts tests/reddit-community-stored-posts-route.test.ts tests/reddit-community-post-resolve-route.test.ts tests/reddit-threads-route.test.ts tests/reddit-thread-route.test.ts tests/reddit-analytics-posts-route.test.ts tests/reddit-analytics-summary-route.test.ts tests/reddit-stable-read.test.ts tests/reddit-stable-route-cache.test.ts`
- Passed: `pnpm -C apps/web exec eslint src/lib/server/trr-api/admin-read-proxy.ts src/lib/server/trr-api/reddit-stable-read.ts src/lib/server/trr-api/reddit-stable-route-cache.ts src/app/api/admin/reddit/communities/route.ts src/app/api/admin/reddit/communities/[communityId]/route.ts src/app/api/admin/reddit/communities/[communityId]/stored-post-counts/route.ts src/app/api/admin/reddit/communities/[communityId]/stored-posts/route.ts src/app/api/admin/reddit/communities/[communityId]/posts/resolve/route.ts src/app/api/admin/reddit/threads/route.ts src/app/api/admin/reddit/threads/[threadId]/route.ts src/app/api/admin/reddit/analytics/community/[communityId]/summary/route.ts src/app/api/admin/reddit/analytics/community/[communityId]/posts/route.ts tests/reddit-communities-route.test.ts tests/reddit-community-route.test.ts tests/reddit-community-stored-post-counts-route.test.ts tests/reddit-community-stored-posts-route.test.ts tests/reddit-community-post-resolve-route.test.ts tests/reddit-threads-route.test.ts tests/reddit-thread-route.test.ts tests/reddit-analytics-posts-route.test.ts tests/reddit-analytics-summary-route.test.ts tests/reddit-stable-read.test.ts tests/reddit-stable-route-cache.test.ts`

## Smoke / evidence
- Managed-browser smoke on the codex profile:
  - `/admin/social/reddit/rhobh` loaded past the communities bootstrap and issued `GET /api/admin/reddit/communities?include_assigned_threads=0` -> `200`
  - `/admin/social/reddit/rhobh/rhobh/s13/w0` also got a `200` communities bootstrap via `GET /api/admin/reddit/communities?include_inactive=1&include_assigned_threads=0`, but the deep-link then stopped on `Community not found for this window.`
- No hidden-tab polling loop was observed for these stable Reddit surfaces during smoke.

## Hidden dependencies
- Stable communities bootstrap is a hard dependency for both the main Reddit manager and the window/posts surface.
- Direct consumers traced during the proxy migration:
  - `apps/web/src/components/admin/reddit-sources-manager.tsx`
  - `apps/web/src/app/admin/reddit-window-posts/page.tsx`
  - `apps/web/src/app/admin/reddit-post-details/page.tsx`
  - `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`
- Carry forward from Batch 2.4: `apps/web/src/components/admin/UnifiedBrandsWorkspace.tsx` still depends on `/api/admin/networks-streaming/summary`.

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-26
  current_phase: "app proxy and cache cutover shipped for Batch 2.5 stable reddit reads"
  next_action: "keep live/discover/backfill flows out of scope and treat unresolved community/window deep-link mismatches as follow-up parity notes, not Batch 2.5 expansion"
  detail: self
```
