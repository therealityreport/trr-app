import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidPositiveIntegerString, isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, seasonNumber } = await params;
    const seasonIdHint = request.nextUrl.searchParams.get("season_id") ?? undefined;
    if (!isValidUuid(showId) || !isValidPositiveIntegerString(seasonNumber) ||
        (seasonIdHint !== undefined && !isValidUuid(seasonIdHint))) {
      return NextResponse.json(
        { error: "Valid showId, seasonNumber and season_id are required", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    const query = new URLSearchParams();
    for (const key of ["source_scope", "timezone"]) {
      const value = request.nextUrl.searchParams.get(key);
      if (value) query.set(key, value);
    }
    const data = await fetchSeasonBackendJson(showId, seasonNumber, "/analytics/periods", {
      seasonIdHint,
      queryString: query.toString(),
      fallbackError: "Failed to load season period dates",
      retries: 0,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to load season period dates");
  }
}
