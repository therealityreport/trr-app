# Other Projects — Task 18 (Env contract migration and local startup recovery)

Repo: TRR-APP
Last updated: 2026-03-30

## Cross-Repo Snapshot
- TRR-Backend: producer-side startup and DB contracts repaired first.
- TRR-APP: consumer-side local URL precedence and Vercel env review complete.
- screenalytics: secondary consumer parity complete for local sentinel and canonical DB naming.

## Responsibility Alignment
- TRR-Backend
  - Owns startup gating and canonical backend/runtime DB contracts.
- TRR-APP
  - Owns app env ownership, Vercel preview/production inventory, and admin/backend routing behavior.
- screenalytics
  - Must remain aligned with backend on local/dev sentinel handling and DB env names.

## Dependency Order
1. TRR-Backend
2. screenalytics
3. TRR-APP

## Locked Contracts (Mirrored)
- `TRR_API_URL` is launcher-owned during `make dev`.
- `TRR_LOCAL_DEV=1` distinguishes local workspace runs from deployed runtimes.
- `TRR_DB_URL` with optional `TRR_DB_FALLBACK_URL` is the canonical runtime DB contract.
- `unknown-blocking` Vercel vars block survey cutover until reviewed explicitly.
- `integration-managed-retained` Vercel vars are allowed once documented in `docs/workspace/vercel-env-review.md`.
