# Status — Task 8 (TRR Stack Audit Remediation)

Repo: TRR-APP
Last updated: February 17, 2026

## Phase Status

| Phase | Description | Status | Notes |
|------:|-------------|--------|-------|
| 0 | Cross-repo bootstrap and safety checks | Complete | TASK8 docs created and linked. |
| 1 | Version/policy consistency remediation | Complete | `eslint-config-next` aligned to Next 16.1.6; CI now runs Node 20 full + Node 22 compatibility lane. |
| 2 | Env contract and CI guardrails | Complete | `.env.example` URL/duplicate-key fixes applied; env and merge-marker checks wired in CI. |
| 3 | Auth abstraction (Supabase target, Stage 1) | Complete | Added dual-provider server auth adapter (Firebase/Supabase), shadow verification mode, and provider-aware session login handling while keeping Firebase default. |
| 4 | Auth migration execution prep (Stage 2/3) | Complete | Added shadow-mode parity diagnostics, dedicated auth adapter tests, and explicit cutover/rollback runbook. |

## Blockers

None.

## Recent Activity

- February 17, 2026: Created TASK8 scaffold files (PLAN/OTHER_PROJECTS/STATUS).
- February 17, 2026: Synced dependency order with TRR-Backend TASK9 and screenalytics TASK7.
- February 17, 2026: Updated Node support policy in deploy docs and CI matrix.
- February 17, 2026: Fixed `SCREENALYTICS_API_URL` default and removed duplicate `DATABASE_URL` in `apps/web/.env.example`.
- February 17, 2026: Synced downstream readiness: screenalytics TASK7 completed lint-signal restoration and Wave A upgrade validation, keeping the Backend -> screenalytics -> APP dependency chain unblocked.
- February 17, 2026: Implemented Stage 1 auth abstraction:
  - `src/lib/server/auth.ts` now supports provider order and fallback (`TRR_AUTH_PROVIDER=firebase|supabase`) plus optional shadow verification (`TRR_AUTH_SHADOW_MODE=true`).
  - `src/app/api/session/login/route.ts` now emits provider metadata and supports Supabase-mode cookie session storage.
  - Added migration env keys to `.env.example` and deploy docs (`TRR_AUTH_PROVIDER`, `TRR_AUTH_SHADOW_MODE`).
- February 17, 2026: Validation:
  - `pnpm -C apps/web run lint` (pass; existing warnings only)
  - `pnpm -C apps/web run test -- tests/admin-shows-by-trr-show-route.test.ts tests/reddit-threads-route.test.ts tests/reddit-community-flares-refresh-route.test.ts tests/show-bravo-videos-proxy-route.test.ts tests/person-refresh-images-stream-route.test.ts` (pass; suite run completed with 57 files, 215 tests passing)
  - `pnpm -C apps/web exec next build --webpack` (pass)
- February 17, 2026: Added shadow parity mismatch diagnostics in auth adapter:
  - warns on mismatched `uid` / `email` / `name` between primary and shadow providers.
- February 17, 2026: Added dedicated auth adapter test suite:
  - `tests/server-auth-adapter.test.ts`
  - coverage: firebase primary, supabase fallback, shadow mismatch logging, supabase-admin allowlist path.
- February 17, 2026: Added Stage 2/3 migration runbook:
  - `docs/cross-collab/TASK8/AUTH_MIGRATION_RUNBOOK.md`
- February 17, 2026: Added auth migration observability surface:
  - `src/lib/server/auth.ts` now tracks runtime diagnostics counters for shadow checks/failures/mismatches and fallback successes.
  - added `getAuthDiagnosticsSnapshot()` for server-side diagnostics reads.
  - added admin endpoint `GET /api/admin/auth/status` (`src/app/api/admin/auth/status/route.ts`).
- February 17, 2026: Added tests for diagnostics and endpoint:
  - `tests/server-auth-adapter.test.ts` (counter assertions)
  - `tests/admin-auth-status-route.test.ts` (response + unauthorized handling)
- February 17, 2026: Added Stage 3 cutover readiness evaluator + dashboard visibility:
  - `src/lib/server/auth-cutover.ts` introduces threshold-based readiness evaluation for shadow parity rollout gates.
  - `GET /api/admin/auth/status` now returns `cutoverReadiness` alongside diagnostics.
  - `admin/dev-dashboard` now surfaces auth migration readiness (observed counters, thresholds, and blocking reasons).
  - Added threshold env keys:
    - `TRR_AUTH_CUTOVER_MIN_SHADOW_CHECKS`
    - `TRR_AUTH_CUTOVER_MAX_SHADOW_FAILURES`
    - `TRR_AUTH_CUTOVER_MAX_SHADOW_MISMATCH_EVENTS`
- February 17, 2026: Added readiness-focused tests:
  - `tests/auth-cutover-readiness.test.ts`
  - `tests/admin-auth-status-route.test.ts` (cutover payload assertions)
- February 17, 2026: Added auth diagnostics reset workflow for controlled migration windows:
  - Added `resetAuthDiagnosticsSnapshot()` and diagnostics window metadata (`windowStartedAt`, `lastObservedAt`) in `src/lib/server/auth.ts`.
  - Added admin endpoint `POST /api/admin/auth/status/reset` (`src/app/api/admin/auth/status/reset/route.ts`).
  - Updated dev dashboard auth card to show diagnostics window timestamps and a `Reset Window` control.
- February 17, 2026: Added reset/window tests:
  - `tests/admin-auth-status-reset-route.test.ts`
  - `tests/server-auth-adapter.test.ts` reset assertions
- February 17, 2026: Validation:
  - `pnpm -C apps/web exec vitest run tests/auth-cutover-readiness.test.ts tests/admin-auth-status-route.test.ts tests/admin-auth-status-reset-route.test.ts tests/server-auth-adapter.test.ts` (`12 passed`)
  - `pnpm -C apps/web run lint` (pass; warnings only)
  - `pnpm -C apps/web exec next build --webpack` currently fails on unrelated typed-route mismatch in `src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx` (`buildSeasonAdminUrl` return type vs `router.replace` requirement).
