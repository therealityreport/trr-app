# TRR-APP Supabase Simplification and Index Hardening — Task 24 Plan

Repo: TRR-APP
Last updated: 2026-04-02

## Goal
Complete the app-side half of Supabase simplification after the backend migration: disable incomplete Flashback gameplay routes, remove browser Supabase data access, and clean up app env/docs/tests so the only remaining Supabase client usage is the existing server auth fallback in `src/lib/server/auth.ts`.

## Status Snapshot
Backend-first dependency acknowledged. Live audit confirmed that TRR-APP already uses the correct raw Postgres lane on the server, while Flashback gameplay is incomplete because the app never creates a Supabase user session and live RLS on `public.flashback_sessions` / `public.flashback_user_stats` requires `auth.uid() = user_id`.

## Current Repo Truth

| Repo | Branch | HEAD | Worktree |
|---|---|---|---|
| TRR-Backend | `feat/supabase-unified-hardening` | `e0a74c9bca9f468f37c6ba9df576f63729a0f355` | Dirty in unrelated backend files; preserved |
| TRR-APP | `feat/supabase-unified-hardening` | `7632151729bdd447253020640d568cbafe468507` | Dirty in unrelated app/docs/test files; preserved |

## Scope

### Phase 1: Disable Flashback gameplay routes
Remove navigable user entry points into Flashback gameplay and gate the route family away from public use.

Files to change:
- `apps/web/src/app/flashback/page.tsx`
- `apps/web/src/app/flashback/cover/page.tsx`
- `apps/web/src/app/flashback/play/page.tsx`
- `apps/web/src/app/hub/page.tsx`
- `apps/web/src/lib/admin/games.ts`

### Phase 2: Remove browser Supabase data usage and stale env/docs/tests
Delete the browser data client and Flashback RPC helper surface, update docs, and add route-disable coverage plus explicit auth-fallback coverage.

Files to change:
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/lib/flashback/supabase.ts`
- `apps/web/.env.example`
- `apps/web/README.md`
- `apps/web/POSTGRES_SETUP.md`
- `apps/web/tests/supabase-client.test.ts`
- `apps/web/tests/supabase-client-env.test.ts`
- `apps/web/tests/flashback-supabase.test.ts`
- `apps/web/tests/server-auth-adapter.test.ts`
- `apps/web/tests/*flashback*`
- `docs/cross-collab/TASK24/PLAN.md`
- `docs/cross-collab/TASK24/STATUS.md`
- `docs/cross-collab/TASK24/OTHER_PROJECTS.md`

## Out of Scope
- Flashback admin authoring surfaces and admin APIs
- Changes to `apps/web/src/lib/server/postgres.ts`
- New Supabase data lanes or new connection strings
- Broad design-system cleanup for Flashback references outside active gameplay routing

## Locked Contracts
- The server-side raw Postgres lane remains the only TRR-APP data connection.
- `TRR_CORE_SUPABASE_URL` and `TRR_CORE_SUPABASE_SERVICE_ROLE_KEY` remain in place only for the existing server-side auth fallback / shadow verifier.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` stop being required runtime inputs after Flashback gameplay is disabled.
- Backend-first ordering stays in force; app changes land after the migration work.

## Acceptance Criteria
1. `/flashback`, `/flashback/cover`, and `/flashback/play` are disabled and no public hub entry point still links to them.
2. Browser data writes through `@supabase/supabase-js` are removed from app code.
3. The only remaining app-code `@supabase/supabase-js` usage is the server-side dynamic import in `apps/web/src/lib/server/auth.ts`.
4. `.env.example`, `README.md`, and `POSTGRES_SETUP.md` no longer present `NEXT_PUBLIC_SUPABASE_*` as required runtime envs.
5. `pnpm -C apps/web run lint`, `pnpm -C apps/web exec next build --webpack`, and relevant tests pass or any failure is documented precisely.
6. Task docs remain synchronized with the actual app-side changes.
