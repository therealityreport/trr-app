# Other Projects — Task 6 (Bravo Import + Cast Eligibility + Videos/News)

Repo: TRR-APP
Last updated: February 25, 2026

## Cross-Repo Snapshot

- TRR-Backend: Stream reliability updates applied for RHOSLC closeout (`refresh/stream`, `refresh-photos/stream` first-event behavior).
- TRR-APP: Person stream proxy/UI request-id diagnostics and log correlation completed; RHOSLC closeout blocker cleared.
- TRR-APP: Fandom Sync type stabilization added deterministic typecheck lanes and shared payload typings; no backend contract drift.
- screenalytics: No code changes expected; status-only task folder update (TASK6).

## Dependency Order

1. TRR-Backend endpoints/snapshots in place.
2. TRR-APP proxies/UI consume persisted Bravo data.
3. screenalytics untouched unless dependency drift appears.

## Locked Contracts

- `TRR_API_URL` normalized to `/api/v1` in backend URL helper.
- Admin proxy routes guarded by `requireAdmin` and backend service-role bearer auth.
- Show/person/season Bravo tabs use persisted backend snapshots, not live scrape calls.
