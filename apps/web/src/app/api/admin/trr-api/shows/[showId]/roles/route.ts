import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import {
  buildUserScopedRouteCacheKey,
  getRouteResponseCache,
  invalidateRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const LIST_BACKEND_TIMEOUT_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SHOW_ROLES_TIMEOUT_MS,
  20_000,
);
const MUTATION_BACKEND_TIMEOUT_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SHOW_ROLES_MUTATION_TIMEOUT_MS,
  60_000,
);
const MAX_ATTEMPTS = 2;
const SHOW_ROLES_CACHE_NAMESPACE = "admin-show-roles";
const SHOW_ROLES_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SHOW_ROLES_CACHE_TTL_MS,
);

type ProxyErrorCode =
  | "UPSTREAM_TIMEOUT"
  | "BACKEND_UNREACHABLE"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

type ProxyErrorPayload = {
  error: string;
  code?: ProxyErrorCode;
  retryable?: boolean;
  upstream_status?: number;
};

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const shouldRetryStatus = (status: number): boolean => status === 502 || status === 503 || status === 504;

const parseErrorMessage = (data: unknown, fallback: string): string => {
  if (!data || typeof data !== "object") return fallback;
  const payload = data as { error?: unknown; detail?: unknown };
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  return fallback;
};

const listTimeoutJson = (): NextResponse<ProxyErrorPayload> =>
  NextResponse.json(
    {
      error: `Roles request timed out after ${Math.round(LIST_BACKEND_TIMEOUT_MS / 1000)}s`,
      code: "UPSTREAM_TIMEOUT",
      retryable: true,
      upstream_status: 504,
    },
    { status: 504 }
  );

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { showId } = await params;
    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/roles`);
    if (!backendUrl) return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, `${showId}:list`, request.nextUrl.searchParams);
    const cachedData = getRouteResponseCache<unknown>(SHOW_ROLES_CACHE_NAMESPACE, cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData, { headers: { "x-trr-cache": "hit" } });
    }
    const url = new URL(backendUrl);
    searchParams.forEach((value, key) => url.searchParams.set(key, value));

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });

    let lastNetworkError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), LIST_BACKEND_TIMEOUT_MS);
      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: { Authorization: `Bearer ${serviceRoleKey}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setRouteResponseCache(SHOW_ROLES_CACHE_NAMESPACE, cacheKey, data, SHOW_ROLES_CACHE_TTL_MS);
          return NextResponse.json(data);
        }

        const retryable = shouldRetryStatus(response.status);
        if (retryable && attempt < MAX_ATTEMPTS) {
          await sleep(200);
          continue;
        }
        return NextResponse.json(
          {
            error: parseErrorMessage(data, "Failed to list roles"),
            code: "UPSTREAM_ERROR",
            retryable,
            upstream_status: response.status,
          } satisfies ProxyErrorPayload,
          { status: response.status }
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          if (attempt < MAX_ATTEMPTS) {
            await sleep(200);
            continue;
          }
          return listTimeoutJson();
        }
        if (error instanceof Error) {
          lastNetworkError = error;
        }
        if (attempt < MAX_ATTEMPTS) {
          await sleep(200);
          continue;
        }
        return NextResponse.json(
          {
            error:
              lastNetworkError?.message?.trim() ||
              "Could not reach TRR-Backend while loading show roles.",
            code: "BACKEND_UNREACHABLE",
            retryable: true,
            upstream_status: 502,
          } satisfies ProxyErrorPayload,
          { status: 502 }
        );
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return NextResponse.json(
      {
        error: "Failed to list roles",
        code: "INTERNAL_ERROR",
        retryable: false,
      } satisfies ProxyErrorPayload,
      { status: 500 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { showId } = await params;
    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/roles`);
    if (!backendUrl) return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MUTATION_BACKEND_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: `Create role request timed out after ${Math.round(MUTATION_BACKEND_TIMEOUT_MS / 1000)}s` },
          { status: 504 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            (data as { error?: string; detail?: string }).error ||
            (data as { detail?: string }).detail ||
            "Failed to create role",
        },
        { status: response.status }
      );
    }
    invalidateRouteResponseCache(SHOW_ROLES_CACHE_NAMESPACE, `${user.uid}:${showId}:`);

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
