import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import { readPostgresPoolPressureSnapshot } from "@/lib/server/postgres";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { buildInternalAdminHeaders } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

const BACKEND_DB_PRESSURE_TIMEOUT_MS = 3_000;
const SENSITIVE_PRESSURE_KEYS = new Set([
  "query",
  "query_text",
  "queryText",
  "connection_string",
  "connectionString",
  "dsn",
  "password",
  "secret",
  "token",
]);

const unavailableBackendPressure = (reason: string, upstreamStatus?: number): Record<string, unknown> => ({
  status: "unavailable",
  reason,
  ...(upstreamStatus ? { upstream_status: upstreamStatus } : {}),
  db_activity: {
    status: "unavailable",
    reason,
    holders: [],
  },
});

const sanitizePressurePayload = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePressurePayload(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.trim();
    const lowerKey = normalizedKey.toLowerCase();
    if (
      SENSITIVE_PRESSURE_KEYS.has(normalizedKey) ||
      SENSITIVE_PRESSURE_KEYS.has(lowerKey) ||
      lowerKey.includes("query") ||
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token")
    ) {
      continue;
    }
    next[key] = sanitizePressurePayload(raw);
  }
  return next;
};

const readBackendDbPressureSnapshot = async (
  user: Awaited<ReturnType<typeof requireAdmin>>,
): Promise<Record<string, unknown>> => {
  const backendUrl = getBackendApiUrl("/admin/health/db-pressure");
  if (!backendUrl) {
    return unavailableBackendPressure("backend_not_configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_DB_PRESSURE_TIMEOUT_MS);
  try {
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: buildInternalAdminHeaders(toVerifiedAdminContext(user), { Accept: "application/json" }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return unavailableBackendPressure(
        response.status === 401 || response.status === 403 ? "permission_blocked" : "backend_response_error",
        response.status,
      );
    }
    const payload = (await response.json().catch(() => null)) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return unavailableBackendPressure("invalid_backend_payload");
    }
    return sanitizePressurePayload(payload) as Record<string, unknown>;
  } catch (error) {
    const reason =
      error instanceof DOMException && error.name === "AbortError"
        ? "backend_request_timeout"
        : "backend_unavailable";
    return unavailableBackendPressure(reason);
  } finally {
    clearTimeout(timeout);
  }
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const snapshot = readPostgresPoolPressureSnapshot();
    const backendSnapshot = await readBackendDbPressureSnapshot(user);
    return NextResponse.json(
      {
        status: "ok",
        scope: "app_process_pool",
        ...snapshot,
        backend_db_pressure: backendSnapshot,
      },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
