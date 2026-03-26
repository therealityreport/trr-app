import "server-only";

import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export class AdminReadProxyError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type AdminBackendJsonResult = {
  status: number;
  data: Record<string, unknown>;
  durationMs: number;
};

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
export const ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS = readPositiveIntEnv(
  "TRR_ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS",
  8_000,
);

const getServiceRoleKey = (): string => {
  const value =
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new AdminReadProxyError("Backend auth not configured", 500);
  }
  return value.trim();
};

const getInternalSecret = (): string => {
  const value = process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET;
  if (!value) {
    throw new AdminReadProxyError(
      "TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured in the TRR-APP server environment",
      500,
    );
  }
  return value.trim();
};

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
    method?: "GET" | "POST";
    body?: string;
    headers?: Record<string, string>;
    queryString?: string;
    routeName?: string;
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
  const timeoutMs = options?.timeoutMs ?? ADMIN_READ_PROXY_SHORT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const headers = new Headers({
      Authorization: `Bearer ${getServiceRoleKey()}`,
      "X-TRR-Internal-Admin-Secret": getInternalSecret(),
      Accept: "application/json",
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
    const result = {
      status: response.status,
      data,
      durationMs: performance.now() - startedAt,
    };
    if (options?.routeName) {
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
        `Backend request timed out after ${Math.round(timeoutMs / 1000)}s`,
        504,
      );
    }
    if (error instanceof Error && error.message.toLowerCase().includes("fetch failed")) {
      throw new AdminReadProxyError(
        "Could not reach TRR-Backend. Confirm TRR-Backend is running and TRR_API_URL is correct.",
        502,
      );
    }
    throw new AdminReadProxyError(error instanceof Error ? error.message : "failed", 500);
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
  return NextResponse.json({ error: message }, { status });
}
