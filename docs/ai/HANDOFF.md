# Session Handoff (TRR-APP)

Purpose: persistent state for multi-turn AI agent sessions in `TRR-APP`. Update before ending a session or requesting handoff.

## Goal

- (Fill in current objective)

## Status

- (What is done / in progress / blocked)

## Notes / Constraints

- Workspace dev runner (`/Users/thomashulihan/Projects/TRR/make dev`) provides:
  - `TRR_API_URL` (default `http://127.0.0.1:8000`)
  - `SCREENALYTICS_API_URL` (default `http://127.0.0.1:8001`)
- TRR-Backend routes are under `/api/v1/*` and TRR-APP normalizes the base automatically.

## Next Steps

1. (List the next concrete steps)

## Verification Commands

```bash
pnpm -C apps/web run lint
pnpm -C apps/web exec next build --webpack
pnpm -C apps/web run test:ci
```

---

Last updated: 2026-02-08
Updated by: (name)
