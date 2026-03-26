# Claude Adapter

Use this adapter when the shared `design-docs-agent` package is invoked from
Claude Code or a Claude slash-command wrapper.

## Entry Surface

- `/design-docs`
- `/design-docs-add-article` (deprecated redirect)

## Capability Mapping

| Shared capability | Claude behavior |
|---|---|
| `browser.navigate` | Claude browser/DevTools navigation tool |
| `browser.snapshot` | Claude browser snapshot/read-tree tool |
| `browser.evaluate` | Claude in-page JS evaluation tool |
| `browser.network.list` | Claude network-request listing tool |
| `browser.network.get` | Claude network-request inspection tool |
| `browser.screenshot` | Claude screenshot tool |
| `delegate.parallel` | Claude parallel subagents if available, else sequential execution |
| `fs.edit` | Claude file edit tool |
| `check.typecheck` | Run repo type-check command and fix local issues caused by this workflow |

## Claude Wrapper Rule

The Claude command wrapper should point at the canonical skill package at:

`TRR-APP/.agents/skills/design-docs-agent/SKILL.md`

Do not maintain a second full implementation in `.claude/skills/`.
