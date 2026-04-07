# Show Page Parity Reddit And Streaming

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-04-02
  current_phase: "show page parity updates landed"
  next_action: "Use as reference while related admin parity work continues."
  detail: self
```

- Updated [page.tsx](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/trr-shows/[showId]/page.tsx) so Settings and Overview now surface RHOSLC-style alt names consistently, include a dedicated `Refresh Links` action, render grouped Reddit communities, and rename `Brands (Network & Streaming)` to `Networks & Streaming`.
- Added regional watch-availability and Reddit grouping helpers in [overview-display.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/show-page/overview-display.ts), and preserved preferred alias casing in [details-form.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/admin/show-page/details-form.ts).
- Extended regression coverage in [show-details-form.test.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-details-form.test.ts), [show-overview-display.test.tsx](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-overview-display.test.tsx), and [show-settings-links-fandom-visibility.test.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/show-settings-links-fandom-visibility.test.ts).
