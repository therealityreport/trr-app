# TRR-APP INSTRUCTIONS

## Startup
- Start from this file, ../AGENTS.md, the active user request, and live app files.
- Do not read saved notes, wiki pages, sessions, handoffs, patterns, or decisions on boot.
- Treat old plans and saved notes as stale until revalidated against current repo state, branch, tests, and user intent.

## Scope
- App-only instructions for /Users/thomashulihan/Projects/TRR/TRR-APP.
- If routing, ownership, or policy scope is unclear, use ../AGENTS.md as the workspace authority.

## Cross-Repo Work
- If a change crosses the backend boundary, update the current shared contract docs under /Users/thomashulihan/Projects/TRR/docs/ as needed.
- Coordinate backend follow-through in the same session when app behavior exposes API/schema contract changes.

## Non-Negotiable Rules
- Keep app behavior, API assumptions, and admin surfaces aligned with ../AGENTS.md.
- Validate user-facing runtime assumptions against code, tests, or current runtime state before treating them as fixed.

## Validation
- Run app-local validation or tests touched by the change.
- Re-read ../AGENTS.md when workspace startup, MCP routing, or cross-repo policy is involved.
