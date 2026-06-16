#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="$(cd "${APP_ROOT}/.." && pwd)"

# shellcheck disable=SC1091
source "${WORKSPACE_ROOT}/scripts/lib/node-baseline.sh"

trr_ensure_node_baseline_or_exit "package-node-baseline" "${APP_ROOT}"

echo "node=$(node --version)"
echo "npm=$(npm --version)"
echo "pnpm=$(trr_pnpm "${APP_ROOT}" --version)"
echo "packageManager=$(node -p "require('${APP_ROOT}/package.json').packageManager")"
echo "engines.node=$(node -p "require('${APP_ROOT}/package.json').engines.node")"
