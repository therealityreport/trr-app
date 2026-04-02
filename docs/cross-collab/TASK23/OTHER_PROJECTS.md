# Other Projects — Task 23 (Final Supabase connection audit and donor transition inventory)

Repo: TRR-APP
Last updated: 2026-04-02

## Cross-Repo Snapshot
- TRR-Backend: Owns the canonical DB contract and the backend-side `screenalytics` dependencies the reset must remove. See TRR-Backend TASK24.
- screenalytics: Acts as transition runtime plus donor repo until parity is rebuilt in backend. See screenalytics TASK13.
- TRR-APP: Owns the product/admin surface that must be preserved. See TRR-APP TASK23.

## Responsibility Alignment
- TRR-Backend
  - Replace separate `screenalytics` runtime and storage dependencies.
- screenalytics
  - Supply donor logic and remain usable during the migration window.
- TRR-APP
  - Keep entry points, proxies, and user-visible admin flows stable.

## Dependency Order
1. Backend contract and dependency inventory
2. screenalytics transition/donor inventory
3. app parity checklist and env cleanup

## Locked Contracts (Mirrored)
- App raw Postgres remains canonical-only.
- Server-side Supabase auth envs are active dependencies.
- Flashback browser Supabase remains route-scoped.
