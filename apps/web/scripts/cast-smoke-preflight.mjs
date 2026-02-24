#!/usr/bin/env node

const DEFAULT_APP_ORIGIN = process.env.TRR_APP_ORIGIN || "http://admin.localhost:3000";
const DEFAULT_BACKEND_ORIGIN = process.env.TRR_BACKEND_ORIGIN || "http://127.0.0.1:8000";
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.TRR_CAST_SMOKE_PREFLIGHT_TIMEOUT_MS || "20000", 10);

function normalizeOrigin(value, fallback) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;
  return raw.replace(/\/+$/, "");
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseArgs(argv) {
  const options = {
    showId: "",
    appOrigin: DEFAULT_APP_ORIGIN,
    backendOrigin: DEFAULT_BACKEND_ORIGIN,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--show-id") {
      options.showId = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (token === "--app-origin") {
      options.appOrigin = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (token === "--backend-origin") {
      options.backendOrigin = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (token === "--timeout-ms") {
      options.timeoutMs = parseInteger(argv[index + 1], DEFAULT_TIMEOUT_MS);
      index += 1;
      continue;
    }
  }

  return {
    showId: options.showId.trim(),
    appOrigin: normalizeOrigin(options.appOrigin, DEFAULT_APP_ORIGIN),
    backendOrigin: normalizeOrigin(options.backendOrigin, DEFAULT_BACKEND_ORIGIN),
    timeoutMs: parseInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS),
  };
}

export function formatReport(report) {
  return JSON.stringify(report, null, 2);
}

async function runCheck({ fetchImpl, now, timeoutMs, name, url }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = now();

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    const latencyMs = Math.max(0, now() - startedAt);
    const envelope =
      body && typeof body === "object"
        ? {
            code: typeof body.code === "string" ? body.code : undefined,
            retryable: typeof body.retryable === "boolean" ? body.retryable : undefined,
            upstream_status:
              typeof body.upstream_status === "number" ? body.upstream_status : undefined,
            error: typeof body.error === "string" ? body.error : undefined,
          }
        : {};

    return {
      name,
      url,
      ok: response.ok,
      status: response.status,
      latency_ms: latencyMs,
      ...envelope,
    };
  } catch (error) {
    const latencyMs = Math.max(0, now() - startedAt);
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      name,
      url,
      ok: false,
      status: isAbort ? 504 : 0,
      latency_ms: latencyMs,
      code: isAbort ? "UPSTREAM_TIMEOUT" : "BACKEND_UNREACHABLE",
      retryable: true,
      upstream_status: isAbort ? 504 : 502,
      error: error instanceof Error ? error.message : "Unknown preflight error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runPreflight({
  showId,
  appOrigin,
  backendOrigin,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
}) {
  if (!showId || typeof showId !== "string") {
    throw new Error("Missing required --show-id argument.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch implementation is not available.");
  }

  const checks = [];
  checks.push(
    await runCheck({
      fetchImpl,
      now,
      timeoutMs,
      name: "backend_health",
      url: `${backendOrigin}/api/v1/health`,
    })
  );
  checks.push(
    await runCheck({
      fetchImpl,
      now,
      timeoutMs,
      name: "show_roles_proxy",
      url: `${appOrigin}/api/admin/trr-api/shows/${encodeURIComponent(showId)}/roles`,
    })
  );
  checks.push(
    await runCheck({
      fetchImpl,
      now,
      timeoutMs,
      name: "cast_role_members_proxy",
      url: `${appOrigin}/api/admin/trr-api/shows/${encodeURIComponent(showId)}/cast-role-members`,
    })
  );

  const failed = checks.filter((check) => !check.ok);
  const report = {
    ok: failed.length === 0,
    show_id: showId,
    app_origin: appOrigin,
    backend_origin: backendOrigin,
    timeout_ms: timeoutMs,
    checked_at: new Date(now()).toISOString(),
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
  };
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.showId) {
    console.error(
      "Usage: node scripts/cast-smoke-preflight.mjs --show-id <uuid> [--app-origin <origin>] [--backend-origin <origin>] [--timeout-ms <ms>]"
    );
    process.exitCode = 1;
    return;
  }

  try {
    const report = await runPreflight(options);
    const output = formatReport(report);
    process.stdout.write(`${output}\n`);
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preflight failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isDirectRun) {
  void main();
}
