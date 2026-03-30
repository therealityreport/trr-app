# Supabase runtime contract cleanup — Task 14 Plan

Repo: TRR-APP
Last updated: 2026-03-27

## Goal
Align TRR-APP server and browser Supabase usage with the shared runtime contract and explicit public env policy.

## Status Snapshot
Implementation delegated in parallel after backend contract changes.

## Scope

### Phase 1: Implement
Implement app server resolver, browser env split, and app-side warnings.

Files to change:
- `apps/web/src/lib/server/postgres.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/lib/server/supabase-trr-admin.ts`
- `apps/web/src/lib/server/auth.ts`
- affected tests and `.env.example`

## Out of Scope
- Items owned by other repos unless explicitly required.

## Locked Contracts
- Runtime precedence mirrors backend: `TRR_DB_URL` -> `TRR_DB_FALLBACK_URL`.
- Browser client requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Default runtime lane is Supavisor session mode.

## Acceptance Criteria
1. TRR-APP changes complete and validated.
2. Cross-repo dependency order is respected.
3. Fast checks pass for TRR-APP.
4. Task docs remain synchronized.
