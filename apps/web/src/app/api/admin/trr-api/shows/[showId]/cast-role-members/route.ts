import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { resolveAdminShowId } from "@/lib/server/admin/resolve-show-id";
import {
  buildUserScopedRouteCacheKey,
  getRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const BACKEND_TIMEOUT_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_CAST_ROLE_MEMBERS_TIMEOUT_MS,
  120_000,
);
const MAX_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 250;
const CAST_ROLE_MEMBERS_CACHE_NAMESPACE = "admin-show-cast-role-members";
const CAST_ROLE_MEMBERS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_CAST_ROLE_MEMBERS_CACHE_TTL_MS,
);

type ProxyErrorCode =
  | "UPSTREAM_TIMEOUT"
  | "BACKEND_UNREACHABLE"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR"
  | "SHOW_NOT_FOUND";

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

const timeoutJson = (): NextResponse<ProxyErrorPayload> =>
  NextResponse.json(
    {
      error: `Cast role members request timed out after ${Math.round(BACKEND_TIMEOUT_MS / 1000)}s`,
      code: "UPSTREAM_TIMEOUT",
      retryable: true,
      upstream_status: 504,
    },
    { status: 504 }
  );

const parseErrorMessage = (data: unknown, fallback: string): string => {
  if (!data || typeof data !== "object") return fallback;
  const candidate = data as { error?: unknown; detail?: unknown };
  if (typeof candidate.error === "string" && candidate.error.trim()) return candidate.error;
  if (typeof candidate.detail === "string" && candidate.detail.trim()) return candidate.detail;
  return fallback;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { showId: rawShowId } = await params;
    const showId = await resolveAdminShowId(rawShowId);
    if (!showId) {
      return NextResponse.json(
        {
          error: `Show not found for "${rawShowId}".`,
          code: "SHOW_NOT_FOUND",
          retryable: false,
          upstream_status: 404,
        } satisfies ProxyErrorPayload,
        { status: 404 }
      );
    }
    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/cast-role-members`);
    if (!backendUrl) {
      return NextResponse.json(
        {
          error: "Backend API not configured",
          code: "INTERNAL_ERROR",
          retryable: false,
          upstream_status: 500,
        } satisfies ProxyErrorPayload,
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `${showId}:list`,
      request.nextUrl.searchParams,
    );
    const cachedData = getRouteResponseCache<unknown>(
      CAST_ROLE_MEMBERS_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedData) {
      return NextResponse.json(cachedData, { headers: { "x-trr-cache": "hit" } });
    }
    const url = new URL(backendUrl);
    searchParams.forEach((value, key) => url.searchParams.set(key, value));

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error: "Backend auth not configured",
          code: "INTERNAL_ERROR",
          retryable: false,
          upstream_status: 500,
        } satisfies ProxyErrorPayload,
        { status: 500 }
      );
    }

    let lastNetworkError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: { Authorization: `Bearer ${serviceRoleKey}` },
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setRouteResponseCache(
            CAST_ROLE_MEMBERS_CACHE_NAMESPACE,
            cacheKey,
            data,
            CAST_ROLE_MEMBERS_CACHE_TTL_MS,
          );
          return NextResponse.json(data);
        }

        const retryable = shouldRetryStatus(response.status);
        if (retryable && attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_BACKOFF_MS);
          continue;
        }

        return NextResponse.json(
          {
            error: parseErrorMessage(data, "Failed to list cast role members"),
            code: "UPSTREAM_ERROR",
            retryable,
            upstream_status: response.status,
          },
          { status: response.status }
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          if (attempt < MAX_ATTEMPTS) {
            await sleep(RETRY_BACKOFF_MS);
            continue;
          }
          return timeoutJson();
        }
        if (error instanceof Error) {
          lastNetworkError = error;
        }
        if (attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_BACKOFF_MS);
          continue;
        }
        return NextResponse.json(
          {
            error:
              lastNetworkError?.message?.trim() ||
              "Could not reach TRR-Backend while loading cast role members.",
            code: "BACKEND_UNREACHABLE",
            retryable: true,
            upstream_status: 502,
          },
          { status: 502 }
        );
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return NextResponse.json(
      {
        error: "Failed to list cast role members",
        code: "INTERNAL_ERROR",
        retryable: false,
        upstream_status: 500,
      } satisfies ProxyErrorPayload,
      { status: 500 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json(
      {
        error: message,
        code: "INTERNAL_ERROR",
        retryable: false,
        upstream_status: status,
      } satisfies ProxyErrorPayload,
      { status }
    );
  }
}
