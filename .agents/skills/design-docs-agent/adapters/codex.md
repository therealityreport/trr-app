# Codex Adapter

Use this adapter when the shared `design-docs-agent` package is invoked from
Codex.

## Entry Surface

- repo-local shared skill discovery from `.agents/skills/design-docs-agent/`
- optional OpenAI agent interface from `agents/openai.yaml`

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

## Codex Rule

Codex should consume the canonical shared package directly. Do not create a
mirrored `.codex/skills/design-docs-agent` copy unless discovery testing shows
that `.agents/skills` is insufficient.
