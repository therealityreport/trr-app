# Vue Wordle reference sandbox

Status: reference-only. This retained Vue/Vite example is not a supported TRR
product or a production deployment target. Owner role: TRR-APP maintainer for
reference examples; no separately assigned individual owner is recorded.

## Installation and verification boundary

[`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) explicitly excludes this
package. A main-workspace install does not establish its dependencies are
installed or verified. Any local experiment requires an intentionally separate
installation in this directory, with the current package-manager isolation
options verified first. No installation is performed by this documentation.

[`package.json`](package.json) owns local `dev`, `build`, `preview` and
`typecheck` scripts. The [root package scripts](../../package.json) retain
`wordle:*` convenience commands. Their presence does not establish CI support.
[Web Tests](../../.github/workflows/web-tests.yml) runs in `apps/web` and does not
cover this sandbox. Local sandbox checks and a supported product CI lane would
need their own evidence; neither is claimed here.

## Retention and lifecycle

Keep this path and its reference code in place. Promotion requires a selected
product purpose, an accountable maintainer, dependency/security ownership,
repeatable checks, CI inclusion and an explicit deployment decision. Retirement
requires an incoming-reference and reuse review, owner acceptance and a
reversible archive with matching source hashes before any move or removal.

The [workspace domain index](../../../docs/workspace/domain-routing.md) maps
supported game features to their existing code owners. This sandbox is not a
replacement for Bravodle, Realitease or Flashback.
