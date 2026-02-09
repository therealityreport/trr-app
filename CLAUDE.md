# TRR-APP — Claude/Codex Quickstart

Repo operational rules: `AGENTS.md` in this repo.
Workspace coordination rules: `/Users/thomashulihan/Projects/TRR/AGENTS.md`.

## Quickstart
```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm -C apps/web exec next dev --webpack -p 3000
```

Workspace dev (recommended for cross-repo work):
```bash
cd /Users/thomashulihan/Projects/TRR
make dev
```

## Key Directories
- `apps/web/src/app/`: Next.js App Router routes
- `apps/web/src/components/`: React components
- `apps/web/src/lib/server/`: server-only utilities
- `apps/web/src/lib/server/trr-api/`: TRR-Backend API client + repositories
- `apps/web/tests/`: Vitest tests

## Environment
Local env template:
- `apps/web/.env.example`

Key server-side vars:
- `TRR_API_URL` (TRR-Backend base; normalized to `/api/v1`)
- `SCREENALYTICS_API_URL` (screenalytics base for admin tooling)
- `TRR_INTERNAL_ADMIN_SHARED_SECRET` (internal admin proxy to TRR-Backend)

## Fast Validation
```bash
pnpm -C apps/web run lint
pnpm -C apps/web exec next build --webpack
pnpm -C apps/web run test:ci
```

## Session Continuity
Update `docs/ai/HANDOFF.md` before ending a session if you touched this repo.
