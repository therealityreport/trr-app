# logo featured assignment speed and preview repair

Last updated: 2026-03-16

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-16
  current_phase: "complete"
  next_action: "Run a managed-Chrome interaction pass on Publications and Other brands when chrome-devtools is available in-thread"
  detail: self
```

- Updated the shared brand logo modal so featured wordmark/icon assignment reconciles locally instead of waiting for a full modal reload and source-prefetch cycle.
- Added a dirty-state footer label change from `Close` to `Save` after successful persisted mutations in the modal.
- Canonicalized hosted logo URLs on the Publications and Other brand grids so previously complete cards render hosted previews instead of stale legacy-host placeholders.
- Added modal interaction tests for instant featured assignment, rollback-on-error, and candidate import-to-feature, plus grid tests for hosted-media canonicalization.
