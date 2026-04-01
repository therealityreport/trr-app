# Status — Task 17 (Supabase trust-boundary hardening)

Repo: TRR-APP
Last updated: 2026-03-30

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | Implementation | Complete | Show-list backend migration and Flashback admin server-route migration landed. |

## Blockers
- Survey schema unification is deferred. The current app-side survey repositories expect columns/tables that do not line up with the backend `surveys.*` baseline.

## Recent Activity
- 2026-03-30: Deleted `supabase-trr-core` and routed `/api/shows/list` through TRR-Backend.
- 2026-03-30: Added server-owned Flashback admin quiz/event routes backed by Postgres.
- 2026-03-30: Updated the Flashback admin page to use those server routes instead of direct browser Supabase writes.
- 2026-03-30: Added focused Vitest coverage for the new Flashback admin routes.
