# Other Projects — Task 25 (Instagram Shared-Profile Rollout Guardrails)

Repo: TRR-APP
Last updated: 2026-04-02

## Cross-Repo Snapshot
- TRR-Backend: Matching backend alert and shared-profile metadata changes landed in TRR-Backend TASK26.
- TRR-APP: Implemented and verified locally.
- screenalytics: Not touched.

## Responsibility Alignment
- TRR-Backend
  - Alert contract, shared-profile metadata, Modal rollout docs
- TRR-APP
  - Admin UI rendering, alert copy, network-profile labels, Bravo alias wording
- screenalytics
  - No ownership in this task

## Dependency Order
1. Backend contract additions
2. App rendering updates
3. Joint deploy/canary verification

## Locked Contracts (Mirrored)
- Existing social admin routes remain stable.
- `account_handle` remains the durable route key.
- `network_name` is additive metadata for operator-facing labels.
