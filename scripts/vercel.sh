#!/usr/bin/env bash

set -euo pipefail

VERCEL_VERSION="${TRR_VERCEL_CLI_VERSION:-50.34.2}"
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="$(cd "$APP_ROOT/.." && pwd)"
VERCEL_PROJECT_GUARD="${TRR_VERCEL_PROJECT_GUARD:-$WORKSPACE_ROOT/scripts/vercel-project-guard.py}"
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

option_takes_value() {
  case "$1" in
    --cwd | --global-config | --local-config | --scope | --token | -A | -Q | -S | -t)
      return 0
      ;;
  esac

  return 1
}

vercel_invocation_cwd() {
  local arg
  local next_is_cwd=0
  local invocation_cwd

  invocation_cwd="$(pwd -P)"
  for arg in "$@"; do
    if [[ "$next_is_cwd" -eq 1 ]]; then
      if [[ "$arg" = /* ]]; then
        invocation_cwd="$arg"
      else
        invocation_cwd="$(pwd -P)/$arg"
      fi
      next_is_cwd=0
      continue
    fi

    case "$arg" in
      --cwd)
        next_is_cwd=1
        ;;
      --cwd=*)
        invocation_cwd="${arg#--cwd=}"
        if [[ "$invocation_cwd" != /* ]]; then
          invocation_cwd="$(pwd -P)/$invocation_cwd"
        fi
        ;;
    esac
  done

  printf '%s\n' "$invocation_cwd"
}

find_active_vercel_project_dir() {
  local dir
  local original_dir

  dir="$1"
  original_dir="$dir"
  if [[ -d "$dir" ]]; then
    dir="$(cd "$dir" && pwd -P)"
    original_dir="$dir"
  fi

  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/.vercel/project.json" ]]; then
      printf '%s\n' "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done

  printf '%s\n' "$original_dir"
}

guard_is_bypassed_read_only_command() {
  local arg

  for arg in "$@"; do
    case "$arg" in
      --help | -h | help | --version | -v | version)
        return 0
        ;;
    esac
  done

  return 1
}

first_vercel_command() {
  local arg
  local skip_next=0

  for arg in "$@"; do
    if [[ "$skip_next" -eq 1 ]]; then
      skip_next=0
      continue
    fi
    case "$arg" in
      --)
        continue
        ;;
      --*=*)
        continue
        ;;
      -*)
        if option_takes_value "$arg"; then
          skip_next=1
        fi
        continue
        ;;
    esac
    printf '%s\n' "$arg"
    return 0
  done

  return 1
}

vercel_env_subcommand() {
  local arg
  local after_env=0
  local skip_next=0

  for arg in "$@"; do
    if [[ "$skip_next" -eq 1 ]]; then
      skip_next=0
      continue
    fi
    if [[ "$after_env" -eq 0 ]]; then
      if [[ "$arg" == --*=* ]]; then
        continue
      fi
      if [[ "$arg" == -* ]]; then
        if option_takes_value "$arg"; then
          skip_next=1
        fi
        continue
      fi
      [[ "$arg" == "env" ]] && after_env=1
      continue
    fi
    if [[ "$arg" == --*=* ]]; then
      continue
    fi
    if [[ "$arg" == -* ]]; then
      if option_takes_value "$arg"; then
        skip_next=1
      fi
      continue
    fi
    printf '%s\n' "$arg"
    return 0
  done

  return 1
}

vercel_project_guard_required() {
  local command
  local env_subcommand

  guard_is_bypassed_read_only_command "$@" && return 1

  command="$(first_vercel_command "$@" || true)"
  case "$command" in
    "" | deploy)
      return 0
      ;;
    env)
      env_subcommand="$(vercel_env_subcommand "$@" || true)"
      case "$env_subcommand" in
        add | rm | remove)
          return 0
          ;;
      esac
      ;;
  esac

  return 1
}

if vercel_project_guard_required "$@"; then
  active_project_dir="$(find_active_vercel_project_dir "$(vercel_invocation_cwd "$@")")"
  if ! python3 "$VERCEL_PROJECT_GUARD" --project-dir "$active_project_dir"; then
    echo "[vercel.sh] Refusing mutating Vercel command from $active_project_dir." >&2
    echo "[vercel.sh] Run production deploy/env mutation commands from $APP_ROOT." >&2
    exit 1
  fi
else
  active_project_dir="<guard-not-required>"
fi

if [[ "${TRR_VERCEL_GUARD_ONLY:-}" == "1" ]]; then
  echo "[vercel.sh] guard-only: command accepted; active_project_dir=$active_project_dir"
  exit 0
fi

# Use a repo-controlled CLI version so local builds do not depend on a stale
# globally-installed `vercel` that may reject the workspace's Node 24 baseline.
if [[ "$PNPM_SPEC" == pnpm@* ]] && command -v corepack >/dev/null 2>&1; then
  exec corepack "$PNPM_SPEC" dlx "vercel@${VERCEL_VERSION}" "$@"
fi

exec pnpm dlx "vercel@${VERCEL_VERSION}" "$@"
