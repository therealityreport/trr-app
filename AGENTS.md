# AGENTS — TRR-APP (Operational Rules)

This file is the canonical policy for agents working in `TRR-APP`.
Workspace-level coordination rules are defined at:
- `/Users/thomashulihan/Projects/TRR/AGENTS.md`
- `/Users/thomashulihan/Projects/TRR/CLAUDE.md`

## Scope
TRR-APP is a monorepo:
- Primary app: `apps/web/` (Next.js App Router)
- Secondary app: `apps/vue-wordle/` (Vite + Vue)

## Git Workflow
- Default: work on `main` unless explicitly asked otherwise.
- Only create/use branch/worktree if explicitly requested.
- Never force-push to `main`.

## Start-of-Session Checklist
1. Read this file and `/Users/thomashulihan/Projects/TRR/TRR-APP/CLAUDE.md`.
2. Read workspace `/Users/thomashulihan/Projects/TRR/AGENTS.md` for cross-repo ordering.
3. Confirm whether task changes backend contracts, shared secrets, or admin paths.

## Essential Commands
Install:
```bash
pnpm install
```

Run web (dev):
```bash
pnpm -C apps/web run dev
```

Fast checks:
```bash
pnpm -C apps/web run lint
pnpm -C apps/web exec next build --webpack
pnpm -C apps/web run test:ci
```

Workspace dev mode (cross-repo):
```bash
cd /Users/thomashulihan/Projects/TRR
make dev
```

## Coding Conventions
- TypeScript server-only code stays in `apps/web/src/lib/server/` and uses `server-only` imports where applicable.
- Next.js defaults:
  - Prefer Server Components.
  - Add `"use client"` only when necessary.
- Styling uses Tailwind v4; follow existing app patterns.

## API and Contract Rules
- TRR-Backend base comes from `TRR_API_URL` and is normalized to `/api/v1` in:
  - `apps/web/src/lib/server/trr-api/backend.ts`
- Do not hardcode backend URLs.
- If backend response shape changes, update consumers in:
  - `apps/web/src/lib/server/trr-api/`

## Auth and Admin Rules
- Auth: Firebase (client/admin).
- Allowlists:
  - `ADMIN_EMAIL_ALLOWLIST`
  - `ADMIN_DISPLAYNAME_ALLOWLIST`
- Internal admin proxy shared secret:
  - `TRR_INTERNAL_ADMIN_SHARED_SECRET`

## Deployment
- Deploy target: Vercel (`apps/web` root).
- Keep `apps/web/DEPLOY.md` current when build/runtime requirements change.

## Cross-Repo Implementation Order (Must Follow)
Follow workspace implementation order:
1. `TRR-Backend` contracts/schema first
2. `screenalytics` consumers if impacted
3. `TRR-APP` UI/integration updates

## Validation and Handoff (Required)
Before ending session:
1. Run fast checks for changed app behavior.
2. Run targeted tests for changed views/routes.
3. Update `docs/ai/HANDOFF.md`.

## Skill Routing (Repo)
Use minimal skills required for the task.

Primary skills:
- `figma-frontend-design-engineer`: default for Figma URL/node-driven design-to-code implementation in this repo.
- `senior-frontend`: default for Next.js UI/admin/App Router work.
- `senior-fullstack`: for UI work tightly coupled to backend integration.
- `senior-qa`: frontend/unit/integration test improvements.
- `code-reviewer`: risk scanning and review summaries.

Secondary skills:
- `senior-backend`: only when tracing/fixing API contract behavior from app side.
- `tdd-guide`: test-first implementation flow.
- `senior-devops`: CI/build/deploy hardening.
- `senior-architect`: architecture-level UI/data-flow decisions.
- `tech-stack-evaluator`: major stack/tooling decisions.
- `aws-solution-architect`: AWS-specific decisions only, when explicitly requested.

Skill sequencing for UI feature work:
1. `figma-frontend-design-engineer` (when Figma source exists) or `senior-frontend` (non-Figma UI work)
2. `senior-fullstack` (if cross-repo integration)
3. `senior-qa`
4. `code-reviewer` (review/refinement)
