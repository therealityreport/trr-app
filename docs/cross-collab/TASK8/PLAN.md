# TRR Stack Audit Remediation — Task 8 Plan

Repo: TRR-APP
Last updated: February 17, 2026

## Goal

Resolve app-side consistency drift (Next/eslint skew, Node policy split, env defects) while preserving backend contract compatibility.

## Scope

1. Align `next` and `eslint-config-next` versions.
2. Make Node support matrix explicit in CI (20 primary, 22 compatibility).
3. Correct `.env.example` drift:
- `SCREENALYTICS_API_URL` workspace default,
- remove duplicate `DATABASE_URL` entry.
4. Add env contract check and conflict-marker CI guard.
5. Keep API-base normalization behavior unchanged in `apps/web/src/lib/server/trr-api/backend.ts`.
6. Implement auth migration Stage 1 abstraction (Firebase/Supabase provider adapter) and prepare Stage 2/3 rollout runbook.

## Out of Scope

- Backend schema changes.
- screenalytics runtime internals.

## Locked Contracts

- `TRR_API_URL` remains canonical backend base input.
- Internal admin shared secret behavior remains unchanged.
- No consumer breakage for existing backend response shapes.

## Acceptance Criteria

1. App lint/build/tests pass on Node 20 lane.
2. Node 22 compatibility lane is green for smoke checks.
3. `.env.example` no longer contains duplicate keys or stale screenalytics default.
4. TASK8 docs are synchronized with TRR-Backend TASK9 and screenalytics TASK7.
5. Auth abstraction supports provider selection and shadow parity mode without breaking existing `requireUser`/`requireAdmin` consumers.
6. Stage 2/3 auth migration runbook is documented with cutover and rollback steps.
