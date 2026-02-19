# TRR-APP Auth Migration Runbook (Firebase -> Supabase)

Last updated: February 17, 2026

## Objective

Execute staged migration of TRR-APP server auth verification from Firebase to Supabase with a rollback-safe path.

## Current Stage (Implemented)

Stage 1 is complete:
- Dual-provider server auth adapter is live in `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/auth.ts`.
- Primary provider is controlled by `TRR_AUTH_PROVIDER` (`firebase` default).
- Optional shadow verification is controlled by `TRR_AUTH_SHADOW_MODE`.
- Session login route supports provider-aware behavior in `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/session/login/route.ts`.

## Stage 2: Shadow Mode Rollout

### Goal
Keep Firebase as primary, run Supabase verification in shadow mode, and measure parity before cutover.

### Required env configuration
- `TRR_AUTH_PROVIDER=firebase`
- `TRR_AUTH_SHADOW_MODE=true`
- `TRR_CORE_SUPABASE_URL=<url>`
- `TRR_CORE_SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`

### Validation gates
1. No sustained spike in `[auth] Shadow verification failed` logs.
2. No sustained spike in `[auth] Shadow verification mismatch` logs.
3. Mismatch rate stays below agreed threshold across admin + survey endpoints.
4. No increase in 401/403 rates on protected API routes.

### Exit criteria
- 3-7 day stable shadow window with no critical parity regressions.

## Stage 3: Primary Cutover

### Goal
Switch primary verification to Supabase while retaining Firebase fallback for rollback safety.

### Required env configuration
- `TRR_AUTH_PROVIDER=supabase`
- `TRR_AUTH_SHADOW_MODE=true` (recommended during first cutover window)

### Validation gates
1. Protected route success/deny behavior remains unchanged vs baseline.
2. Admin allowlist behavior remains unchanged (`email`/`uid`/display-name checks).
3. No auth-related increase in API error rate.
4. Session login/logout flows remain stable in production and preview.

### Rollback plan
1. Set `TRR_AUTH_PROVIDER=firebase`.
2. Keep `TRR_AUTH_SHADOW_MODE=true` for post-incident parity diagnostics.
3. Verify recovery on representative protected routes.

## Firebase Decommission Readiness Checklist

Before removing Firebase auth paths:
1. Supabase has been primary for one full release cycle with no auth regressions.
2. Fallback-to-Firebase warnings have dropped to effectively zero.
3. Session/login route no longer requires Firebase session-cookie minting.
4. Downstream consumers/tests no longer depend on Firebase-specific claim fields.
5. Runbook and deploy docs are updated with final provider state.

