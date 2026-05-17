#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERCEL_SH="$SCRIPT_DIR/vercel.sh"

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

run_ok_contains \
  "canonical production deploy guard" \
  "[vercel-project-guard] OK: trr-app" \
  bash -c 'cd "$1" && TRR_VERCEL_GUARD_ONLY=1 "$2" deploy --prod' \
  _ "$APP_ROOT" "$VERCEL_SH"

run_fail_contains \
  "nested production deploy guard" \
  "classification=sandbox/stale-nested-project" \
  bash -c 'cd "$1/apps/web" && TRR_VERCEL_GUARD_ONLY=1 "$2" deploy --prod' \
  _ "$APP_ROOT" "$VERCEL_SH"

run_fail_contains \
  "nested production deploy guard with global option" \
  "classification=sandbox/stale-nested-project" \
  bash -c 'cd "$1/apps/web" && TRR_VERCEL_GUARD_ONLY=1 "$2" --token test-token deploy --prod' \
  _ "$APP_ROOT" "$VERCEL_SH"

run_fail_contains \
  "root command with nested cwd guard" \
  "classification=sandbox/stale-nested-project" \
  bash -c 'cd "$1" && TRR_VERCEL_GUARD_ONLY=1 "$2" --cwd apps/web deploy --prod' \
  _ "$APP_ROOT" "$VERCEL_SH"

run_fail_contains \
  "nested env mutation guard" \
  "classification=sandbox/stale-nested-project" \
  bash -c 'cd "$1/apps/web" && TRR_VERCEL_GUARD_ONLY=1 "$2" env add TRR_TEST production' \
  _ "$APP_ROOT" "$VERCEL_SH"

run_ok_contains \
  "nested help bypass" \
  "active_project_dir=<guard-not-required>" \
  bash -c 'cd "$1/apps/web" && TRR_VERCEL_GUARD_ONLY=1 "$2" --help' \
  _ "$APP_ROOT" "$VERCEL_SH"

run_ok_contains \
  "nested version bypass" \
  "active_project_dir=<guard-not-required>" \
  bash -c 'cd "$1/apps/web" && TRR_VERCEL_GUARD_ONLY=1 "$2" --version' \
  _ "$APP_ROOT" "$VERCEL_SH"

echo "[test-vercel-guard] OK"
