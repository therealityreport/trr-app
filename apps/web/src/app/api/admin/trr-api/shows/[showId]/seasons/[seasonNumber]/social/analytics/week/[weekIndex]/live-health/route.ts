import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendJson,
  SOCIAL_PROXY_SHORT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import {
  isValidNonNegativeIntegerString,
  isValidPositiveIntegerString,
  isValidUuid,
} from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string; weekIndex: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, seasonNumber, weekIndex } = await params;
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
    if (!isValidNonNegativeIntegerString(weekIndex)) {
      return NextResponse.json(
        { error: "weekIndex must be a valid non-negative integer", code: "BAD_REQUEST", retryable: false },
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

    const data = await fetchSeasonBackendJson(showId, seasonNumber, `/analytics/week/${weekIndex}/live-health`, {
      queryString: forwardedSearchParams.toString(),
      seasonIdHint,
      fallbackError: "Failed to fetch week live health",
      retries: 0,
      timeoutMs: SOCIAL_PROXY_SHORT_TIMEOUT_MS,
    });
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch week live health");
  }
}
