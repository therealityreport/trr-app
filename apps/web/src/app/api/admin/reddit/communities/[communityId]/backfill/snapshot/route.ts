import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildAdminAuthPartition,
  buildAdminSnapshotCacheKey,
  getOrCreateAdminSnapshot,
} from "@/lib/server/admin/admin-snapshot-cache";
import {
  buildSnapshotResponse,
  buildSnapshotSubrequest,
  readRouteJsonOrThrow,
} from "@/lib/server/admin/admin-snapshot-route";

import { GET as getAdminOperation } from "@/app/api/admin/trr-api/operations/[operationId]/route";

type RouteContext = {
  params: Promise<{ communityId: string }>;
};

const SNAPSHOT_TTL_MS = 2_500;
const SNAPSHOT_STALE_MS = 2_500;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const { communityId } = await context.params;
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");
    const operationId = searchParams.get("operation_id")?.trim() ?? "";
    if (!operationId) {
      return NextResponse.json({ error: "operation_id is required" }, { status: 400 });
    }

    const snapshot = await getOrCreateAdminSnapshot({
      cacheKey: buildAdminSnapshotCacheKey({
        authPartition: buildAdminAuthPartition(user),
        pageFamily: "reddit-sources",
        scope: `${communityId}:${searchParams.get("season_id")?.trim() ?? "none"}`,
        query: searchParams,
      }),
      ttlMs: SNAPSHOT_TTL_MS,
      staleIfErrorTtlMs: SNAPSHOT_STALE_MS,
      forceRefresh,
      fetcher: async () => {
        const operation = await readRouteJsonOrThrow<Record<string, unknown>>(
          await getAdminOperation(
            buildSnapshotSubrequest(
              request,
              `/api/admin/trr-api/operations/${encodeURIComponent(operationId)}`,
            ),
            { params: Promise.resolve({ operationId }) },
          ),
          "Failed to load reddit backfill operation snapshot",
        );
        return {
          operation,
        };
      },
    });

    return buildSnapshotResponse({
      data: snapshot.data,
      cacheStatus: snapshot.meta.cacheStatus,
      generatedAt: snapshot.meta.generatedAt,
      cacheAgeMs: snapshot.meta.cacheAgeMs,
      stale: snapshot.meta.stale,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch reddit backfill snapshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
