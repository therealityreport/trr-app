#!/usr/bin/env bash

set -euo pipefail

VERCEL_VERSION="${TRR_VERCEL_CLI_VERSION:-50.34.2}"

# Use a repo-controlled CLI version so local builds do not depend on a stale
# globally-installed `vercel` that may reject the workspace's Node 24 baseline.
exec pnpm dlx "vercel@${VERCEL_VERSION}" "$@"
