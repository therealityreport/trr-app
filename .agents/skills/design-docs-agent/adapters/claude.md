# Claude Adapter

Use this adapter when the shared `design-docs-agent` package is invoked from
Claude Code or a Claude slash-command wrapper.

## Entry Surface

- `/design-docs` (unified command — auto-detects brand vs article mode)
- `/design-docs-add-article` (deprecated redirect → `/design-docs`)

## Capability Mapping

| Shared capability | Claude behavior |
|---|---|
| `browser.navigate` | Chrome DevTools MCP `navigate_page` |
| `browser.snapshot` | Chrome DevTools MCP `take_snapshot` |
| `browser.evaluate` | Chrome DevTools MCP `evaluate_script` |
| `browser.network.list` | Chrome DevTools MCP `list_network_requests` |
| `browser.network.get` | Chrome DevTools MCP `get_network_request` |
| `browser.screenshot` | Chrome DevTools MCP `take_screenshot` |
| `delegate.parallel` | Claude parallel subagents (Agent tool) |
| `fs.edit` | Claude Edit tool |
| `check.typecheck` | `npx tsc --noEmit` via Bash tool |

## 20-Skill Roster

See `agents/openai.yaml` for the machine-readable inventory. All 20 skills,
their waves, phases, and statuses match the canonical `SKILL.md`.

### Supporting Skills (Wave 1)
1. `senior-frontend` — App Router, server/client boundaries
2. `senior-qa` — risk-ranked validation, verification reports
3. `code-reviewer` — pre-closeout correctness gate
4. `font-sync` — font specimen generation, R2 upload

### Owned Skills (Wave 1: #5–10, Wave 2: #11–20)
See canonical SKILL.md § "20-Skill Structured Skillset" for full roster.

## Claude Wrapper Rule

The Claude command wrapper should point at the canonical skill package at:

`TRR-APP/.agents/skills/design-docs-agent/SKILL.md`

Do not maintain a second full implementation in `.claude/skills/`.
