#!/usr/bin/env bash

set -euo pipefail

VERCEL_VERSION="${TRR_VERCEL_CLI_VERSION:-50.34.2}"
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PNPM_SPEC="$(
  python3 - "$APP_ROOT/package.json" <<'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    value = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")).get("packageManager")
except Exception:
    value = None

print(value if isinstance(value, str) and value.startswith("pnpm@") else "pnpm")
PY
)"

# Use a repo-controlled CLI version so local builds do not depend on a stale
# globally-installed `vercel` that may reject the workspace's Node 24 baseline.
if [[ "$PNPM_SPEC" == pnpm@* ]] && command -v corepack >/dev/null 2>&1; then
  exec corepack "$PNPM_SPEC" dlx "vercel@${VERCEL_VERSION}" "$@"
fi

exec pnpm dlx "vercel@${VERCEL_VERSION}" "$@"
