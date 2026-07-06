#!/usr/bin/env bash

set -euo pipefail

VERCEL_VERSION="${TRR_VERCEL_CLI_VERSION:-54.15.1}"
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="$(cd "$APP_ROOT/.." && pwd)"
VERCEL_PROJECT_GUARD="${TRR_VERCEL_PROJECT_GUARD:-$WORKSPACE_ROOT/scripts/vercel-project-guard.py}"
TRR_VERCEL_PROJECT_NAME="${TRR_VERCEL_PROJECT_NAME:-trr-app}"
TRR_VERCEL_TEAM_SLUG="${TRR_VERCEL_TEAM_SLUG:-the-reality-reports-projects}"
TRR_VERCEL_TEAM_ID="${TRR_VERCEL_TEAM_ID:-team_EUsG2kN9TAvVDGOu4yZVEoCX}"
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
    --cwd | --global-config | --local-config | --scope | --target | --token | -A | -Q | -S | -t)
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

vercel_deploy_targets_production() {
  local arg
  local after_deploy=0
  local option_value_for=""
  local skip_next=0

  for arg in "$@"; do
    if [[ "$skip_next" -eq 1 ]]; then
      if [[ "$after_deploy" -eq 1 && "$option_value_for" == "--target" && "$arg" == "production" ]]; then
        return 0
      fi
      skip_next=0
      option_value_for=""
      continue
    fi

    if [[ "$after_deploy" -eq 1 ]]; then
      case "$arg" in
        --prod | --prod=true | --target=production)
          return 0
          ;;
        --target)
          skip_next=1
          option_value_for="$arg"
          ;;
        --*=*)
          continue
          ;;
        -*)
          if option_takes_value "$arg"; then
            skip_next=1
            option_value_for="$arg"
          fi
          ;;
      esac
      continue
    fi

    case "$arg" in
      --*=*)
        continue
        ;;
      -*)
        if option_takes_value "$arg"; then
          skip_next=1
          option_value_for="$arg"
        fi
        continue
        ;;
    esac

    [[ "$arg" == "deploy" ]] && after_deploy=1
  done

  return 1
}

run_vercel_cli() {
  # Use a repo-controlled CLI version so local builds do not depend on a stale
  # globally-installed `vercel` that may reject the workspace's Node 24 baseline.
  if [[ "$PNPM_SPEC" == pnpm@* ]] && command -v corepack >/dev/null 2>&1; then
    corepack "$PNPM_SPEC" dlx "vercel@${VERCEL_VERSION}" "$@"
    return
  fi

  pnpm dlx "vercel@${VERCEL_VERSION}" "$@"
}

run_vercel_cli_with_scope_fallback() {
  local status
  local output
  local tried_primary=0

  if [[ -n "$TRR_VERCEL_TEAM_SLUG" ]]; then
    tried_primary=1
    set +e
    output="$(run_vercel_cli "$@" --scope "$TRR_VERCEL_TEAM_SLUG" 2>&1)"
    status=$?
    set -e
    if [[ "$status" -eq 0 ]]; then
      printf '%s\n' "$output"
      return 0
    fi
    if [[ "$output" != *"specified scope does not exist"* && "$output" != *"scope does not exist"* ]]; then
      printf '%s\n' "$output" >&2
      return "$status"
    fi
    printf '[vercel.sh] Scope %s was not available to the local CLI; retrying with team id %s.\n' "$TRR_VERCEL_TEAM_SLUG" "$TRR_VERCEL_TEAM_ID" >&2
  fi

  if [[ -n "$TRR_VERCEL_TEAM_ID" && ( "$tried_primary" -eq 0 || "$TRR_VERCEL_TEAM_ID" != "$TRR_VERCEL_TEAM_SLUG" ) ]]; then
    run_vercel_cli "$@" --scope "$TRR_VERCEL_TEAM_ID"
    return
  fi

  run_vercel_cli "$@"
}

run_vercel_link_with_scope_fallback() {
  local status
  local output

  set +e
  output="$(run_vercel_cli link --yes --cwd "$APP_ROOT" --scope "$TRR_VERCEL_TEAM_SLUG" --project "$TRR_VERCEL_PROJECT_NAME" 2>&1)"
  status=$?
  set -e
  if [[ "$status" -eq 0 ]]; then
    printf '%s\n' "$output"
    return 0
  fi
  if [[ "$output" != *"specified scope does not exist"* && "$output" != *"scope does not exist"* && "$output" != *"team does not exist"* ]]; then
    printf '%s\n' "$output" >&2
    return "$status"
  fi

  printf '[vercel.sh] Team slug %s was not available to the local CLI; retrying link with team id %s.\n' "$TRR_VERCEL_TEAM_SLUG" "$TRR_VERCEL_TEAM_ID" >&2
  run_vercel_cli link --yes --cwd "$APP_ROOT" --scope "$TRR_VERCEL_TEAM_ID" --project "$TRR_VERCEL_PROJECT_NAME"
}

write_preview_ready_artifact() {
  local output_path="$1"
  local active_project_dir="$2"
  local web_status="$3"
  local web_stdout="$4"
  local web_stderr="$5"
  local speed_status="$6"
  local speed_stdout="$7"
  local speed_stderr="$8"
  local deployments_status="$9"
  local deployments_stdout="${10}"
  local deployments_stderr="${11}"

  mkdir -p "$(dirname "$output_path")"
  python3 - "$output_path" "$active_project_dir" "$TRR_VERCEL_PROJECT_NAME" "$TRR_VERCEL_TEAM_SLUG" "$TRR_VERCEL_TEAM_ID" "$web_status" "$web_stdout" "$web_stderr" "$speed_status" "$speed_stdout" "$speed_stderr" "$deployments_status" "$deployments_stdout" "$deployments_stderr" <<'PY'
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

(
    output_path,
    active_project_dir,
    project_name,
    team_slug,
    team_id,
    web_status,
    web_stdout,
    web_stderr,
    speed_status,
    speed_stdout,
    speed_stderr,
    deployments_status,
    deployments_stdout,
    deployments_stderr,
) = sys.argv[1:]

def read_text(path: str) -> str:
    return Path(path).read_text(encoding="utf-8") if path else ""

def parse_json_from_cli_output(output: str) -> object | None:
    start = output.find("{")
    end = output.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        return json.loads(output[start : end + 1])
    except json.JSONDecodeError:
        return None

def latest_deployment_from_output(output: str) -> dict[str, object] | None:
    parsed = parse_json_from_cli_output(output)
    if not isinstance(parsed, dict):
        return None
    deployments = parsed.get("deployments")
    if not isinstance(deployments, list) or not deployments:
        return None
    first = deployments[0]
    if not isinstance(first, dict):
        return None
    url = first.get("url")
    if not isinstance(url, str) or not url:
        return None
    normalized_url = url if url.startswith(("http://", "https://")) else f"https://{url}"
    return {
        "url": normalized_url,
        "rawUrl": url,
        "state": first.get("state") if isinstance(first.get("state"), str) else None,
        "target": first.get("target") if isinstance(first.get("target"), str) else None,
        "createdAt": first.get("createdAt") if isinstance(first.get("createdAt"), int) else None,
        "ready": first.get("ready") if isinstance(first.get("ready"), int) else None,
        "gitRef": first.get("meta", {}).get("githubCommitRef") if isinstance(first.get("meta"), dict) else None,
        "gitSha": first.get("meta", {}).get("githubCommitSha") if isinstance(first.get("meta"), dict) else None,
    }

deployments_output = read_text(deployments_stdout)
latest_deployment = latest_deployment_from_output(deployments_output)
payload = {
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "projectName": project_name,
    "teamSlug": team_slug,
    "teamId": team_id,
    "activeProjectDir": active_project_dir,
    "latestDeploymentUrl": latest_deployment["url"] if latest_deployment else None,
    "latestDeployment": latest_deployment,
    "checks": {
        "webAnalytics": {
            "status": int(web_status),
            "stdout": read_text(web_stdout),
            "stderr": read_text(web_stderr),
        },
        "speedInsights": {
            "status": int(speed_status),
            "stdout": read_text(speed_stdout),
            "stderr": read_text(speed_stderr),
        },
        "deployments": {
            "status": int(deployments_status),
            "stdout": deployments_output,
            "stderr": read_text(deployments_stderr),
        },
    },
}
Path(output_path).write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
}

default_preview_ready_output() {
  local timestamp

  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  printf '%s\n' "$WORKSPACE_ROOT/.logs/workspace/vercel-preview-ready/$timestamp.json"
}

run_preview_ready() {
  local active_project_dir
  local output_path
  local tmp_dir
  local web_stdout
  local web_stderr
  local speed_stdout
  local speed_stderr
  local deployments_stdout
  local deployments_stderr
  local web_status
  local speed_status
  local deployments_status

  output_path="${TRR_VERCEL_PREVIEW_READY_OUTPUT:-$(default_preview_ready_output)}"

  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --output)
        if [[ -z "${2:-}" ]]; then
          echo "[vercel.sh] preview-ready --output requires a path." >&2
          exit 2
        fi
        output_path="$2"
        shift 2
        ;;
      --output=*)
        output_path="${1#--output=}"
        shift
        ;;
      *)
        echo "[vercel.sh] preview-ready does not accept positional arguments: $1" >&2
        echo "[vercel.sh] Configure with TRR_VERCEL_PROJECT_NAME, TRR_VERCEL_TEAM_SLUG, and TRR_VERCEL_TEAM_ID if needed." >&2
        exit 2
        ;;
    esac
  done

  active_project_dir="$(find_active_vercel_project_dir "$APP_ROOT")"
  if ! python3 "$VERCEL_PROJECT_GUARD" --project-dir "$active_project_dir"; then
    echo "[vercel.sh] Preview readiness blocked: TRR-APP is not linked to the trr-app Vercel project of record." >&2
    echo "[vercel.sh] Link from $APP_ROOT, then rerun: TRR-APP/scripts/vercel.sh link-trr && TRR-APP/scripts/vercel.sh preview-ready" >&2
    exit 1
  fi

  if [[ "${TRR_VERCEL_GUARD_ONLY:-}" == "1" ]]; then
    echo "[vercel.sh] preview-ready: guard-only accepted; active_project_dir=$active_project_dir"
    exit 0
  fi

  tmp_dir="$(mktemp -d)"
  web_stdout="$tmp_dir/web-analytics.stdout"
  web_stderr="$tmp_dir/web-analytics.stderr"
  speed_stdout="$tmp_dir/speed-insights.stdout"
  speed_stderr="$tmp_dir/speed-insights.stderr"
  deployments_stdout="$tmp_dir/deployments.stdout"
  deployments_stderr="$tmp_dir/deployments.stderr"

  echo "[vercel.sh] preview-ready: checking/enabling Web Analytics for $TRR_VERCEL_PROJECT_NAME." >&2
  set +e
  run_vercel_cli_with_scope_fallback project web-analytics "$TRR_VERCEL_PROJECT_NAME" --format json >"$web_stdout" 2>"$web_stderr"
  web_status=$?
  set -e
  cat "$web_stdout"
  cat "$web_stderr" >&2

  echo "[vercel.sh] preview-ready: checking/enabling Speed Insights for $TRR_VERCEL_PROJECT_NAME." >&2
  set +e
  run_vercel_cli_with_scope_fallback project speed-insights "$TRR_VERCEL_PROJECT_NAME" --format json >"$speed_stdout" 2>"$speed_stderr"
  speed_status=$?
  set -e
  cat "$speed_stdout"
  cat "$speed_stderr" >&2

  echo "[vercel.sh] preview-ready: checking latest deployment URL for $TRR_VERCEL_PROJECT_NAME." >&2
  set +e
  run_vercel_cli_with_scope_fallback list "$TRR_VERCEL_PROJECT_NAME" --format json >"$deployments_stdout" 2>"$deployments_stderr"
  deployments_status=$?
  set -e
  cat "$deployments_stderr" >&2

  write_preview_ready_artifact "$output_path" "$active_project_dir" "$web_status" "$web_stdout" "$web_stderr" "$speed_status" "$speed_stdout" "$speed_stderr" "$deployments_status" "$deployments_stdout" "$deployments_stderr"
  cp "$output_path" "$WORKSPACE_ROOT/.logs/workspace/vercel-preview-ready/latest.json"
  rm -rf "$tmp_dir"

  echo "[vercel.sh] preview-ready artifact: $output_path"

  if [[ "$web_status" -ne 0 || "$speed_status" -ne 0 || "$deployments_status" -ne 0 ]]; then
    echo "[vercel.sh] preview-ready failed; see artifact for command output." >&2
    exit 1
  fi
  echo "[vercel.sh] preview-ready: project link, Web Analytics, Speed Insights, and latest deployment checks completed."
}

run_link_trr() {
  if [[ "$#" -gt 0 ]]; then
    echo "[vercel.sh] link-trr does not accept positional arguments." >&2
    exit 2
  fi

  if python3 "$VERCEL_PROJECT_GUARD" --project-dir "$APP_ROOT" >/dev/null 2>&1; then
    echo "[vercel.sh] link-trr: TRR-APP is already linked to $TRR_VERCEL_PROJECT_NAME."
    return 0
  fi

  if [[ "${TRR_VERCEL_GUARD_ONLY:-}" == "1" ]]; then
    echo "[vercel.sh] link-trr: guard-only accepted; would link $APP_ROOT to $TRR_VERCEL_PROJECT_NAME."
    return 0
  fi

  run_vercel_link_with_scope_fallback
  python3 "$VERCEL_PROJECT_GUARD" --project-dir "$APP_ROOT"
}

run_cleanup_doctor() {
  local arg
  local has_scan_root=0

  for arg in "$@"; do
    case "$arg" in
      --scan-root | --scan-root=*)
        has_scan_root=1
        ;;
    esac
  done

  if [[ "$has_scan_root" -eq 1 ]]; then
    exec python3 "$WORKSPACE_ROOT/scripts/vercel-cleanup-doctor.py" --expected-name "$TRR_VERCEL_PROJECT_NAME" "$@"
  fi

  exec python3 "$WORKSPACE_ROOT/scripts/vercel-cleanup-doctor.py" --scan-root "$APP_ROOT" --expected-name "$TRR_VERCEL_PROJECT_NAME" "$@"
}

case "${1:-}" in
  auth-doctor)
    shift
    exec python3 "$WORKSPACE_ROOT/scripts/vercel-auth-doctor.py" --app-root "$APP_ROOT" --project-name "$TRR_VERCEL_PROJECT_NAME" --team-slug "$TRR_VERCEL_TEAM_SLUG" --team-id "$TRR_VERCEL_TEAM_ID" "$@"
    ;;
  cleanup-doctor)
    shift
    run_cleanup_doctor "$@"
    ;;
  link-trr)
    shift
    run_link_trr "$@"
    exit 0
    ;;
  preview-ready)
    shift
    run_preview_ready "$@"
    exit 0
    ;;
esac

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

if vercel_deploy_targets_production "$@" && [[ "${TRR_VERCEL_ALLOW_PROD:-}" != "1" ]]; then
  echo "[vercel.sh] Refusing production deploy without TRR_VERCEL_ALLOW_PROD=1." >&2
  echo "[vercel.sh] Use preview deploys for readiness checks; production deploys need explicit current approval." >&2
  exit 1
fi

if [[ "${TRR_VERCEL_GUARD_ONLY:-}" == "1" ]]; then
  echo "[vercel.sh] guard-only: command accepted; active_project_dir=$active_project_dir"
  exit 0
fi

run_vercel_cli "$@"
