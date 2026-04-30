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

const COLLABORATORS_TAGS_TTL_MS = 5 * 60_000;
const COLLABORATORS_TAGS_STALE_MS = 15 * 60_000;

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const { platform, handle } = await context.params;
    const forceRefresh = (request.nextUrl.searchParams.get("refresh") ?? "").trim().length > 0;
    const snapshot = await getOrCreateAdminSnapshot({
      cacheKey: buildAdminSnapshotCacheKey({
        authPartition: buildAdminAuthPartition(user),
        pageFamily: "social-profile",
        scope: `${platform}:${handle}:collaborators-tags`,
      }),
      ttlMs: COLLABORATORS_TAGS_TTL_MS,
      staleIfErrorTtlMs: COLLABORATORS_TAGS_STALE_MS,
      forceRefresh,
      fetcher: () =>
        fetchSocialBackendJson(`/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/collaborators-tags`, {
          fallbackError: "Failed to fetch social account profile collaborators and tags",
          retries: 0,
          timeoutMs: 30_000,
        }),
    });
    return NextResponse.json(snapshot.data, {
      headers: buildAdminReadResponseHeaders({ cacheStatus: snapshot.meta.cacheStatus }),
    });
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account profile collaborators and tags");
  }
}
