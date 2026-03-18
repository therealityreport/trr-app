# AGENTS — TRR-APP

Canonical repo policy for `TRR-APP`. `CLAUDE.md` in this repo stays pointer-only.

Read `../AGENTS.md` first for workspace policy. Use this file for app-local rules and validation, then return to the root policy whenever work changes shared contracts, secrets, managed Chrome usage, or shared handoff workflow.

## Scope
- `apps/web/` — Next.js App Router UI, admin flows, and server data access
- `apps/vue-wordle/` — secondary Vue app

## Non-Negotiable Rules
- This repo owns UI behavior, admin flows, and client or server boundaries; backend contracts are followed here, not invented here.
- Follow backend contracts; do not invent response shapes or hardcode backend URLs.
- Backend access must continue to flow through `TRR_API_URL` and `apps/web/src/lib/server/trr-api/backend.ts`.
- Keep server-only code under `apps/web/src/lib/server/` and preserve clear server/client boundaries.
- Prefer Server Components; add `"use client"` only when interaction requires it.
- Preserve Firebase allowlist and admin-secret flows with `ADMIN_EMAIL_ALLOWLIST`, `ADMIN_DISPLAYNAME_ALLOWLIST`, and `TRR_INTERNAL_ADMIN_SHARED_SECRET`.
- For shared changes, app updates land after backend and any affected screenalytics work.

## Validation
- `pnpm -C apps/web run lint`
- `pnpm -C apps/web exec next build --webpack`
- `pnpm -C apps/web run test:ci`
- Run targeted managed-Chrome validation when admin UI behavior, route behavior, or data rendering changes.
