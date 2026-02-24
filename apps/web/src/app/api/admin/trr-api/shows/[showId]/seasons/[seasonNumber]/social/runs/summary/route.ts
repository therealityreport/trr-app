import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendJson,
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
    const seasonIdHint = seasonIdHintRaw && isValidUuid(seasonIdHintRaw) ? seasonIdHintRaw : undefined;
    forwardedSearchParams.delete("season_id");

    const data = await fetchSeasonBackendJson(showId, seasonNumber, "/ingest/runs/summary", {
      queryString: forwardedSearchParams.toString(),
      seasonIdHint,
      fallbackError: "Failed to fetch social run summaries",
      retries: 0,
      timeoutMs: 20_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social run summaries");
  }
}
