import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendJson,
  SOCIAL_PROXY_LONG_TIMEOUT_MS,
  SOCIAL_PROXY_SHORT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidPositiveIntegerString, isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

const isDegradableAnalyticsError = (error: unknown): boolean => {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const status = Number(record.status ?? record.upstreamStatus ?? 0);
  const code = String(record.code ?? record.upstreamDetailCode ?? "").toUpperCase();
  const message = error instanceof Error ? error.message.toLowerCase() : String(record.error ?? "").toLowerCase();
  return (
    status === 504 ||
    code === "UPSTREAM_TIMEOUT" ||
    code === "BACKEND_REQUEST_TIMEOUT" ||
    code === "REQUEST_TIMEOUT" ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
};

const buildDegradedAnalyticsPayload = (input: {
  showId: string;
  seasonId: string | undefined;
  seasonNumber: string;
  timezone: string;
  sourceScope: string;
}) => {
  const now = new Date().toISOString();
  const seasonNumberValue = Number.parseInt(input.seasonNumber, 10);
  return {
    degraded: true,
    degraded_reason: "backend_timeout",
    window: {
      start: now.slice(0, 10),
      end: now.slice(0, 10),
      timezone: input.timezone,
      source_scope: input.sourceScope,
    },
    summary: {
      show_id: input.showId,
      season_id: input.seasonId ?? "",
      season_number: Number.isFinite(seasonNumberValue) ? seasonNumberValue : 0,
      show_name: null,
      total_posts: 0,
      total_comments: 0,
      total_engagement: 0,
      sentiment_mix: {
        positive: 0,
        neutral: 0,
        negative: 0,
        counts: { positive: 0, neutral: 0, negative: 0 },
      },
      data_quality: {
        comments_saved_pct_overall: null,
        platform_comments_saved_pct: {},
        last_post_at: null,
        last_comment_at: null,
        data_freshness_minutes: null,
      },
    },
    weekly: [],
    weekly_platform_posts: [],
    weekly_platform_engagement: [],
    weekly_daily_activity: [],
    weekly_flags: [],
    platform_breakdown: [],
    themes: { positive: [], negative: [] },
    leaderboards: { bravo_content: [], viewer_discussion: [] },
    jobs: [],
    reddit: null,
  };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
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

    const timeoutProfile = request.nextUrl.searchParams.get("timeout_profile");
    const forwardedSearchParams = new URLSearchParams(request.nextUrl.searchParams.toString());
    forwardedSearchParams.delete("timeout_profile");
    const seasonIdHintRaw = forwardedSearchParams.get("season_id");
    if (seasonIdHintRaw && !isValidUuid(seasonIdHintRaw)) {
      return NextResponse.json(
        { error: "season_id must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    const seasonIdHint = seasonIdHintRaw ?? undefined;
    forwardedSearchParams.delete("season_id");

    try {
      const data = await fetchSeasonBackendJson(showId, seasonNumber, "/analytics", {
        queryString: forwardedSearchParams.toString(),
        seasonIdHint,
        fallbackError: "Failed to fetch social analytics",
        retries: 0,
        timeoutMs: timeoutProfile === "background" ? SOCIAL_PROXY_LONG_TIMEOUT_MS : SOCIAL_PROXY_SHORT_TIMEOUT_MS,
      });
      return NextResponse.json(data);
    } catch (error) {
      if (!isDegradableAnalyticsError(error)) {
        throw error;
      }
      console.warn("[api] Season social analytics unavailable; returning degraded empty analytics", error);
      return NextResponse.json(
        buildDegradedAnalyticsPayload({
          showId,
          seasonId: seasonIdHint,
          seasonNumber,
          timezone: forwardedSearchParams.get("timezone") ?? "America/New_York",
          sourceScope: forwardedSearchParams.get("source_scope") ?? "network",
        }),
        { headers: { "x-trr-social-analytics-source": "backend-timeout-degraded" } },
      );
    }
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social analytics");
  }
}
