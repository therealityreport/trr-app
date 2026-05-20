import { NextRequest } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  buildAdminAuthPartition,
  buildAdminSnapshotCacheKey,
  getOrCreateAdminSnapshot,
} from "@/lib/server/admin/admin-snapshot-cache";
import { buildSnapshotResponse } from "@/lib/server/admin/admin-snapshot-route";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_LONG_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

const LIVE_TTL_MS = 5 * 60_000;
const LIVE_STALE_MS = 15 * 60_000;
const RUN_PROGRESS_TTL_MS = 3_000;
const RUN_PROGRESS_STALE_MS = 30_000;
const DIRECT_PROGRESS_TIMEOUT_MS = 12_000;
const ACTIVE_PROFILE_WORK_STATUSES = new Set(["queued", "pending", "retrying", "running", "cancelling"]);

export const dynamic = "force-dynamic";

type SocialProfileSnapshotPayload = {
  summary: Record<string, unknown> | null;
  catalog_run_progress: Record<string, unknown> | null;
  dashboard_freshness: Record<string, unknown> | null;
  operational_alerts: unknown[];
  summary_omitted_reason?: "progress_only" | null;
};

const readNestedRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const activeCatalogRunId = (summary: Record<string, unknown> | null): string | null => {
  const runs = Array.isArray(summary?.catalog_recent_runs) ? summary.catalog_recent_runs : [];
  for (const row of runs) {
    const run = readNestedRecord(row);
    const status = String(run?.status ?? run?.run_status ?? "").trim().toLowerCase();
    const runId = String(run?.run_id ?? run?.id ?? "").trim();
    if (runId && ACTIVE_PROFILE_WORK_STATUSES.has(status)) {
      return runId;
    }
  }
  return null;
};

const hasActiveCommentsCoverage = (summary: Record<string, unknown> | null): boolean => {
  const coverage = readNestedRecord(summary?.comments_coverage);
  if (!coverage) return false;
  const activeRunId = String(coverage.active_run_id ?? "").trim();
  if (activeRunId) return true;
  const status = String(
    coverage.effective_status ?? coverage.last_attempt_status ?? coverage.last_comments_run_status ?? "",
  )
    .trim()
    .toLowerCase();
  return ACTIVE_PROFILE_WORK_STATUSES.has(status);
};

const hasActiveCatalogWork = (summary: Record<string, unknown> | null): boolean => {
  return activeCatalogRunId(summary) !== null;
};

const hasActiveProfileWork = (snapshot: SocialProfileSnapshotPayload): boolean =>
  hasActiveCommentsCoverage(snapshot.summary) || hasActiveCatalogWork(snapshot.summary);

const buildDegradedProgressPayload = (runId: string, reason: string): Record<string, unknown> => ({
  run_id: runId,
  run_status: "unknown",
  run_state: "degraded",
  status: "unknown",
  stages: {},
  summary: {},
  recent_log: [],
  progress_degraded: true,
  progress_degraded_reason: reason,
  progress_degraded_at: new Date().toISOString(),
  progress_authoritative: false,
});

const fetchDirectCatalogProgress = async ({
  adminContext,
  platform,
  handle,
  runId,
  recentLogLimit,
}: {
  adminContext: ReturnType<typeof toVerifiedAdminContext>;
  platform: string;
  handle: string;
  runId: string;
  recentLogLimit: string;
}): Promise<{ progress: Record<string, unknown>; source: string }> => {
  const progressParams = new URLSearchParams();
  progressParams.set("fast", "1");
  progressParams.set("recent_log_limit", recentLogLimit || "25");
  try {
    const progress = (await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(runId)}/progress`,
      {
        adminContext,
        fallbackError: "Failed to fetch social account catalog run progress",
        queryString: progressParams.toString(),
        retries: 0,
        timeoutMs: DIRECT_PROGRESS_TIMEOUT_MS,
      },
    )) as Record<string, unknown>;
    return { progress, source: "direct-progress" };
  } catch {
    return {
      progress: buildDegradedProgressPayload(runId, "direct_progress_timeout"),
      source: "direct-progress-degraded",
    };
  }
};

const logSocialProfileDashboardBudget = (input: {
  platform: string;
  handle: string;
  cacheStatus: string;
  freshnessStatus: string;
  initialRequestCount: number;
  stale: boolean;
  cacheAgeMs: number;
  staleCacheHit: boolean;
}) => {
  console.info("social_profile_dashboard_budget", input);
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const { platform, handle } = await context.params;
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    const backendParams = new URLSearchParams();
    const requestedDetail = (searchParams.get("detail") ?? "").trim();
    backendParams.set("detail", requestedDetail === "full" ? "full" : "lite");
    const runId = (searchParams.get("run_id") ?? "").trim();
    if (runId) {
      backendParams.set("run_id", runId);
    }
    const ttlMs = runId ? RUN_PROGRESS_TTL_MS : LIVE_TTL_MS;
    const staleIfErrorTtlMs = runId ? RUN_PROGRESS_STALE_MS : LIVE_STALE_MS;
    const recentLogLimit = (searchParams.get("recent_log_limit") ?? "").trim();
    if (recentLogLimit) {
      backendParams.set("recent_log_limit", recentLogLimit);
    }
    searchParams.delete("refresh");

    if (runId) {
      const { progress, source } = await fetchDirectCatalogProgress({
        adminContext,
        platform,
        handle,
        runId,
        recentLogLimit,
      });
      const generatedAt = new Date().toISOString();
      const responseData: SocialProfileSnapshotPayload = {
        summary: null,
        catalog_run_progress: progress,
        dashboard_freshness: {
          status: "degraded",
          source,
          generated_at: generatedAt,
          age_seconds: 0,
        },
        operational_alerts: [],
        summary_omitted_reason: "progress_only",
      };
      const response = buildSnapshotResponse({
        data: responseData,
        cacheStatus: "miss",
        generatedAt,
        cacheAgeMs: 0,
        stale: false,
      });
      response.headers.set("x-trr-dashboard-freshness", "degraded");
      response.headers.set("x-trr-dashboard-source", source);
      return response;
    }

    const cacheKey = buildAdminSnapshotCacheKey({
      authPartition: buildAdminAuthPartition(user),
      pageFamily: "social-profile",
      scope: `${platform}:${handle}`,
      query: searchParams,
    });
    const fetchProfileDashboardSnapshot = async () => {
      const summary = (await fetchSocialBackendJson(
        `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/summary`,
        {
          adminContext,
          fallbackError: "Failed to fetch social account profile summary",
          queryString: backendParams.toString(),
          retries: 0,
          timeoutMs: SOCIAL_PROXY_LONG_TIMEOUT_MS,
        },
      )) as Record<string, unknown>;
      let progress: Record<string, unknown> | null = null;
      let source = "summary";
      const activeRunId = activeCatalogRunId(summary);
      if (activeRunId) {
        const progressResult = await fetchDirectCatalogProgress({
          adminContext,
          platform,
          handle,
          runId: activeRunId,
          recentLogLimit,
        });
        progress = progressResult.progress;
        source = progressResult.source;
      }
      return {
        summary,
        catalog_run_progress: progress,
        dashboard_freshness: {
          status: source === "direct-progress-degraded" ? "degraded" : "fresh",
          source,
          generated_at: new Date().toISOString(),
          age_seconds: 0,
        },
        operational_alerts: Array.isArray(summary.operational_alerts) ? summary.operational_alerts : [],
      } satisfies SocialProfileSnapshotPayload;
    };

    let snapshot = await getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs,
      staleIfErrorTtlMs,
      forceRefresh,
      fetcher: fetchProfileDashboardSnapshot,
    });
    if (!forceRefresh && snapshot.meta.cacheStatus === "hit" && hasActiveProfileWork(snapshot.data)) {
      snapshot = await getOrCreateAdminSnapshot({
        cacheKey,
        ttlMs,
        staleIfErrorTtlMs,
        forceRefresh: true,
        fetcher: fetchProfileDashboardSnapshot,
      });
    }

    const dashboardFreshness: Record<string, unknown> =
      snapshot.data.dashboard_freshness && typeof snapshot.data.dashboard_freshness === "object"
        ? (snapshot.data.dashboard_freshness as Record<string, unknown>)
        : {};
    const responseData = {
      ...snapshot.data,
      dashboard_freshness: {
        ...dashboardFreshness,
        status: snapshot.meta.stale ? "stale" : String(dashboardFreshness.status ?? "fresh"),
        source: snapshot.meta.stale ? "cache" : String(dashboardFreshness.source ?? "live"),
        generated_at: snapshot.meta.generatedAt,
        age_seconds: Math.round(snapshot.meta.cacheAgeMs / 1000),
      },
    };
    const freshnessStatus = String(responseData.dashboard_freshness.status);
    const freshnessSource = String(responseData.dashboard_freshness.source);

    logSocialProfileDashboardBudget({
      platform,
      handle,
      cacheStatus: snapshot.meta.cacheStatus,
      freshnessStatus,
      initialRequestCount: 1,
      stale: snapshot.meta.stale,
      cacheAgeMs: snapshot.meta.cacheAgeMs,
      staleCacheHit: snapshot.meta.stale && snapshot.meta.cacheStatus === "hit",
    });

    const response = buildSnapshotResponse({
      data: responseData,
      cacheStatus: snapshot.meta.cacheStatus,
      generatedAt: snapshot.meta.generatedAt,
      cacheAgeMs: snapshot.meta.cacheAgeMs,
      stale: snapshot.meta.stale,
    });
    response.headers.set("x-trr-dashboard-freshness", freshnessStatus);
    response.headers.set("x-trr-dashboard-source", freshnessSource);
    return response;
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account profile snapshot");
  }
}
