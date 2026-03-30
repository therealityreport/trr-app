# Other Projects — Task 14 (Supabase runtime contract cleanup)

Repo: TRR-APP
Last updated: 2026-03-27

## Cross-Repo Snapshot
- TRR-Backend: Canonical contract owner for runtime precedence and session-mode default. See TRR-Backend TASK14.
- TRR-APP: Updating server resolver, browser env split, and warnings in this task.
- screenalytics: Applying the same runtime precedence and warnings in screenalytics TASK9.

## Responsibility Alignment
- TRR-Backend
  - Defines canonical runtime precedence and connection classification.
- TRR-APP
  - Applies canonical precedence to app server and removes browser fallback to server envs.
- screenalytics
  - Aligns screenalytics runtime DB helper with the same contract.

## Dependency Order
1. TRR-Backend
2. screenalytics
3. TRR-APP

## Locked Contracts (Mirrored)
- Runtime precedence is `TRR_DB_URL`, then `TRR_DB_FALLBACK_URL`.
- Browser Supabase envs are explicit and public-prefixed only.
