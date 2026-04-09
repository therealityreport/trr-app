import { NextRequest } from "next/server";
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
import { socialProxyErrorResponse } from "@/lib/server/trr-api/social-admin-proxy";

import { GET as getWorkerHealth } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/worker-health/route";
import { GET as getSyncSession } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/route";
import { GET as getWeekLiveHealth } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/live-health/route";
import { GET as getRunProgress } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/progress/route";

type RouteParams = {
  params: Promise<{ showId: string; seasonNumber: string; weekIndex: string }>;
};

const LIVE_TTL_MS = 2_500;
const LIVE_STALE_MS = 2_500;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { showId, seasonNumber, weekIndex } = await context.params;
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");

    const snapshot = await getOrCreateAdminSnapshot({
      cacheKey: buildAdminSnapshotCacheKey({
        authPartition: buildAdminAuthPartition(user),
        pageFamily: "week-social",
        scope: `${showId}:${seasonNumber}:${weekIndex}`,
        query: searchParams,
      }),
      ttlMs: LIVE_TTL_MS,
      staleIfErrorTtlMs: LIVE_STALE_MS,
      forceRefresh,
      fetcher: async () => {
        const runId = searchParams.get("run_id")?.trim() ?? "";
        const syncSessionId = searchParams.get("sync_session_id")?.trim() ?? "";

        const [workerHealth, weekLiveHealth, runProgress, syncSession] = await Promise.all([
          readRouteJsonOrThrow<Record<string, unknown>>(
            await getWorkerHealth(
              buildSnapshotSubrequest(
                request,
                `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/ingest/worker-health`,
              ),
              { params: Promise.resolve({ showId, seasonNumber }) },
            ),
            "Failed to load sync worker health snapshot",
          ),
          readRouteJsonOrThrow<Record<string, unknown>>(
            await getWeekLiveHealth(
              buildSnapshotSubrequest(
                request,
                `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/week/${weekIndex}/live-health`,
                searchParams,
              ),
              context,
            ),
            "Failed to load week live health snapshot",
          ),
          runId
            ? readRouteJsonOrThrow<Record<string, unknown>>(
                await getRunProgress(
                  buildSnapshotSubrequest(
                    request,
                    `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/runs/${runId}/progress`,
                    new URLSearchParams({
                      recent_log_limit: searchParams.get("recent_log_limit") ?? "40",
                      ...(searchParams.get("season_id") ? { season_id: searchParams.get("season_id") as string } : {}),
                    }),
                  ),
                  { params: Promise.resolve({ showId, seasonNumber, runId }) },
                ),
                "Failed to load sync run progress snapshot",
              )
            : Promise.resolve(null),
          syncSessionId
            ? readRouteJsonOrThrow<Record<string, unknown>>(
                await getSyncSession(
                  buildSnapshotSubrequest(
                    request,
                    `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions/${syncSessionId}`,
                    searchParams.get("season_id")
                      ? new URLSearchParams({ season_id: searchParams.get("season_id") as string })
                      : undefined,
                  ),
                  { params: Promise.resolve({ showId, seasonNumber, syncSessionId }) },
                ),
                "Failed to load sync session snapshot",
              )
            : Promise.resolve(null),
        ]);

        return {
          worker_health: workerHealth,
          week_live_health: weekLiveHealth,
          run_progress: runProgress,
          sync_session: syncSession,
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
    return socialProxyErrorResponse(error, "[api] Failed to fetch social week snapshot");
  }
}
