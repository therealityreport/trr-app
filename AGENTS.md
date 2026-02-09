# AGENTS — TRR-APP (Operational Rules)

This file defines how automated agents and contributors should work in **TRR-APP**.
For cross-repo coordination rules, see the workspace root:
- `/Users/thomashulihan/Projects/TRR/AGENTS.md`
- `/Users/thomashulihan/Projects/TRR/CLAUDE.md`

## Project Overview
TRR-APP is a Next.js monorepo:
- Primary app: `apps/web/` (Next.js App Router)
- Secondary app: `apps/vue-wordle/` (Vite + Vue)

## Git Workflow
This repo intentionally does **not** prescribe branching.
- Default is work on `main`.
- Only create/use a branch or worktree if explicitly asked.
- Never force-push to `main`.

## Essential Commands
Install:
```bash
pnpm install
```

Run web (dev):
```bash
pnpm -C apps/web run dev
```

Workspace dev (recommended when coordinating across repos):
```bash
cd /Users/thomashulihan/Projects/TRR
make dev
```

Fast checks (pre-commit):
```bash
pnpm -C apps/web run lint
pnpm -C apps/web exec next build --webpack
pnpm -C apps/web run test:ci
```

## Coding Conventions
- TypeScript: keep server-only code in `apps/web/src/lib/server/` and import `server-only` where appropriate.
- Next.js:
  - Prefer server components by default.
  - Add `"use client"` only when required.
- Styling: Tailwind CSS (v4). Keep UI changes consistent with existing patterns in the app.

## API / Contract Rules
- TRR-Backend API base comes from `TRR_API_URL` (server-only env) and is normalized to `/api/v1` in:
  - `apps/web/src/lib/server/trr-api/backend.ts`
- Do not hardcode backend URLs in code.
- If TRR-Backend response shapes change, update consumers in:
  - `apps/web/src/lib/server/trr-api/`

## Auth / Admin Rules
- User auth: Firebase (client + admin).
- Admin allowlists:
  - `ADMIN_EMAIL_ALLOWLIST` (server)
  - `ADMIN_DISPLAYNAME_ALLOWLIST` (server)
- Internal admin proxy shared secret (TRR-APP → TRR-Backend):
  - `TRR_INTERNAL_ADMIN_SHARED_SECRET`

## Deployment
- Deploy target: Vercel (Root Directory `apps/web`).
- Keep `apps/web/DEPLOY.md` up to date when changing build/runtime requirements.

## Session Continuity
Update `docs/ai/HANDOFF.md` before ending a session if you touched this repo.
