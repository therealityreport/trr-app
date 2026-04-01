# Status — Task 19 (Repair admin internal auth routing)

Repo: TRR-APP
Last updated: 2026-03-30

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | App proxy audit and repair | Complete | Audited app admin proxy routes, fixed malformed internal-admin imports, and kept app proxy callers on the internal JWT contract. |
| 2 | Workspace launcher contract fix | Complete | Local workspace restart now injects the launcher-owned internal secret into TRR-APP and TRR-Backend, eliminating shell/env drift. |
| 3 | Runtime verification | Complete | `admin.localhost` rewrites are healthy; underlying admin data routes no longer return `Authentication service unavailable`. |

## Blockers
- No routing/auth blocker remains. Shared social admin actions now reach the
  Modal-backed worker plane; remaining operational monitoring is owned by the
  backend job-plane/readiness lane, not app routing.

## Recent Activity
- 2026-03-30: Task scaffolding created.
- 2026-03-30: Confirmed `admin.localhost` rewrites were correct; root cause was backend auth-contract/runtime env mismatch, not host/path rewrite logic.
- 2026-03-30: Updated app-side tests and proxy route imports to align with the internal-admin JWT flow.
- 2026-03-30: Verified `/api/admin/trr-api/shows/resolve-slug`, `/api/admin/trr-api/shows/{showId}`, `/api/admin/trr-api/shows/{showId}/roles`, `/api/admin/trr-api/social/shared/sources`, `/api/admin/trr-api/social/shared/runs`, and `/api/admin/trr-api/social/shared/review-queue` all return successful local responses again.
- 2026-03-30: Verified `Run Shared Ingest` now reaches backend execution checks and returns worker-plane availability status instead of auth failure.
- 2026-03-30: Verified shared social admin actions now dispatch through the
  healthy Modal worker plane; local admin host routing is no longer blocked by
  worker unavailability.
