# Other Projects — Task 5 (Admin “Sync/Refresh Shows”)

Repo: TRR-APP
Last updated: February 10, 2026

## Cross-Repo Snapshot

- TRR-Backend: Add admin endpoints (list sync + per-show refresh). See TRR-Backend TASK6.
- TRR-APP: Add proxy routes + UI buttons (this repo). See TRR-APP TASK5.
- screenalytics: Not impacted.

## Responsibility Alignment

- TRR-Backend
  - Owns the sync/import logic and exposes admin endpoints under `/api/v1/admin/shows/*`.
- TRR-APP
  - Owns the admin UI and Firebase-admin-gated proxy routes that call TRR-Backend using `TRR_CORE_SUPABASE_SERVICE_ROLE_KEY`.
- screenalytics
  - No changes required for this task.

## Dependency Order

1. TRR-Backend: implement endpoints + tests.
2. TRR-APP: implement proxy routes + UI.

## Locked Contracts (Mirrored)

- TRR-APP backend URL contract: `TRR_API_URL` normalized to `/api/v1` in `apps/web/src/lib/server/trr-api/backend.ts`.
- Admin access is enforced in TRR-APP (`requireAdmin`) and TRR-Backend (`AdminUser`).
- Refresh Photos must include IMDb mediaindex (backend script default source `all`).

