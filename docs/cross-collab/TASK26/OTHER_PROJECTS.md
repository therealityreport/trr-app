# Other Projects — Task 26 (Concerns remediation and Screenalytics contract lock)

Repo: TRR-APP
Last updated: 2026-04-09

## Cross-Repo Snapshot
- TRR-Backend: Task 28 owns producer-side auth and gallery contract changes.
- TRR-APP: Task 26 adopts those contract changes and removes brittle UI test assumptions.
- screenalytics: Task 14 keeps only temporary migration surfaces while retirement proceeds.

## Responsibility Alignment
- TRR-Backend
  - Define the backend contracts and retire long-term Screenalytics assumptions.
- TRR-APP
  - Consume producer contracts and keep admin behavior stable during the migration.
- screenalytics
  - Avoid reintroducing permanent runtime assumptions.

## Dependency Order
1. TRR-Backend
2. screenalytics
3. TRR-APP

## Locked Contracts (Mirrored)
- Gallery retrieval is cursor-based and producer-owned in `TRR-Backend`.
- App admin surfaces should point to the TRR-APP-owned Screenalytics workspace, not the legacy peer runtime.
