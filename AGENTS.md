# AGENTS — TRR-APP (Canonical Repo Policy)

This file is the canonical policy for agents working in `TRR-APP`.
`CLAUDE.md` in this repo is a pointer shim only.

Workspace coordination policy:
- `/Users/thomashulihan/Projects/TRR/AGENTS.md`

## Scope
TRR-APP is a monorepo:
- Primary app: `apps/web/` (Next.js App Router)
- Secondary app: `apps/vue-wordle/` (Vite + Vue)

## Start-of-Session Checklist
1. Read this file first.
2. Read workspace policy: `/Users/thomashulihan/Projects/TRR/AGENTS.md`.
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

Workspace dev mode:
```bash
cd /Users/thomashulihan/Projects/TRR
make dev
```

## Coding Conventions
- TypeScript server-only code stays in `apps/web/src/lib/server/` and uses `server-only` imports where applicable.
- Prefer Server Components; add `"use client"` only when necessary.
- Styling uses Tailwind v4 and established app patterns.

## API and Contract Rules
- TRR-Backend base comes from `TRR_API_URL` and is normalized to `/api/v1` in:
- `apps/web/src/lib/server/trr-api/backend.ts`
- Do not hardcode backend URLs.
- If backend response shape changes, update consumers in same session.

## Auth and Admin Rules
- Auth: Firebase (client/admin).
- Allowlists:
- `ADMIN_EMAIL_ALLOWLIST`
- `ADMIN_DISPLAYNAME_ALLOWLIST`
- Internal admin proxy shared secret: `TRR_INTERNAL_ADMIN_SHARED_SECRET`.

## Cross-Repo Implementation Order (Must Follow)
1. `TRR-Backend` contracts/schema first.
2. `screenalytics` consumers if impacted.
3. `TRR-APP` UI/integration updates.

## Validation and Handoff (Required)
Before ending session:
1. Run fast checks for changed app behavior.
2. Run targeted tests for changed routes/views.
3. Update `docs/ai/HANDOFF.md`.

## Skill Routing
Use repo-local and workspace-local TRR skills first.
Primary skills:
- `orchestrate-plan-execution`
- `figma-frontend-design-engineer`
- `senior-frontend`
- `senior-fullstack`
- `senior-qa`
- `code-reviewer`

Secondary skills:
- `senior-backend`
- `tdd-guide`
- `senior-devops`
- `senior-architect`
- `tech-stack-evaluator`
- `aws-solution-architect`

Canonical owners:
- `figma-frontend-design-engineer` -> `/Users/thomashulihan/Projects/TRR/TRR-APP/skills/figma-frontend-design-engineer/SKILL.md`
- `senior-frontend` -> `/Users/thomashulihan/Projects/TRR/TRR-APP/skills/senior-frontend/SKILL.md`
- `senior-fullstack` -> `/Users/thomashulihan/Projects/TRR/skills/senior-fullstack/SKILL.md`
- `senior-qa` -> `/Users/thomashulihan/Projects/TRR/skills/senior-qa/SKILL.md`
- `code-reviewer` -> `/Users/thomashulihan/Projects/TRR/skills/code-reviewer/SKILL.md`
- `senior-backend` -> `/Users/thomashulihan/Projects/TRR/TRR-Backend/skills/senior-backend/SKILL.md`
- `senior-devops` -> `/Users/thomashulihan/Projects/TRR/skills/senior-devops/SKILL.md`
- `senior-architect` -> `/Users/thomashulihan/Projects/TRR/skills/senior-architect/SKILL.md`

Use global `~/.codex/skills` only for skills that remain globally canonical in the governance matrix.

### Before Each Plan
Before producing any plan:
1. Review the skills available for this app scope:
   - `TRR-APP/skills/` first
   - `/Users/thomashulihan/Projects/TRR/skills/` second
   - globally canonical `~/.codex/skills` third
   - alias or specialist skills only if no canonical owner fits cleanly
2. Choose the minimum skill set needed.
3. State which skills will be used for:
   - plan writing
   - implementation
4. Invoke and follow those selected skills during plan creation and implementation routing.
5. If no repo-local skill fits, fall back to workspace-local, then globally canonical.

### AWS Deploy Rule
For deployable AWS/cloud-infra/backend implementation work:
1. Trigger this rule only when app-side implementation changes require rollout of running AWS-backed services, infra config, or backend behavior that must be deployed.
2. Do not trigger this rule for docs-only, tests-only, local-only, or non-deployed changes.
3. The selected implementation skills must include:
   - `senior-devops`
   - `aws-solution-architect`
4. Required checks must pass before deploy.
5. Implementation is not complete until the AWS deployment is executed successfully to the primary production target when rollout is required.
6. Handoff must record deploy evidence and post-deploy verification.

## MCP Invocation Matrix
| MCP Server | Invoke When |
|---|---|
| `chrome-devtools` | All web browsing, runtime inspection, authenticated UX/admin flow checks in managed Chrome. |
| `figma` | Figma URL/node-driven implementation, screenshot parity, variables, and Code Connect context. |
| `figma-desktop` | Local desktop Figma workflows only when enabled. |
| `github` | PR/issue metadata and remote repository context checks. |
| `supabase` | Supabase schema/functions/storage context required by app integration tasks. |
| `awslabs-core` | First step for AWS-related intent understanding in app infra tasks. |
| `awslabs-aws-api` | Executing concrete AWS operations for app infrastructure dependencies. |
| `awslabs-aws-docs` | AWS docs verification for uncertain service behavior. |
| `awslabs-pricing` | Cost analysis for app deployment architecture options. |
| `awslabs-cloudwatch` | Log/metric/alarm diagnostics for app runtime incidents. |
| `awsknowledge` | AWS architecture tie-breakers and service-selection guidance. |
| `awsiac` | IaC best-practice validation and hardening checks. |

## Drift Prevention
- Canonical repo policy is this `AGENTS.md`.
- `CLAUDE.md` remains pointer-only.
- If conflict exists, this file wins.
