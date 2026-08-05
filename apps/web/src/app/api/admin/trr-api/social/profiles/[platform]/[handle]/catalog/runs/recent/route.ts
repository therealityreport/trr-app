import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getStaleRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import { parseBoundedIntegerParam } from "@/lib/server/trr-api/query-integer-params";
import {
  buildAdminBackendStatusError,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

const CATALOG_RECENT_RUNS_CACHE_NAMESPACE = "social-account-catalog-recent-runs";
const CATALOG_RECENT_RUNS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_CATALOG_RECENT_RUNS_CACHE_TTL_MS,
  10_000,
);
const CATALOG_RECENT_RUNS_STALE_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_CATALOG_RECENT_RUNS_STALE_CACHE_TTL_MS,
  60_000,
);
const CATALOG_RECENT_RUNS_BACKEND_TIMEOUT_MS = 10_000;

const normalizeHandle = (value: string): string =>
  value.trim().toLowerCase().replace(/^@+/, "");

const readLimit = (request: NextRequest) =>
  parseBoundedIntegerParam(request.nextUrl.searchParams.get("limit"), {
    name: "limit",
    defaultValue: 10,
    min: 1,
    max: 25,
  });

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const { platform, handle } = await context.params;
    const normalizedPlatform = platform.trim().toLowerCase();
    const normalizedHandle = normalizeHandle(handle);
    if (normalizedPlatform !== "instagram" || !normalizedHandle) {
      return NextResponse.json({ error: "unsupported_profile" }, { status: 400 });
    }
    const limitResult = readLimit(request);
    if (!limitResult.ok) {
      return NextResponse.json({ error: limitResult.error }, { status: 400 });
    }
    const limit = limitResult.value;
    const cacheKey = buildUserScopedRouteCacheKey(
      String(user?.uid ?? "admin"),
      `${normalizedPlatform}:${normalizedHandle}:catalog-runs-recent`,
      request.nextUrl.searchParams,
    );
    const cached = getRouteResponseCache(CATALOG_RECENT_RUNS_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }
    const stale = getStaleRouteResponseCache(CATALOG_RECENT_RUNS_CACHE_NAMESPACE, cacheKey);
    try {
      const payload = await getOrCreateRouteResponsePromise(CATALOG_RECENT_RUNS_CACHE_NAMESPACE, cacheKey, async () => {
        const upstream = await fetchAdminBackendJson(
          `/admin/social/profiles/${encodeURIComponent(normalizedPlatform)}/${encodeURIComponent(normalizedHandle)}/catalog/runs/recent`,
          {
            apiVersion: "v2",
            adminContext,
            queryString: new URLSearchParams([["limit", String(limit)]]).toString(),
            routeName: "social-account-catalog-runs-recent",
            timeoutMs: CATALOG_RECENT_RUNS_BACKEND_TIMEOUT_MS,
          },
        );
        if (upstream.status !== 200) {
          throw buildAdminBackendStatusError({
            status: upstream.status,
            data: upstream.data,
            fallbackMessage: "Failed to load social account catalog recent runs",
            routeName: "social-account-catalog-runs-recent",
          });
        }
        const nextPayload = upstream.data;
        setRouteResponseCache(
          CATALOG_RECENT_RUNS_CACHE_NAMESPACE,
          cacheKey,
          nextPayload,
          CATALOG_RECENT_RUNS_CACHE_TTL_MS,
          CATALOG_RECENT_RUNS_STALE_CACHE_TTL_MS,
        );
        return nextPayload;
      });
      return NextResponse.json(payload, { headers: { "x-trr-cache": "miss" } });
    } catch (error) {
      if (stale) {
        return NextResponse.json(stale, {
          headers: { "x-trr-cache": "stale", "x-trr-cacheable": "0" },
        });
      }
      throw error;
    }
  } catch (error) {
    return buildAdminProxyErrorResponse(error);
  }
}
