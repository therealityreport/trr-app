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
Use minimal skills required for the task after the mandatory default skill chain is applied.

## Default Skill Chain (Mandatory)
Apply this chain for all non-trivial implementation tasks (any task that changes repo-tracked files, validates behavior for a change, or prepares commit/PR/handoff artifacts):
1. `orchestrate-plan-execution`
2. `senior-fullstack`
3. `senior-backend` or `senior-frontend` (pick by primary surface)
4. `senior-qa`
5. `code-reviewer`

TRR-APP mapping for step 3:
- Frontend-first default: choose `senior-frontend` when UI/rendering/interaction is primary and there is no backend/schema/API/pipeline contract risk.
- Choose `senior-backend` when backend/schema/API/pipeline contract risk is present.
- Tie-breaker when both surfaces are touched: choose `senior-backend` if any contract/schema/pipeline semantics are changed; otherwise choose `senior-frontend`.

Exceptions:
- Trivial read-only tasks and simple Q&A.
- Explicit user override.
- Skill unavailable (must document fallback).

Domain skills are additive:
- `figma-frontend-design-engineer`, `senior-devops`, `senior-architect`, and other domain skills may be added, but must not replace the five baseline steps when the trigger rule applies.

Handoff compliance keys for qualifying tasks (`docs/ai/HANDOFF.md`):
- `default_skill_chain_applied` (`true|false`)
- `default_skill_chain_used` (ordered list)
- `default_skill_chain_exception_reason` (required when not applied)

Primary skills:
- `orchestrate-plan-execution`: Codex-primary default entrypoint for non-trivial plan + execute tasks; Claude remains secondary.
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

## MCP Routing Matrix (Required)
Use deterministic routing. Select a single primary path and use fallback only if blocked.

| Task Type | Primary Tool | Fallback Tool | Required When | Forbidden When |
|---|---|---|---|---|
| Figma URL/node implementation | Figma MCP | `senior-frontend` with existing design-system patterns | Any task includes a Figma URL or node ID | Do not skip Figma MCP when design source is available |
| UI flow/regression validation | Playwright MCP | Chrome DevTools MCP | Interactive states, forms, navigation, or auth/admin flows change | Do not rely on static code review alone for interaction regressions |
| Runtime/network/client-debug investigation | Chrome DevTools MCP | Playwright MCP | Browser runtime, request, caching, or hydration issues are involved | Do not treat backend-only CLI checks as sufficient |
| Issue/project status updates | Linear MCP | `docs/ai/HANDOFF.md` status note if Linear unavailable | Cross-repo dependencies or release-impacting work | Do not close high-risk work without status artifact |
| External framework/spec verification | Web tool (primary sources only) | Repo docs/source | Versioned framework behavior is uncertain | Do not use non-primary sources for technical decisions |

Deterministic examples:
1. Figma node parity task -> Figma MCP + `figma-frontend-design-engineer`.
2. Admin flow regression after UI update -> Playwright MCP first, then targeted tests.
3. Hydration/network error triage -> Chrome DevTools MCP, then Playwright reproduction.

## Sub-Agent Delegation Contract (Required)
One agent may execute multiple roles, but all role outputs are mandatory.

Delegation tuple (required):
- `role`
- `scope`
- `deliverable`
- `verification_command`
- `status` (`pending|in_progress|completed|blocked`)

Required roles:
- `Design Context Owner`: captures design source and acceptance targets.
- `UI Implementer`: delivers component/page behavior and parity notes.
- `API Integration Owner`: validates TRR backend contract usage in app server code.
- `QA Owner`: validates regressions, test evidence, and risk closure.

Required handoff location:
- `docs/ai/HANDOFF.md` must include `delegation_map` with one entry per required role.

## Execution Modes and Risk Gates
Design execution mode is mandatory for frontend tasks:
- `figma_driven`: task is anchored to Figma URL/node.
- `code_first`: task is anchored to existing codebase patterns without Figma source.

Required gates by mode:
1. `figma_driven`
- Record file key/node ID or equivalent design reference.
- Include parity evidence (screens/behavior notes).
2. `code_first`
- Reference reused local patterns/components.
- Include rationale for pattern choice.

Risk gates:
- High-risk (`auth`, `admin`, server data mutation, or backend contract touch) blocks completion unless lint/build/tests and interaction validation evidence are present.
- If backend response shape changed, document impact and ensure same-session consumer update path remains valid.

## Acceptance Evidence Schema
All behavior-changing sessions must record these keys in `docs/ai/HANDOFF.md`:
- `primary_skill`
- `supporting_skills`
- `mcp_tools_used`
- `delegation_map`
- `risk_class`
- `validation_evidence`
- `downstream_repos_impacted`
- `default_skill_chain_applied`
- `default_skill_chain_used`
- `default_skill_chain_exception_reason`

Schema requirements:
1. `mcp_tools_used` must capture primary + fallback choice if fallback is used.
2. `delegation_map` must include all required roles.
3. `validation_evidence` must include command(s) and pass/fail result.
4. `downstream_repos_impacted` must include `TRR-Backend`, `screenalytics`, `TRR-APP` with `yes/no`.
5. `default_skill_chain_exception_reason` is required when `default_skill_chain_applied=false`.

## Policy Compliance Checks (Mandatory)
Run from `TRR-APP/` before handoff:
```bash
rg -n "^## MCP Routing Matrix \\(Required\\)$" AGENTS.md
rg -n "^## Sub-Agent Delegation Contract \\(Required\\)$" AGENTS.md
rg -n "^## Execution Modes and Risk Gates$" AGENTS.md
rg -n "^## Acceptance Evidence Schema$" AGENTS.md
rg -n "^## Policy Compliance Checks \\(Mandatory\\)$" AGENTS.md
rg -n "^## Escalation and Stop Conditions$" AGENTS.md
rg -n "primary_skill|supporting_skills|mcp_tools_used|delegation_map|risk_class|validation_evidence|downstream_repos_impacted|default_skill_chain_applied|default_skill_chain_used|default_skill_chain_exception_reason" docs/ai/HANDOFF.md
```

Pass criteria:
1. All section-header checks return exactly one match.
2. Handoff schema key check returns expected keys for behavior-changing sessions.
3. High-risk sessions include interaction validation evidence, not only static checks.

## Escalation and Stop Conditions
Stop and escalate immediately when any of the following are true:
1. `figma_driven` task has inaccessible or ambiguous design source and parity cannot be validated.
2. Backend contract dependency is unclear and blocks safe UI/API integration.
3. Required MCP/tool path is unavailable and fallback cannot provide equivalent evidence.
4. Auth/admin security behavior is uncertain after changes.

Escalation packet must include:
1. Selected mode/risk class.
2. Blocking condition.
3. Evidence gathered so far.
4. Proposed unblock options with impact.
