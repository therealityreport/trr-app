import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidPositiveIntegerString, isValidUuid } from "@/lib/server/validation/identifiers";
import {
  buildUserScopedRouteCacheKey,
  getRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const SOCIAL_RUNS_SUMMARY_CACHE_NAMESPACE = "admin-social-runs-summary";
const SOCIAL_RUNS_SUMMARY_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_RUNS_SUMMARY_CACHE_TTL_MS,
);

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { showId, seasonNumber } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required", code: "BAD_REQUEST", retryable: false }, { status: 400 });
    }
    if (!isValidUuid(showId)) {
      return NextResponse.json(
        { error: "showId must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    if (!isValidPositiveIntegerString(seasonNumber)) {
      return NextResponse.json(
        { error: "seasonNumber must be a valid positive integer", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    const forwardedSearchParams = new URLSearchParams(request.nextUrl.searchParams.toString());
    const seasonIdHintRaw = forwardedSearchParams.get("season_id");
    if (seasonIdHintRaw && !isValidUuid(seasonIdHintRaw)) {
      return NextResponse.json(
        { error: "season_id must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    const seasonIdHint = seasonIdHintRaw ?? undefined;
    forwardedSearchParams.delete("season_id");
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `${showId}:${seasonNumber}:runs-summary`,
      forwardedSearchParams,
    );
    const cachedData = getRouteResponseCache<unknown>(
      SOCIAL_RUNS_SUMMARY_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedData) {
      return NextResponse.json(cachedData, { headers: { "x-trr-cache": "hit" } });
    }

    const data = await fetchSeasonBackendJson(showId, seasonNumber, "/ingest/runs/summary", {
      queryString: forwardedSearchParams.toString(),
      seasonIdHint,
      fallbackError: "Failed to fetch social run summaries",
      retries: 0,
      timeoutMs: 15_000,
    });
    setRouteResponseCache(
      SOCIAL_RUNS_SUMMARY_CACHE_NAMESPACE,
      cacheKey,
      data,
      SOCIAL_RUNS_SUMMARY_CACHE_TTL_MS,
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social run summaries");
  }
}
