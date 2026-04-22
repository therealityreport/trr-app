# TRR-APP REPO VAULT

Inherits: /Users/thomashulihan/brain/BRAIN.md

## On boot read ONLY
- this file
- /Users/thomashulihan/Projects/TRR/TRR-APP/trr-app-brain/README.md

## On demand
- /Users/thomashulihan/Projects/TRR/TRR-APP/trr-app-brain/architecture.md
- /Users/thomashulihan/Projects/TRR/trr-workspace-brain/api-contract.md
- /Users/thomashulihan/Projects/TRR/TRR-APP/trr-app-brain/handoffs/
- /Users/thomashulihan/Projects/TRR/TRR-APP/trr-app-brain/sessions/ (most recent only)

## Boundary rule
Would this still be true if `/Users/thomashulihan/Projects/TRR/TRR-Backend` disappeared?
- Yes: keep it in this repo's own `trr-app-brain/`
- No: move it to `/Users/thomashulihan/Projects/TRR/trr-workspace-brain/`

## Cross-repo handoff rule
- `AGENTS.md` is the primary project-facing entrypoint for Codex and Claude session work.
- Check `trr-app-brain/handoffs/` before editing.
- If a change crosses the backend boundary, update `/Users/thomashulihan/Projects/TRR/trr-workspace-brain/api-contract.md`.
- Drop a letter in `/Users/thomashulihan/Projects/TRR/trr-workspace-brain/handoffs/TRR-APP-to-TRR-Backend.md`.
