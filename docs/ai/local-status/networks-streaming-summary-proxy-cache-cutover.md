# Networks Streaming Summary Proxy Cache Cutover

Last updated: 2026-03-26

## Status
- App Batch 2.4 summary lane complete.

## What changed
- Rewired `/api/admin/networks-streaming/summary` into a thin proxy for backend-owned reads at `/admin/shows/networks-streaming/summary`.
- Added user-scoped app cache plus in-flight dedupe for the summary route and preserved the response contract.
- Added a short `5s` summary cache TTL helper so the app route reduces repeated reads without hiding backend updates for long.
- Added an internal `refresh` query param path for explicit cache bypass on summary refresh actions.
- Reworked legacy `/admin/networks` summary polling to pause while the tab is hidden, resume on visibility change, and force-refresh after sync completion, manual refresh, and logo modal save.

## Validation
- Passed: `pnpm -C apps/web exec vitest --run tests/networks-streaming-summary-route.test.ts tests/networks-streaming-summary-route-cache-dedupe.test.ts tests/networks-summary-polling-wiring.test.ts`
- Passed: `pnpm -C apps/web exec eslint src/app/api/admin/networks-streaming/summary/route.ts src/app/admin/networks/page.tsx src/lib/server/trr-api/networks-streaming-route-cache.ts tests/networks-streaming-summary-route.test.ts tests/networks-streaming-summary-route-cache-dedupe.test.ts tests/networks-summary-polling-wiring.test.ts`
- Proxy smoke basis: summary route parity, cache-dedupe, and hidden-tab polling wiring tests all passed (`6` tests total).

## Residual Note
- `apps/web/src/components/admin/UnifiedBrandsWorkspace.tsx` still consumes `/api/admin/networks-streaming/summary`, but it does not use the legacy page’s explicit `refresh` bypass. Immediate freshness there currently depends on the short app cache TTL plus backend cache freshness.

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-26
  current_phase: "app proxy and hidden-tab polling cleanup shipped for Batch 2.4 networks-streaming summary"
  next_action: "verify in managed Chrome that legacy /admin/networks summary refreshes resume correctly after tab visibility changes"
  detail: self
```
