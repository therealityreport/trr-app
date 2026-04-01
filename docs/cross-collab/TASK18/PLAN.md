# Env contract migration and local startup recovery — Task 18 Plan

Repo: TRR-APP
Last updated: 2026-03-30

## Goal
Re-lock app env ownership and managed local URL precedence, then review the active `trr-app` Vercel env surface explicitly so survey cutover is gated by documented classifications instead of unknown live vars.

## Status Snapshot
Implementation complete. App-local validation and workspace smoke are green. The active `trr-app` Vercel env surface has now been reviewed explicitly, with retained integration-managed vars documented and no `unknown-blocking` entries remaining.

## Scope
### Phase 1: Managed local URL precedence
- Ensure the workspace launcher owns `TRR_API_URL` for `make dev`.
- Preserve app-side `/api/v1` normalization while preventing stale personal overrides from redirecting local admin traffic.

Files to change:
- `../scripts/dev-workspace.sh`
- `apps/web/src/lib/server/trr-api/backend.ts`

### Phase 2: App env contract cleanup
- Keep browser Supabase on `NEXT_PUBLIC_SUPABASE_*`.
- Keep server/admin Supabase on `TRR_CORE_SUPABASE_*`.
- Keep server Postgres runtime on `TRR_DB_URL`, optional `TRR_DB_FALLBACK_URL`.
- Remove deprecated names from checked-in env examples.

Files to change:
- `apps/web/.env.example`

### Phase 3: Live env inventory, explicit review, and rollback gates
- Capture root `trr-app` Vercel preview/production inventories before mutation.
- Classify every pull-only or integration-style live var as `canonical`, `deprecated-removable`, `integration-managed-retained`, or `unknown-blocking`.
- Retain integration-managed vars explicitly when app runtime no longer depends on their legacy names.
- Restore any mistaken deletion immediately and re-verify health.

## Out of Scope
- Survey consumer cutover beyond baseline recovery.
- Blind removal of Vercel integration-managed Postgres/Supabase values.

## Locked Contracts
- Managed local app startup takes `TRR_API_URL` from the workspace launcher, not inherited shell drift.
- `TRR_DB_URL` with optional `TRR_DB_FALLBACK_URL` is the canonical server Postgres contract.
- `TRR_CORE_SUPABASE_*` is the canonical server/admin Supabase contract.
- `unknown-blocking` Vercel vars block survey cutover.
- `integration-managed-retained` Vercel vars are allowed once documented in `docs/workspace/vercel-env-review.md`.

## Acceptance Criteria
1. Managed local app traffic targets loopback backend during `make dev`.
2. Checked-in app env examples advertise only canonical ownership.
3. Focused app tests and workspace smoke checks pass.
4. The active `trr-app` Vercel env surface is captured, classified, and rollback-safe.
5. Survey cutover is no longer blocked by unexplained Vercel live vars.
