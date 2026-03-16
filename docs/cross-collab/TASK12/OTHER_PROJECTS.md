# Other Projects — Task 12 (Cast Screen-Time Analytics)

Repo: TRR-APP
Last updated: 2026-03-16

## Cross-Repo Snapshot
- TRR-Backend: approved episode runs can now persist operator decisions, publish title-card references into the shared corpus, and provide a deployed smoke runner for live closure
- TRR-APP: authenticated admin page now exposes persisted decision actions, title-card/cache review, and a rollback-tested feature gate while keeping promo assets independent
- screenalytics: internal worker lane now emits title-card reference artifacts, stable queue ids, confessional classifier metadata, executable Golden Dataset comparisons, and a formal zero-trust reuse matrix

## Responsibility Alignment
- TRR-Backend
  - Supplies the canonical upload, verification, run, and review contracts.
- TRR-APP
  - Owns the operator/admin UI for upload, run launch, and run inspection.
- screenalytics
  - Runs the worker lane through backend-owned internal write endpoints.

## Dependency Order
1. TRR-Backend
2. screenalytics
3. TRR-APP

## Locked Contracts (Mirrored)
- Keep shared contracts aligned with owning repo PLAN.md.
