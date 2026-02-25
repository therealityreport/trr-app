#!/usr/bin/env node

import { readFile } from "node:fs/promises";

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
    cookie: "",
    cookieFile: "",
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
    if (token === "--cookie") {
      options.cookie = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (token === "--cookie-file") {
      options.cookieFile = argv[index + 1] || "";
      index += 1;
      continue;
    }
  }

  return {
    showId: options.showId.trim(),
    appOrigin: normalizeOrigin(options.appOrigin, DEFAULT_APP_ORIGIN),
    backendOrigin: normalizeOrigin(options.backendOrigin, DEFAULT_BACKEND_ORIGIN),
    timeoutMs: parseInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS),
    cookie: typeof options.cookie === "string" ? options.cookie.trim() : "",
    cookieFile: typeof options.cookieFile === "string" ? options.cookieFile.trim() : "",
  };
}

export function formatReport(report) {
  return JSON.stringify(report, null, 2);
}

const AUTH_REQUIRED_CODE = "AUTH_REQUIRED";

const resolveAuthStatus = ({ authScope, authMode, status, ok }) => {
  if (!authScope) return "unknown";
  if (status === 401) return "unauthorized";
  if (authMode === "cookie" && ok) return "ok";
  return "unknown";
};

async function runCheck({ fetchImpl, now, timeoutMs, name, url, headers, authMode, authScope }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = now();

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      cache: "no-store",
      headers,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    const latencyMs = Math.max(0, now() - startedAt);
    const authStatus = resolveAuthStatus({
      authScope,
      authMode,
      status: response.status,
      ok: response.ok,
    });

    if (authScope && response.status === 401) {
      const unauthorizedError =
        body && typeof body === "object" && typeof body.error === "string" && body.error.trim()
          ? body.error
          : "Authentication required for admin proxy checks";
      return {
        name,
        url,
        ok: false,
        status: response.status,
        latency_ms: latencyMs,
        code: AUTH_REQUIRED_CODE,
        retryable: false,
        upstream_status: 401,
        error: unauthorizedError,
        auth_mode: authMode,
        auth_status: authStatus,
      };
    }

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
      auth_mode: authMode,
      auth_status: authStatus,
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
      auth_mode: authMode,
      auth_status: "unknown",
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
  cookieHeader = "",
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
}) {
  if (!showId || typeof showId !== "string") {
    throw new Error("Missing required --show-id argument.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch implementation is not available.");
  }
  const normalizedCookieHeader =
    typeof cookieHeader === "string" ? cookieHeader.trim() : "";
  const authMode = normalizedCookieHeader ? "cookie" : "none";
  const appHeaders = normalizedCookieHeader
    ? {
        Cookie: normalizedCookieHeader,
      }
    : undefined;

  const checks = [];
  checks.push(
    await runCheck({
      fetchImpl,
      now,
      timeoutMs,
      name: "backend_health",
      url: `${backendOrigin}/api/v1/health`,
      headers: undefined,
      authMode,
      authScope: false,
    })
  );
  checks.push(
    await runCheck({
      fetchImpl,
      now,
      timeoutMs,
      name: "show_roles_proxy",
      url: `${appOrigin}/api/admin/trr-api/shows/${encodeURIComponent(showId)}/roles`,
      headers: appHeaders,
      authMode,
      authScope: true,
    })
  );
  checks.push(
    await runCheck({
      fetchImpl,
      now,
      timeoutMs,
      name: "cast_role_members_proxy",
      url: `${appOrigin}/api/admin/trr-api/shows/${encodeURIComponent(showId)}/cast-role-members`,
      headers: appHeaders,
      authMode,
      authScope: true,
    })
  );

  const failed = checks.filter((check) => !check.ok);
  const report = {
    ok: failed.length === 0,
    show_id: showId,
    app_origin: appOrigin,
    backend_origin: backendOrigin,
    timeout_ms: timeoutMs,
    auth_mode: authMode,
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

async function resolveCookieHeader(options) {
  if (options.cookie) {
    return options.cookie.trim();
  }
  if (options.cookieFile) {
    const fileContents = await readFile(options.cookieFile, "utf8");
    return fileContents.trim();
  }
  return "";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.showId) {
    console.error(
      "Usage: node scripts/cast-smoke-preflight.mjs --show-id <uuid> [--app-origin <origin>] [--backend-origin <origin>] [--timeout-ms <ms>] [--cookie <rawCookieHeader>] [--cookie-file <path>]"
    );
    process.exitCode = 1;
    return;
  }

  try {
    const cookieHeader = await resolveCookieHeader(options);
    const report = await runPreflight({ ...options, cookieHeader });
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
