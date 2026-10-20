# Node and package manager compatibility

The application remains on Node `24.x`, selected by `.nvmrc` and both package
engines. The required **Web CI (Node 24 / full)** job keeps lint, typechecks, unit
tests, browser smoke tests, and its build. There is no Node 22 application lane.

**Node 26 Preview (observational)** is a separate nonblocking CI job. It runs a
frozen install, the explicit preview smoke mode, application typecheck,
representative identity/proxy tests, and a web build probe. Its result does not
change the required Node 24 gate or authorize Node 26 for production.

## Explicit package manager bootstrap

CI and the Vercel install command install `corepack@0.36.0` before enabling it.
This exact pin is locally verified; it is not a claim about the latest release.
Corepack 0.36.0 declares Node `^22.22.2 || ^24.15.0 || >=26.0.0` support, so Node
24 bootstrap requires at least 24.15.0. The application's package manager stays
`pnpm@11.5.2`, whose installed package declares Node `>=22.13` support.

```sh
npm install --global corepack@0.36.0
export PATH="$(npm prefix --global)/bin:$PATH"
test "$(corepack --version)" = "0.36.0"
corepack enable
corepack prepare pnpm@11.5.2 --activate
corepack --version  # must report 0.36.0
pnpm --version      # must report 11.5.2
pnpm install --frozen-lockfile
```

The explicit global-bin path prevents a provider's preinstalled Corepack from
shadowing the installed pin. The Vercel install command checks the selected
version before preparing pnpm or installing dependencies.

Node 26 does not supply Corepack. An existing unpinned global pnpm is not proof
that the declared package manager is active. Keep the explicit pin in the CI
bootstrap and Vercel install command together when changing it in a reviewed
package manager update.

## Runtime smoke modes

```sh
# Supported application baseline:
pnpm smoke:node-baseline
# Explicit observational runtime, after selecting Node 26:
pnpm smoke:node-baseline --mode=node26-preview
```

The default mode preserves the workspace's Node 24 activation helper when it is
available. An app-only checkout validates its selected Node directly. The preview
mode never loads the activation helper and fails unless the current runtime is
Node 26. Both modes verify that pnpm matches `packageManager`; neither widens the
application engine declaration.

Local production builds still follow the workspace's current-chat approval rule
and safe build wrapper. A CI build probe is not a deployment. A Vercel install
configuration edit needs preview install/build evidence before deployed behavior
can be accepted; source checks alone do not prove that result.
