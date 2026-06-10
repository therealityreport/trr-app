#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PORT:-}" ]]; then
  echo "PORT is required. Run this through Portless: pnpm run api:portless" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_ROOT="$(cd "$APP_ROOT/../TRR-Backend" && pwd)"
PYTHON="$BACKEND_ROOT/.venv/bin/python"

if [[ ! -x "$PYTHON" ]]; then
  echo "TRR backend virtualenv python was not found at $PYTHON" >&2
  exit 1
fi

cd "$BACKEND_ROOT"

exec "$PYTHON" -m dotenv -f "$APP_ROOT/../profiles/default.env" run --override \
  "$PYTHON" -m dotenv -f "$BACKEND_ROOT/.env" run --no-override \
  "$PYTHON" -m uvicorn api.main:app --reload --host 127.0.0.1 --port "$PORT"
