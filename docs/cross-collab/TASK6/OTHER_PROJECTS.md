# Other Projects — Task 6 (Bravo Import + Cast Eligibility + Videos/News)

Repo: TRR-APP
Last updated: February 11, 2026

## Cross-Repo Snapshot

- TRR-Backend: Implemented Bravo parsing/persistence APIs (TASK7).
- TRR-APP: Implemented proxy + UI + cast filtering (this task).
- screenalytics: No code changes expected; status-only task folder update (TASK6).

## Dependency Order

1. TRR-Backend endpoints/snapshots in place.
2. TRR-APP proxies/UI consume persisted Bravo data.
3. screenalytics untouched unless dependency drift appears.

## Locked Contracts

- `TRR_API_URL` normalized to `/api/v1` in backend URL helper.
- Admin proxy routes guarded by `requireAdmin` and backend service-role bearer auth.
- Show/person/season Bravo tabs use persisted backend snapshots, not live scrape calls.
