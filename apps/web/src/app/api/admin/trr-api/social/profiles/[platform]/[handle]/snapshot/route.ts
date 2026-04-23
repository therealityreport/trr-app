import { NextRequest } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
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

import { GET as getCatalogRunProgress } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/progress/route";
import { GET as getSummary } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/summary/route";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

const LIVE_TTL_MS = 2_500;
const LIVE_STALE_MS = 2_500;

export const dynamic = "force-dynamic";

const ACTIVE_CATALOG_RUN_STATUSES = new Set(["queued", "pending", "running", "retrying", "cancelling", "attached"]);

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const { platform, handle } = await context.params;
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    const summarySearchParams = new URLSearchParams();
    const requestedDetail = (searchParams.get("detail") ?? "").trim();
    if (requestedDetail) {
      summarySearchParams.set("detail", requestedDetail);
    }
    searchParams.delete("refresh");

    const snapshot = await getOrCreateAdminSnapshot({
      cacheKey: buildAdminSnapshotCacheKey({
        authPartition: buildAdminAuthPartition(user),
        pageFamily: "social-profile",
        scope: `${platform}:${handle}`,
        query: searchParams,
      }),
      ttlMs: LIVE_TTL_MS,
      staleIfErrorTtlMs: LIVE_STALE_MS,
      forceRefresh,
      fetcher: async () => {
        const summary = await readRouteJsonOrThrow<Record<string, unknown>>(
          await getSummary(
              buildSnapshotSubrequest(
                request,
                `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/summary`,
                summarySearchParams,
                adminContext,
              ),
              context,
            ),
          "Failed to load social account profile snapshot",
        );

        const explicitRunId = searchParams.get("run_id")?.trim() ?? "";
        const recentRuns = Array.isArray(summary.catalog_recent_runs)
          ? (summary.catalog_recent_runs as Array<Record<string, unknown>>)
          : [];
        const inferredRunId =
          recentRuns.find((run) =>
            ACTIVE_CATALOG_RUN_STATUSES.has(String(run.status ?? "").trim().toLowerCase()),
          )?.run_id ?? null;
        const explicitRunStatus =
          recentRuns.find((run) => String(run.run_id ?? "").trim() === explicitRunId)?.status ?? null;
        const shouldLoadExplicitRunProgress =
          explicitRunId.length > 0 &&
          Boolean(explicitRunStatus) &&
          ACTIVE_CATALOG_RUN_STATUSES.has(String(explicitRunStatus).trim().toLowerCase());
        const progressRunId =
          explicitRunId.length > 0
            ? shouldLoadExplicitRunProgress
              ? explicitRunId
              : ""
            : typeof inferredRunId === "string" && inferredRunId.trim().length > 0
            ? inferredRunId.trim()
            : "";

        const catalogRunProgress = progressRunId
          ? await readRouteJsonOrThrow<Record<string, unknown>>(
              await getCatalogRunProgress(
                  buildSnapshotSubrequest(
                    request,
                    `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(progressRunId)}/progress`,
                    new URLSearchParams({
                      recent_log_limit: searchParams.get("recent_log_limit") ?? "25",
                    }),
                    adminContext,
                  ),
                { params: Promise.resolve({ platform, handle, runId: progressRunId }) },
              ),
              "Failed to load social account catalog progress snapshot",
            )
          : null;

        return {
          summary,
          catalog_run_progress: catalogRunProgress,
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
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account profile snapshot");
  }
}
