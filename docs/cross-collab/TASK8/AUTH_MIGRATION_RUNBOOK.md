# TRR-APP Auth Diagnostics Runbook (Firebase + Supabase Shadow Verification)

Last updated: February 17, 2026

## Objective

Keep Firebase as the real authentication and durable session issuer while using
Supabase verification in shadow mode for diagnostics and parity tracking.

## Current Stage (Implemented)

Current behavior:
- Firebase is the only provider that can authenticate requests and mint durable `__session` cookies.
- `TRR_AUTH_PROVIDER` remains `firebase` by default. Setting it to `supabase` does not enable durable session auth and those login/session paths fail closed.
- Optional Supabase shadow verification is controlled by `TRR_AUTH_SHADOW_MODE`.
- Session login route rejects unsupported durable Supabase session mode in `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/session/login/route.ts`.

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

## Unsupported Durable Supabase Mode

### Behavior
`TRR_AUTH_PROVIDER=supabase` is diagnostics-only in the current architecture.
It must not be used as a durable login/session cutover flag.

### Current outcome
1. Bearer-token request auth still uses Firebase verification.
2. Supabase may run in shadow mode for parity comparison only.
3. Durable login/session routes fail closed instead of storing raw Supabase access tokens in `__session`.

## Future Cutover Prerequisite

Before any real provider cutover work, the architecture has to change so that:
1. Supabase can issue and rotate the durable session artifact used by TRR-APP.
2. Login/logout flows no longer depend on Firebase session-cookie minting.
3. Request auth and session auth share one supported provider contract.
4. This runbook and deploy docs are revised to match the new durable-session implementation.
