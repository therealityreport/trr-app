---
name: senior-frontend
description: Repo-local canonical owner for TRR-APP Next.js App Router UI, rendering, interaction, accessibility, client-state behavior, and stable-contract frontend implementation.
---
Use this repo-local skill for implementation inside `TRR-APP` when the frontend is the primary change surface and backend contracts are already decided.

## When to use
1. `apps/web/` rendering, interaction, routing, metadata, or UI state is changing.
2. App Router behavior, loading/error boundaries, or server/client component placement matters.
3. Browser validation or client-side security guardrails matter for the change.

## When not to use
1. Backend contract or schema changes are still undecided.
2. Review-only or planning-only requests.
3. Generic Vercel deployment guidance.

## Preflight
1. Confirm backend contracts are stable or already updated.
2. Identify the rendering mode and route boundary:
   - server component
   - client component
   - route handler
   - metadata/loading/error boundary
3. Identify auth, sensitive-state, and browser-validation concerns.

## Frontend checklist
1. Preserve established Next.js and repo conventions first.
2. Apply App Router checks:
   - server/client boundary
   - loading/error states
   - metadata and route behavior
3. Apply UI validation cues:
   - deterministic browser checks
   - console/network inspection only when needed
4. Apply client-facing security checks:
   - sensitive data exposure
   - auth UX and guard behavior
   - unsafe client-side assumptions

## Imported strengths
1. From `nextjs-developer`: App Router, server-component, metadata, loading/error boundary prompts.
2. From `chromedevtools-expert`: deterministic browser-debug and validation cues.
3. From `secure-code-guardian`: client-facing security considerations and auth UX guardrails.

## Explicit rejections
1. Do not assume Vercel-specific deployment behavior unless the task requires it.
2. Do not absorb backend ownership when contracts are still moving.

## Completion contract
Return:
1. `frontend_surface`
2. `rendering_boundaries`
3. `contract_dependencies`
4. `validation_run`
5. `residual_ui_risks`
