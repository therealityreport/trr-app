import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildAdminAuthPartition,
  buildAdminSnapshotCacheKey,
  getOrCreateAdminSnapshot,
} from "@/lib/server/admin/admin-snapshot-cache";
import { buildSnapshotResponse } from "@/lib/server/admin/admin-snapshot-route";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";
const LIVE_STATUS_SNAPSHOT_TTL_MS = 5_000;
const LIVE_STATUS_SNAPSHOT_STALE_MS = 5_000;

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");

    const snapshot = await getOrCreateAdminSnapshot({
      cacheKey: buildAdminSnapshotCacheKey({
        authPartition: buildAdminAuthPartition(user),
        pageFamily: "system-health",
        scope: "social-live-status",
        query: searchParams,
      }),
      ttlMs: LIVE_STATUS_SNAPSHOT_TTL_MS,
      staleIfErrorTtlMs: LIVE_STATUS_SNAPSHOT_STALE_MS,
      forceRefresh,
      fetcher: async () =>
        await fetchSocialBackendJson("/socials/live-status", {
          fallbackError: "Failed to fetch social live status",
          retries: 0,
          timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
        }),
    });
    return buildSnapshotResponse({
      data: snapshot.data,
      cacheStatus: snapshot.meta.cacheStatus,
      generatedAt: snapshot.meta.generatedAt,
      cacheAgeMs: snapshot.meta.cacheAgeMs,
      stale: snapshot.meta.stale,
    });
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social live status");
  }
}
