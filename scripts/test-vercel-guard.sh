#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERCEL_SH="$SCRIPT_DIR/vercel.sh"
TMP_DIR="$(mktemp -d)"
FAKE_GUARD="$TMP_DIR/vercel-project-guard.py"
NESTED_VERCEL_DIR="$APP_ROOT/apps/web/.vercel"
NESTED_VERCEL_PROJECT="$NESTED_VERCEL_DIR/project.json"
NESTED_VERCEL_BACKUP=""

if [[ -f "$NESTED_VERCEL_PROJECT" ]]; then
  NESTED_VERCEL_BACKUP="$TMP_DIR/nested-project.json.backup"
  cp "$NESTED_VERCEL_PROJECT" "$NESTED_VERCEL_BACKUP"
fi

cleanup() {
  if [[ -n "$NESTED_VERCEL_BACKUP" ]]; then
    mkdir -p "$NESTED_VERCEL_DIR"
    cp "$NESTED_VERCEL_BACKUP" "$NESTED_VERCEL_PROJECT"
  else
    rm -f "$NESTED_VERCEL_PROJECT"
    rmdir "$NESTED_VERCEL_DIR" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cat >"$FAKE_GUARD" <<'PY'
#!/usr/bin/env python3
from __future__ import annotations

import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--project-dir", required=True)
args = parser.parse_args()

if args.project_dir.endswith("/apps/web"):
    print(
        "[vercel-project-guard] ERROR: linked project is web "
        "(prj_0nWn8xpm9ikhcvhzE3ma4jUXTe1p); expected trr-app "
        "(prj_MHpStkwr26rV5kjt0f80zqhwZpAs). "
        "classification=sandbox/stale-nested-project; "
        "production env mutation is blocked from this directory."
    )
    raise SystemExit(1)

print("[vercel-project-guard] OK: trr-app (prj_MHpStkwr26rV5kjt0f80zqhwZpAs)")
PY
chmod +x "$FAKE_GUARD"

prepare_nested_stale_link() {
  mkdir -p "$NESTED_VERCEL_DIR"
  cat >"$NESTED_VERCEL_PROJECT" <<'JSON'
{"projectName":"web","projectId":"prj_0nWn8xpm9ikhcvhzE3ma4jUXTe1p","orgId":"team_test"}
JSON
}

fail() {
  echo "[test-vercel-guard] FAIL: $*" >&2
  exit 1
}

run_ok_contains() {
  local name="$1"
  local expected="$2"
  shift 2
  local output

  if ! output="$("$@" 2>&1)"; then
    echo "$output" >&2
    fail "$name exited non-zero"
  fi
  if [[ "$output" != *"$expected"* ]]; then
    echo "$output" >&2
    fail "$name did not include expected text: $expected"
  fi
  echo "[test-vercel-guard] PASS: $name"
}

run_fail_contains() {
  local name="$1"
  local expected="$2"
  shift 2
  local output
  local status

  set +e
  output="$("$@" 2>&1)"
  status=$?
  set -e

  if [[ "$status" -eq 0 ]]; then
    echo "$output" >&2
    fail "$name unexpectedly passed"
  fi
  if [[ "$output" != *"$expected"* ]]; then
    echo "$output" >&2
    fail "$name did not include expected text: $expected"
  fi
  echo "[test-vercel-guard] PASS: $name"
}

run_fail_contains \
  "canonical production deploy explicit opt-in" \
  "TRR_VERCEL_ALLOW_PROD=1" \
  bash -c 'cd "$1" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_GUARD_ONLY=1 "$2" deploy --prod' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

run_ok_contains \
  "canonical production deploy with explicit opt-in" \
  "[vercel-project-guard] OK: trr-app" \
  bash -c 'cd "$1" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_ALLOW_PROD=1 TRR_VERCEL_GUARD_ONLY=1 "$2" deploy --prod' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

run_ok_contains \
  "canonical preview deploy guard" \
  "[vercel-project-guard] OK: trr-app" \
  bash -c 'cd "$1" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_GUARD_ONLY=1 "$2" deploy' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

run_ok_contains \
  "preview readiness guard" \
  "preview-ready: guard-only accepted" \
  bash -c 'cd "$1" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_GUARD_ONLY=1 "$2" preview-ready' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

run_ok_contains \
  "link bootstrap already linked guard" \
  "link-trr: TRR-APP is already linked" \
  bash -c 'cd "$1" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_GUARD_ONLY=1 "$2" link-trr' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

prepare_nested_stale_link

run_fail_contains \
  "nested production deploy guard" \
  "classification=sandbox/stale-nested-project" \
  bash -c 'cd "$1/apps/web" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_ALLOW_PROD=1 TRR_VERCEL_GUARD_ONLY=1 "$2" deploy --prod' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

run_fail_contains \
  "nested production deploy guard with global option" \
  "classification=sandbox/stale-nested-project" \
  bash -c 'cd "$1/apps/web" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_ALLOW_PROD=1 TRR_VERCEL_GUARD_ONLY=1 "$2" --token test-token deploy --prod' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

run_fail_contains \
  "root command with nested cwd guard" \
  "classification=sandbox/stale-nested-project" \
  bash -c 'cd "$1" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_ALLOW_PROD=1 TRR_VERCEL_GUARD_ONLY=1 "$2" --cwd apps/web deploy --prod' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

run_fail_contains \
  "nested env mutation guard" \
  "classification=sandbox/stale-nested-project" \
  bash -c 'cd "$1/apps/web" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_GUARD_ONLY=1 "$2" env add TRR_TEST production' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

run_ok_contains \
  "nested help bypass" \
  "active_project_dir=<guard-not-required>" \
  bash -c 'cd "$1/apps/web" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_GUARD_ONLY=1 "$2" --help' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

run_ok_contains \
  "nested version bypass" \
  "active_project_dir=<guard-not-required>" \
  bash -c 'cd "$1/apps/web" && TRR_VERCEL_PROJECT_GUARD="$3" TRR_VERCEL_GUARD_ONLY=1 "$2" --version' \
  _ "$APP_ROOT" "$VERCEL_SH" "$FAKE_GUARD"

echo "[test-vercel-guard] OK"
