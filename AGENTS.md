# TRR-APP INSTRUCTIONS

Inherit `../AGENTS.md`; it is authoritative for shared workspace policy.

## Scope
- App-only instructions for /Users/thomashulihan/Projects/TRR/TRR-APP.

## Cross-Boundary Triggers
- When app behavior needs a new or changed API, schema, or auth contract, update the current contract under `../docs/` and coordinate backend-first implementation in the same session.

## Non-Negotiable Rules
- Keep user-facing behavior, API assumptions, and admin surfaces aligned with shared contracts.
- Validate user-facing runtime assumptions against code, tests, browser state, or current runtime state.
- Use the root Portless URLs for operator and browser workflows.

## Validation
- Run the smallest relevant app checks; use `pnpm web:validate:quick` for web changes and `pnpm web:build` when build behavior is affected.
- Include browser validation when routing, authentication, or user-visible behavior changes.

<!-- project-manager:graphify:start -->
## graphify

- Check task-relevant graph freshness before using Graphify evidence.
- When an existing graph is stale because relevant code changed, automatically refresh it locally only after the safety preview passes.
- Never create a missing graph automatically, use a network or LLM backend, or use stale graph evidence.
- If refresh is blocked, fails, or a semantic-document layer is stale, continue from current project files and report that Graphify evidence was omitted or partial.
- Keep lifecycle hooks read-only and non-mutating; they report freshness but never rebuild graphs.
- Keep app-managed transient planning and backup directories outside the corpus via `.graphifyignore`.
- Keep `graphify-out/` local and ignored by Git.
<!-- project-manager:graphify:end -->
