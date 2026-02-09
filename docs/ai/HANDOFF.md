# Session Handoff (TRR-APP)

Purpose: persistent state for multi-turn AI agent sessions in `TRR-APP`. Update before ending a session or requesting handoff.

## Goal

- Implement TRR-APP consumer updates for Supabase schema cleanup (credits model cast views + enriched people multi-source fields).

## Status

- Updated cast query sites to use credits-backed views (`core.v_show_cast`, `core.v_episode_cast`) instead of legacy cast tables.
- Added admin person detail UI for enriched `core.people` multi-source fields with source attribution.
- Fixed a TS narrowing issue in `IconRatingInput` and updated a register flow test selector to keep `test:ci` passing.
- Cross-collab task docs updated: `docs/cross-collab/TASK3/*`.
- Fast checks:
  - `pnpm -C apps/web run lint`
  - `pnpm -C apps/web exec next build --webpack`
  - `pnpm -C apps/web run test:ci` (all tests passing)

Pending / not executed:
- Requires TRR-Backend migrations/views (TASK4) applied in Supabase for runtime parity.

## Notes / Constraints

- Workspace dev runner (`/Users/thomashulihan/Projects/TRR/make dev`) provides:
  - `TRR_API_URL` (default `http://127.0.0.1:8000`)
  - `SCREENALYTICS_API_URL` (default `http://127.0.0.1:8001`)
- TRR-Backend routes are under `/api/v1/*` and TRR-APP normalizes the base automatically.

## Next Steps

1. Apply TRR-Backend Supabase migrations (views + people enrichment) in staging/prod; deploy app changes alongside.
2. Spot-check admin people page renders canonical fields correctly once `core.people` enrichment migration is live.

## Verification Commands

```bash
pnpm -C apps/web run lint
pnpm -C apps/web exec next build --webpack
pnpm -C apps/web run test:ci
```

---

Last updated: 2026-02-09
Updated by: Codex
