# Other Projects — Task 8 (TRR Stack Audit Remediation)

Repo: TRR-APP
Last updated: February 17, 2026

## Cross-Repo Snapshot

- TRR-Backend: Complete for current remediation scope. See TRR-Backend TASK9.
- screenalytics: Complete for current remediation scope. See screenalytics TASK7.
- TRR-APP: In progress for auth migration stages; Stage 1 complete. See TRR-APP TASK8.

## Responsibility Alignment

- TRR-Backend
  - Upstream contract and backend compatibility changes.
- screenalytics
  - Service/runtime and CI adaptation.
- TRR-APP
  - App dependency consistency, Node policy clarity, env hygiene.

## Dependency Order

1. TRR-Backend contract-first updates.
2. screenalytics adaptation if impacted.
3. TRR-APP consumer/runtime alignment and validation.

## Locked Contracts (Mirrored)

- `TRR_API_URL`-based normalization to `/api/v1` remains intact.
- No breaking API response-shape changes without same-session consumer update.
- Workspace default for `SCREENALYTICS_API_URL` is `http://127.0.0.1:8001`.
