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
  params: Promise<{ showId: string; seasonNumber: string; syncSessionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, seasonNumber, syncSessionId } = await params;
    if (!showId || !isValidUuid(showId)) {
      return NextResponse.json({ error: "showId must be a valid UUID", code: "BAD_REQUEST", retryable: false }, { status: 400 });
    }
    if (!isValidPositiveIntegerString(seasonNumber)) {
      return NextResponse.json(
        { error: "seasonNumber must be a valid positive integer", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    if (!isValidUuid(syncSessionId)) {
      return NextResponse.json(
        { error: "syncSessionId must be a valid UUID", code: "BAD_REQUEST", retryable: false },
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
    const data = await fetchSeasonBackendJson(showId, seasonNumber, `/sync-sessions/${syncSessionId}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
      queryString: forwardedSearchParams.toString(),
      seasonIdHint,
      headers: {
        "content-type": "application/json",
      },
      fallbackError: "Failed to cancel social sync session",
      retries: 1,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to cancel social sync session");
  }
}
