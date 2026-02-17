# TRR-APP — Claude/Codex Playbook

Canonical repo rules: `/Users/thomashulihan/Projects/TRR/TRR-APP/AGENTS.md`.
Workspace coordination rules: `/Users/thomashulihan/Projects/TRR/AGENTS.md`.

## Start-of-Session Checklist
1. Read this file and `/Users/thomashulihan/Projects/TRR/TRR-APP/AGENTS.md`.
2. Read workspace `/Users/thomashulihan/Projects/TRR/AGENTS.md`.
3. Confirm whether task touches backend contracts, auth allowlists, or admin routes.

## Quickstart
```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm -C apps/web exec next dev --webpack -p 3000
```

Workspace dev mode:
```bash
cd /Users/thomashulihan/Projects/TRR
make dev
```

## Fast Validation
```bash
pnpm -C apps/web run lint
pnpm -C apps/web exec next build --webpack
pnpm -C apps/web run test:ci
```

## Mandatory Workflow
1. Keep `TRR_API_URL`-based backend integration paths intact.
2. Do not hardcode backend URLs.
3. For backend contract changes, ensure same-session consumer updates.
4. Follow workspace order for cross-repo work:
   - `TRR-Backend` -> `screenalytics` (if impacted) -> `TRR-APP`
5. Update `docs/ai/HANDOFF.md` before ending session.

## Skill Activation (Repo)
- `figma-frontend-design-engineer`: default for Figma URL/node-based design implementation and parity fixes.
- `senior-frontend`: default for UI/admin/App Router tasks.
- `senior-fullstack`: cross-repo UI + API integration tasks.
- `senior-qa`: tests/coverage/release verification.
- `code-reviewer`: review/risk analysis.
- `tdd-guide`: test-first implementation.
- `senior-backend`: only for API contract deep-dive from app side.
- `senior-devops`: build/CI/deploy concerns.
- `senior-architect`: architecture/data-flow decisions.
- `tech-stack-evaluator`: significant tooling/stack decisions only.
- `aws-solution-architect`: AWS-specific tasks only.

## Key Paths
- App routes: `apps/web/src/app/`
- Components: `apps/web/src/components/`
- Server-only libs: `apps/web/src/lib/server/`
- TRR API client/repositories: `apps/web/src/lib/server/trr-api/`
- Tests: `apps/web/tests/`

## Session Continuity
Before ending session:
1. Record status and test evidence in `docs/ai/HANDOFF.md`.
2. Note remaining UX, integration, or release risks for the next contributor.
