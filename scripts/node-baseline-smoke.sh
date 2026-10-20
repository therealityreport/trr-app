#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="$(cd "${APP_ROOT}/.." && pwd)"
MODE="${1:---mode=node24-default}"
if (( $# > 1 )); then
  echo "Expected one optional --mode argument." >&2
  exit 1
fi
case "$MODE" in
  --mode=node24-default)
    EXPECTED_MAJOR=24
    # Local workspace users keep their existing Node activation path. An app-only
    # CI checkout has no sibling workspace helper and validates its selected Node.
    if [[ -f "${WORKSPACE_ROOT}/scripts/lib/node-baseline.sh" ]]; then
      # shellcheck disable=SC1091
      source "${WORKSPACE_ROOT}/scripts/lib/node-baseline.sh"
      trr_ensure_node_baseline_or_exit "package-node-baseline" "${APP_ROOT}"
    fi
    ;;
  --mode=node26-preview)
    # A preview must prove the selected runtime, never auto-switch to Node 24.
    EXPECTED_MAJOR=26
    ;;
  *)
    echo "Unknown mode. Expected --mode=node24-default or --mode=node26-preview." >&2
    exit 1
    ;;
esac

NODE_VERSION="$(node --version)"
if [[ ! "$NODE_VERSION" =~ ^v([0-9]+)\. ]] || [[ "${BASH_REMATCH[1]}" != "$EXPECTED_MAJOR" ]]; then
  echo "${MODE#--mode=} requires Node ${EXPECTED_MAJOR}.x; found ${NODE_VERSION}." >&2
  exit 1
fi

PACKAGE_MANAGER="$(node -p 'require(process.argv[1]).packageManager' "${APP_ROOT}/package.json")"
ENGINES_NODE="$(node -p 'require(process.argv[1]).engines.node' "${APP_ROOT}/package.json")"
if [[ ! "$PACKAGE_MANAGER" =~ ^pnpm@([0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
  echo "packageManager must pin an exact pnpm version; found ${PACKAGE_MANAGER}." >&2
  exit 1
fi
EXPECTED_PNPM="${BASH_REMATCH[1]}"
PNPM_VERSION="$(pnpm --version)"
if [[ "$PNPM_VERSION" != "$EXPECTED_PNPM" ]]; then
  echo "Expected pnpm ${EXPECTED_PNPM}; found ${PNPM_VERSION}. Bootstrap the pinned Corepack package manager first." >&2
  exit 1
fi
if [[ "$ENGINES_NODE" != "24.x" ]]; then
  echo "Application engines.node must remain 24.x; found ${ENGINES_NODE}." >&2
  exit 1
fi

echo "mode=${MODE#--mode=}"
echo "node=${NODE_VERSION}"
echo "npm=$(npm --version)"
echo "pnpm=${PNPM_VERSION}"
echo "packageManager=${PACKAGE_MANAGER}"
echo "engines.node=${ENGINES_NODE}"
echo "status=ok"
