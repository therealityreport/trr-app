# Status — Task 18 (Env contract migration and local startup recovery)

Repo: TRR-APP
Last updated: 2026-03-30

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | Managed local URL precedence | Complete | Workspace launcher now forces local `TRR_API_URL` and marks local runs with `TRR_LOCAL_DEV=1`. |
| 2 | App env contract cleanup | Complete | `.env.example` now reflects canonical app ownership only. |
| 3 | Validation | Complete | Focused Vitest coverage, workspace preflight, and workspace smoke passed. |
| 4 | Vercel inventory, review, and rollback | Complete | Root `trr-app` inventory reviewed explicitly; retained vars are documented and no `unknown-blocking` entries remain. |

## Blockers
- No app-local blocker remains.
- Survey work is no longer blocked by the Vercel env review surface.

## Recent Activity
- 2026-03-30: Managed local workspace startup now forces loopback backend URLs for child processes, preventing stale shell overrides from hijacking admin traffic.
- 2026-03-30: Updated `apps/web/.env.example` to keep canonical app ownership on `TRR_API_URL`, `TRR_DB_URL`, `TRR_DB_FALLBACK_URL`, `NEXT_PUBLIC_SUPABASE_*`, and `TRR_CORE_SUPABASE_*`.
- 2026-03-30: Focused app validation passed: `pnpm -C apps/web exec vitest run tests/backend-base.test.ts tests/trr-api-backend-base.test.ts tests/postgres-connection-string-resolution.test.ts tests/supabase-client.test.ts tests/supabase-client-env.test.ts`.
- 2026-03-30: Workspace preflight and smoke passed, including `make dev`, `http://127.0.0.1:8000/health`, and loopback local app health.
- 2026-03-30: Initial root `trr-app` inventory surfaced a discrepancy between `vercel env pull` and `vercel env ls`; a mistaken preview removal of `TRR_API_URL` during that review was restored immediately and live app health was re-verified.
- 2026-03-30: Completed the explicit Vercel env review pass. `DATABASE_URL`, production `POSTGRES_*`, production `SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and pull-only platform vars are now documented as retained, while `FIREBASE_SERVICE_ACCOUNT` is documented as canonical app-owned. `docs/workspace/vercel-env-review.md` is now the source of truth for this surface.
