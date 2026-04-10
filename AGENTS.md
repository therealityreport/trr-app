# AGENTS — TRR-APP

Last reviewed: 2026-04-09

Canonical repo policy for `TRR-APP`. `CLAUDE.md` in this repo should mirror `AGENTS.md` via a sibling symlink.

Read `../AGENTS.md` first for workspace policy. Use this file for app-local rules and validation, then return to the root policy whenever work changes shared contracts, secrets, managed Chrome usage, or shared handoff workflow.

## Scope
- `apps/web/` — Next.js App Router UI, admin flows, and server data access
- `apps/vue-wordle/` — secondary Vue app with minimal maintenance support under its existing npm workflow

## Deployment
- Vercel deploys `apps/web/`.
- Use `apps/web/vercel.json` as source of truth.
- Treat `.vercel/project.json` as local linkage only.

## Environment
- See `../docs/workspace/env-contract.md` for env contract.

## Non-Negotiable Rules
- This repo owns UI behavior, admin flows, and client or server boundaries; backend contracts are followed here, not invented here.
- Follow backend contracts; do not invent response shapes or hardcode backend URLs.
- Backend access must flow through `TRR_API_URL` and `apps/web/src/lib/server/trr-api/backend.ts`.
- Keep server-only code under `apps/web/src/lib/server/` and preserve clear server/client boundaries.
- Prefer Server Components; add `"use client"` only when interaction requires it.
- Preserve Firebase allowlist and admin-secret flows with `ADMIN_EMAIL_ALLOWLIST`, `ADMIN_DISPLAYNAME_ALLOWLIST`, and `TRR_INTERNAL_ADMIN_SHARED_SECRET`.
- For shared changes, app updates land after backend and any affected screenalytics work.

## Repo Layout and Package Managers
- `apps/web` uses `pnpm`.
- `apps/vue-wordle` stays on its `npm` workflow.
- When touching `apps/vue-wordle`, use its scripts.
- This repo exposes app directories only; do not add shared `packages/` policy unless the structure changes.

## Validation
- `pnpm -C apps/web run lint`
- `pnpm -C apps/web exec next build --webpack`
- `pnpm -C apps/web run test:ci`
- When admin UI behavior, route behavior, or data rendering changes, run targeted browser validation with `chrome-devtools` when available or the managed-Chrome scripts referenced in `../AGENTS.md`.
