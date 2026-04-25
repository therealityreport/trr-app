# TRR-APP REPO VAULT

Inherits: /Users/thomashulihan/brain/BRAIN.md

## Scope
- App-only instructions for `/Users/thomashulihan/Projects/TRR/TRR-APP`.
- If routing, ownership, or policy scope is unclear, escalate to `../AGENTS.md`.

## On boot read ONLY
- this file
- /Users/thomashulihan/Projects/TRR/TRR-APP/TRR App Brain/README.md

## On demand
- /Users/thomashulihan/Projects/TRR/TRR-APP/TRR App Brain/architecture.md
- /Users/thomashulihan/Projects/TRR/TRR Workspace Brain/api-contract.md
- /Users/thomashulihan/Projects/TRR/TRR-APP/TRR App Brain/handoffs/
- /Users/thomashulihan/Projects/TRR/TRR-APP/TRR App Brain/sessions/ (most recent only)

## Non-Negotiable Rules
- `AGENTS.md` is the primary project-facing entrypoint for Codex and Claude session work.
- If this would still matter without `/Users/thomashulihan/Projects/TRR/TRR-Backend`, keep it in `TRR App Brain/`; otherwise move it to `/Users/thomashulihan/Projects/TRR/TRR Workspace Brain/`.
- Check `TRR App Brain/handoffs/` before editing.
- If a change crosses the backend boundary, update `/Users/thomashulihan/Projects/TRR/TRR Workspace Brain/api-contract.md`.
- Drop a letter in `/Users/thomashulihan/Projects/TRR/TRR Workspace Brain/handoffs/TRR-APP-to-TRR-Backend.md`.

## Validation
- Run the app-local validation or tests touched by the change.
- Re-read `../AGENTS.md` when workspace startup, MCP routing, or cross-repo policy is involved.

<!-- BRAIN-LEVEL-ROUTING:START -->
## Brain Level Routing

- Level: `repo`
- System brain: `/Users/thomashulihan/brain`
- Project brain: `/Users/thomashulihan/Projects/TRR/TRR Workspace Brain`
- Repo root: `/Users/thomashulihan/Projects/TRR/TRR-APP`
- Write rule: save durable knowledge to the narrowest correct level: repo first, then project, then system.
- Escalation rule: link upward before promoting notes to a broader level.
<!-- BRAIN-LEVEL-ROUTING:END -->
