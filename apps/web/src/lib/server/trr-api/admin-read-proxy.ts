import "server-only";

import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import {
  buildInternalAdminHeaders,
  type VerifiedAdminContext,
} from "@/lib/server/trr-api/internal-admin-auth";

export type AdminReadRequestRole = "primary" | "secondary" | "polling";

export class AdminReadProxyError extends Error {
  status: number;
  code?: string;
  retryable?: boolean;
  detail?: Record<string, unknown>;

  constructor(message: string, status: number, options?: {
    code?: string;
    retryable?: boolean;
    detail?: Record<string, unknown>;
  }) {
    super(message);
    this.status = status;
    this.code = options?.code;
    this.retryable = options?.retryable;
    this.detail = options?.detail;
  }
}

export type AdminBackendJsonResult = {
  status: number;
  data: Record<string, unknown>;
  durationMs: number;
};

export type AdminReadCacheStatus = "hit" | "miss" | "refresh";

const readPositiveIntEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export const ADMIN_READ_PROXY_SHORT_TIMEOUT_MS = readPositiveIntEnv(
  "TRR_ADMIN_READ_PROXY_SHORT_TIMEOUT_MS",
  5_000,
);
export const ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS = readPositiveIntEnv(
  "TRR_ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS",
  12_000,
);
export const ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS = readPositiveIntEnv(
  "TRR_ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS",
  15_000,
);
export const ADMIN_READ_PROXY_POLLING_TIMEOUT_MS = readPositiveIntEnv(
  "TRR_ADMIN_READ_PROXY_POLLING_TIMEOUT_MS",
  5_000,
);

const adminReadDiagnosticsEnabled = (): boolean =>
  /^(1|true)$/i.test(process.env.TRR_ADMIN_READ_DIAGNOSTICS ?? "");

export function buildAdminReadResponseHeaders(options: {
  cacheStatus: AdminReadCacheStatus;
  upstreamMs?: number | null;
  totalMs?: number | null;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "x-trr-cache": options.cacheStatus,
  };
  if (options.cacheStatus !== "hit" && Number.isFinite(options.upstreamMs)) {
    headers["x-trr-upstream-ms"] = String(Math.round(options.upstreamMs ?? 0));
  }
  if (adminReadDiagnosticsEnabled() && Number.isFinite(options.totalMs)) {
    headers["x-trr-total-ms"] = String(Math.round(options.totalMs ?? 0));
  }
  return headers;
}

const parseJsonRecord = async (response: Response): Promise<Record<string, unknown>> => {
  const text = await response.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return { error: "Invalid response from backend" };
  }
};

export async function fetchAdminBackendJson(
  path: string,
  options?: {
    timeoutMs?: number;
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: string;
    headers?: Record<string, string>;
    adminContext?: VerifiedAdminContext;
    queryString?: string;
    routeName?: string;
    requestRole?: AdminReadRequestRole;
  },
): Promise<AdminBackendJsonResult> {
  const backendBaseUrl = getBackendApiUrl(path);
  if (!backendBaseUrl) {
    throw new AdminReadProxyError("Backend API not configured", 500);
  }
  const backendUrl = options?.queryString
    ? `${backendBaseUrl}?${options.queryString}`
    : backendBaseUrl;

  const controller = new AbortController();
  const requestRole = options?.requestRole ?? "secondary";
  const timeoutMs =
    options?.timeoutMs ??
    (requestRole === "primary"
      ? path.includes("/gallery") || path.includes("/photos")
        ? ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS
        : ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS
      : requestRole === "polling"
        ? ADMIN_READ_PROXY_POLLING_TIMEOUT_MS
        : ADMIN_READ_PROXY_SHORT_TIMEOUT_MS);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const headers = buildInternalAdminHeaders(options?.adminContext, {
      Accept: "application/json",
      "x-trr-admin-request-role": requestRole,
      ...(options?.headers ?? {}),
    });

    const response = await fetch(backendUrl, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body,
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await parseJsonRecord(response);
    // Backend-generated 504 with REQUEST_TIMEOUT must be normalized to a
    // typed error so callers get retryable timeout handling, not an opaque
    // upstream 504 result.
    if (
      response.status === 504 &&
      typeof data.detail === "object" &&
      data.detail !== null &&
      (data.detail as Record<string, unknown>).code === "REQUEST_TIMEOUT"
    ) {
      const upstreamDetail = data.detail as Record<string, unknown>;
      throw new AdminReadProxyError(
        `Backend request timed out (${upstreamDetail.message ?? "REQUEST_TIMEOUT"})`,
        504,
        {
          code: "BACKEND_REQUEST_TIMEOUT",
          retryable: true,
          detail: {
            route: options?.routeName ?? path,
            request_role: requestRole,
            upstream_detail: upstreamDetail,
          },
        },
      );
    }
    const result: AdminBackendJsonResult = {
      status: response.status,
      data,
      durationMs: performance.now() - startedAt,
    };
    if (options?.routeName && adminReadDiagnosticsEnabled()) {
      console.info(
        `[admin-read-proxy] route=${options.routeName} status=${result.status} latency_ms=${Math.round(result.durationMs)}`,
      );
    }
    return result;
  } catch (error) {
    if (error instanceof AdminReadProxyError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new AdminReadProxyError(
        `Admin read request timed out after ${Math.round(timeoutMs / 1000)}s`,
        504,
        {
          code: "BACKEND_TIMEOUT",
          retryable: true,
          detail: {
            route: options?.routeName ?? path,
            request_role: requestRole,
            timeout_ms: timeoutMs,
            phase: "awaiting_upstream_response",
          },
        },
      );
    }
    if (error instanceof Error && error.message.toLowerCase().includes("fetch failed")) {
      throw new AdminReadProxyError(
        "Could not reach TRR-Backend. Confirm TRR-Backend is running and TRR_API_URL is correct.",
        502,
        { code: "BACKEND_UNREACHABLE", retryable: true },
      );
    }
    throw new AdminReadProxyError(error instanceof Error ? error.message : "failed", 500, {
      code: "BACKEND_PROXY_FAILED",
      retryable: false,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function invalidateAdminBackendCache(
  path: string,
  options?: { routeName?: string; timeoutMs?: number },
): Promise<void> {
  try {
    const result = await fetchAdminBackendJson(path, {
      method: "POST",
      timeoutMs: options?.timeoutMs ?? ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: options?.routeName ? `${options.routeName}:invalidate` : undefined,
    });
    if (result.status !== 200) {
      console.warn(
        `[admin-read-proxy] route=${options?.routeName ?? path} invalidate_status=${result.status}`,
      );
    }
  } catch (error) {
    console.warn(
      `[admin-read-proxy] route=${options?.routeName ?? path} invalidate_failed`,
      error,
    );
  }
}

export function buildAdminProxyErrorResponse(error: unknown): NextResponse {
  const status =
    error instanceof AdminReadProxyError
      ? error.status
      : error instanceof Error && error.message === "unauthorized"
        ? 401
        : error instanceof Error && error.message === "forbidden"
          ? 403
          : 500;
  const message =
    error instanceof AdminReadProxyError
      ? error.message
      : error instanceof Error
        ? error.message
        : "failed";
  const body: Record<string, unknown> = { error: message };
  if (error instanceof AdminReadProxyError && error.code) {
    body.code = error.code;
  }
  if (error instanceof AdminReadProxyError && typeof error.retryable === "boolean") {
    body.retryable = error.retryable;
  }
  if (error instanceof AdminReadProxyError && error.detail) {
    body.detail = error.detail;
  }
  return NextResponse.json(body, { status });
}
