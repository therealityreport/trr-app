import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildAdminAuthPartition,
  buildAdminSnapshotCacheKey,
  getOrCreateAdminSnapshot,
} from "@/lib/server/admin/admin-snapshot-cache";
import { buildAdminReadResponseHeaders } from "@/lib/server/trr-api/admin-read-proxy";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

const HASHTAGS_TTL_MS = 5 * 60_000;
const HASHTAGS_STALE_MS = 5 * 60_000;

export async function GET(request: NextRequest, context: RouteContext) {
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
        scope: `${platform}:${handle}:hashtags`,
        query: searchParams,
      }),
      ttlMs: HASHTAGS_TTL_MS,
      staleIfErrorTtlMs: HASHTAGS_STALE_MS,
      forceRefresh,
      fetcher: () =>
        fetchSocialBackendJson(`/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags`, {
          queryString,
          fallbackError: "Failed to fetch social account profile hashtags",
          retries: 0,
          timeoutMs: 30_000,
        }),
    });
    return NextResponse.json(snapshot.data, {
      headers: buildAdminReadResponseHeaders({ cacheStatus: snapshot.meta.cacheStatus }),
    });
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account profile hashtags");
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { platform, handle } = await context.params;
    const body = await request.text();
    const data = await fetchSocialBackendJson(`/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
      fallbackError: "Failed to update social account profile hashtags",
      retries: 0,
      timeoutMs: 45_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to update social account profile hashtags");
  }
}
