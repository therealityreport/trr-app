# Other Projects — Task 20 (Follow-up validation and regression hardening)

Repo: TRR-APP
Last updated: 2026-03-31

## Cross-Repo Snapshot
- TRR-Backend: Shared auth repair and lint cleanup implemented. Focused validation is green; full `pytest -q` is still in progress. See TRR-Backend TASK21.
- TRR-APP: Proxy auth cleanup, week-detail regression hardening, and app validation are complete.
- screenalytics: Validation closure is complete with a passing full suite. See screenalytics TASK12.

## Responsibility Alignment
- TRR-Backend
  - Own shared auth rules and backend route compatibility for app proxies.
- TRR-APP
  - Own internal-admin header construction, proxy request behavior, and week-detail UI regression coverage.
- screenalytics
  - Own downstream worker/task validation for cast-screentime consumers.

## Dependency Order
1. TRR-Backend
2. screenalytics
3. TRR-APP

## Locked Contracts (Mirrored)
- `buildInternalAdminHeaders()` is the canonical TRR-APP path for hard-required backend internal auth.
- `/design-docs` remains the canonical design-docs namespace.
- Cast screentime backend auth remains stricter than ordinary admin proxy routes.
