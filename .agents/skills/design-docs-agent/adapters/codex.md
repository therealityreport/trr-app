# Codex Adapter

Use this adapter when the shared `design-docs-agent` package is invoked from
Codex.

## Entry Surface

- repo-local shared skill discovery from `.agents/skills/design-docs-agent/`
- OpenAI agent interface from `agents/openai.yaml` (includes `skillset` block)

## Capability Mapping

| Shared capability | Codex behavior |
|---|---|
| `browser.navigate` | Codex Chrome/DevTools page navigation |
| `browser.snapshot` | Codex snapshot/a11y-tree read |
| `browser.evaluate` | Codex in-page JS evaluation |
| `browser.network.list` | Codex network-request listing |
| `browser.network.get` | Codex network-request inspection |
| `browser.screenshot` | Codex screenshot capture |
| `delegate.parallel` | `spawn_agent` when useful, otherwise sequential execution |
| `fs.edit` | normal repo file editing flow |
| `check.typecheck` | run the repo validation command requested by the skill |

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

## Codex Rule

Codex should consume the canonical shared package directly. Do not create a
mirrored `.codex/skills/design-docs-agent` copy unless discovery testing shows
that `.agents/skills` is insufficient.
