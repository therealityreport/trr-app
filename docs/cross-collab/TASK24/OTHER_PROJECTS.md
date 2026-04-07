# Other Projects — Task 24 (TRR-APP Supabase Simplification and Index Hardening)

Repo: TRR-APP
Last updated: 2026-04-02

## Cross-Repo Snapshot
- TRR-Backend: Owns the migration and live advisor verification first.
- TRR-APP: Owns Flashback gameplay disablement, browser Supabase removal, and app env/doc/test cleanup.
- screenalytics: No direct repo change expected in this task; its tables are only touched indirectly by backend indexes.

## Responsibility Alignment
- TRR-Backend
  - Add and validate the index-hardening migration before app changes proceed.
- TRR-APP
  - Remove public Flashback gameplay entry points and the browser Supabase client path.
  - Preserve the server-side auth fallback verifier that still uses `TRR_CORE_SUPABASE_*`.
- screenalytics
  - No app-owned work in this session unless backend validation exposes an unexpected cross-repo dependency.

## Dependency Order
1. TRR-Backend
2. screenalytics
3. TRR-APP

## Locked Contracts (Mirrored)
- App runtime Postgres stays unchanged.
- Browser Supabase data access is being removed rather than replaced with another client.
- Server-side auth fallback remains the only surviving Supabase client usage in TRR-APP.
