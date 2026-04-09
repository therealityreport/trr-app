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

import { GET as getAnalytics } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route";
import { GET as getJobs } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route";
import { GET as getRuns } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route";
import { GET as getRunSummaries } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary/route";
import { GET as getSharedStatus } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/shared-status/route";
import { GET as getTargets } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route";
import { GET as getWorkerHealth } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/worker-health/route";

type RouteParams = {
  params: Promise<{ showId: string; seasonNumber: string }>;
};

const LIVE_TTL_MS = 2_500;
const LIVE_STALE_MS = 2_500;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { showId, seasonNumber } = await context.params;
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");

    const snapshot = await getOrCreateAdminSnapshot({
      cacheKey: buildAdminSnapshotCacheKey({
        authPartition: buildAdminAuthPartition(user),
        pageFamily: "season-social-analytics",
        scope: `${showId}:${seasonNumber}`,
        query: searchParams,
      }),
      ttlMs: LIVE_TTL_MS,
      staleIfErrorTtlMs: LIVE_STALE_MS,
      forceRefresh,
      fetcher: async () => {
        const analyticsParams = new URLSearchParams(searchParams);
        analyticsParams.delete("run_id");
        analyticsParams.delete("runs_limit");
        analyticsParams.delete("jobs_limit");

        const runsParams = new URLSearchParams(searchParams);
        runsParams.set("limit", searchParams.get("runs_limit") ?? "100");
        runsParams.delete("runs_limit");
        runsParams.delete("jobs_limit");

        const runSummaryParams = new URLSearchParams(searchParams);
        runSummaryParams.set("limit", searchParams.get("run_summaries_limit") ?? "20");
        runSummaryParams.delete("run_summaries_limit");
        runSummaryParams.delete("jobs_limit");
        runSummaryParams.delete("run_id");

        const jobsRunId = searchParams.get("run_id")?.trim() ?? "";
        const jobsParams = new URLSearchParams(searchParams);
        jobsParams.set("limit", searchParams.get("jobs_limit") ?? "100");
        jobsParams.delete("jobs_limit");
        jobsParams.delete("runs_limit");

        const [analytics, targets, runs, runSummaries, workerHealth, sharedStatus, jobs] = await Promise.all([
          readRouteJsonOrThrow<Record<string, unknown>>(
            await getAnalytics(
              buildSnapshotSubrequest(
                request,
                `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics`,
                analyticsParams,
              ),
              context,
            ),
            "Failed to load social analytics snapshot",
          ),
          readRouteJsonOrThrow<Record<string, unknown>>(
            await getTargets(
              buildSnapshotSubrequest(
                request,
                `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/targets`,
                searchParams,
              ),
              context,
            ),
            "Failed to load social targets snapshot",
          ),
          readRouteJsonOrThrow<Record<string, unknown>>(
            await getRuns(
              buildSnapshotSubrequest(
                request,
                `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/runs`,
                runsParams,
              ),
              context,
            ),
            "Failed to load social runs snapshot",
          ),
          readRouteJsonOrThrow<Record<string, unknown>>(
            await getRunSummaries(
              buildSnapshotSubrequest(
                request,
                `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/runs/summary`,
                runSummaryParams,
              ),
              context,
            ),
            "Failed to load social run summary snapshot",
          ),
          readRouteJsonOrThrow<Record<string, unknown>>(
            await getWorkerHealth(
              buildSnapshotSubrequest(
                request,
                `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/ingest/worker-health`,
              ),
              context,
            ),
            "Failed to load social worker health snapshot",
          ),
          readRouteJsonOrThrow<Record<string, unknown>>(
            await getSharedStatus(
              buildSnapshotSubrequest(
                request,
                `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/shared-status`,
                searchParams,
              ),
              context,
            ),
            "Failed to load shared social status snapshot",
          ),
          jobsRunId
            ? readRouteJsonOrThrow<Record<string, unknown>>(
                await getJobs(
                  buildSnapshotSubrequest(
                    request,
                    `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/jobs`,
                    jobsParams,
                  ),
                  context,
                ),
                "Failed to load social jobs snapshot",
              )
            : Promise.resolve({ jobs: [] }),
        ]);

        return {
          analytics,
          targets: Array.isArray(targets.targets) ? targets.targets : [],
          runs: Array.isArray(runs.runs) ? runs.runs : [],
          run_summaries: Array.isArray(runSummaries.summaries) ? runSummaries.summaries : [],
          worker_health: workerHealth,
          shared_status: sharedStatus,
          jobs: Array.isArray(jobs.jobs) ? jobs.jobs : [],
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
    return socialProxyErrorResponse(error, "[api] Failed to fetch season social analytics snapshot");
  }
}
