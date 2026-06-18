import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildAdminAuthPartition,
  buildAdminSnapshotCacheKey,
  getOrCreateAdminSnapshot,
} from "@/lib/server/admin/admin-snapshot-cache";
import { attachAdminRouteTiming } from "@/lib/server/admin/admin-route-timing";
import { buildAdminReadResponseHeaders } from "@/lib/server/trr-api/admin-read-proxy";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

const CATALOG_POSTS_TTL_MS = 5 * 60_000;
const CATALOG_POSTS_STALE_MS = 15 * 60_000;

export async function GET(request: NextRequest, context: RouteContext) {
  const routeStartedAt = performance.now();
  try {
    const user = await requireAdmin(request);
    const { platform, handle } = await context.params;
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");
    const queryString = searchParams.toString();
    const snapshot = await getOrCreateAdminSnapshot({
      cacheKey: buildAdminSnapshotCacheKey({
        authPartition: buildAdminAuthPartition(user),
        pageFamily: "social-profile",
        scope: `${platform}:${handle}:catalog-posts`,
        query: searchParams,
      }),
      ttlMs: CATALOG_POSTS_TTL_MS,
      staleIfErrorTtlMs: CATALOG_POSTS_STALE_MS,
      forceRefresh,
      fetcher: () =>
        fetchSocialBackendJson(
          `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/posts`,
          {
            queryString,
            fallbackError: "Failed to fetch social account catalog posts",
            retries: 0,
            timeoutMs: 30_000,
          },
        ),
    });
    return attachAdminRouteTiming(
      NextResponse.json(snapshot.data, {
        headers: buildAdminReadResponseHeaders({ cacheStatus: snapshot.meta.cacheStatus }),
      }),
      {
        routeFamily: "admin-social-profile",
        routeName: "GET catalog/posts",
        cacheStatus: snapshot.meta.cacheStatus,
        startedAt: routeStartedAt,
      },
    );
  } catch (error) {
    return attachAdminRouteTiming(
      socialProxyErrorResponse(error, "[api] Failed to fetch social account catalog posts"),
      {
        routeFamily: "admin-social-profile",
        routeName: "GET catalog/posts",
        cacheStatus: "error",
        startedAt: routeStartedAt,
      },
    );
  }
}
