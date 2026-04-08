# Show Page Parity Reddit And Streaming

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-04-07
  current_phase: "show page TMDb availability buckets landed"
  next_action: "Use as reference while related admin show parity work continues."
  detail: self
```

- Updated [page.tsx](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx) so Settings and Overview now surface RHOSLC-style alt names consistently, include a dedicated `Refresh Links` action, render grouped Reddit communities, and rename `Brands (Network & Streaming)` to `Networks & Streaming`.
- Added regional watch-availability and Reddit grouping helpers in [overview-display.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/show-page/overview-display.ts), and preserved preferred alias casing in [details-form.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/show-page/details-form.ts).
- Extended regression coverage in [show-details-form.test.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-details-form.test.ts), [show-overview-display.test.tsx](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-overview-display.test.tsx), and [show-settings-links-fandom-visibility.test.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-settings-links-fandom-visibility.test.ts).
- Added a region selector to the `Networks & Streaming` availability block in [page.tsx](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx) so the admin page renders one selected region at a time, defaults to `US` when available, removes the duplicate flat summary chips, and falls back to one uncategorized provider list when grouped availability is missing.
- Added all-region availability helpers in [overview-display.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/show-page/overview-display.ts) and normalized the new `watch_provider_regions` payload in [trr-shows-repository.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/trr-api/trr-shows-repository.ts).
- Updated the `Networks & Streaming` availability cards to render TMDb-backed `Stream`, `Free`, and `Rent / Buy` buckets per region instead of the earlier `Included` bucket, while keeping a single uncategorized fallback list when typed availability is missing.
- Verified RHOSLC already has typed TMDb rows in `core.show_watch_providers`, including `US` `flatrate`, `free`, and `buy`, so this fix is a read/UI contract correction rather than a new data-source integration.
- Passed: `pnpm -C apps/web exec vitest --run tests/show-overview-display.test.tsx tests/show-settings-links-fandom-visibility.test.ts`
- Passed: `pnpm -C apps/web run lint` (warnings only; no errors)
