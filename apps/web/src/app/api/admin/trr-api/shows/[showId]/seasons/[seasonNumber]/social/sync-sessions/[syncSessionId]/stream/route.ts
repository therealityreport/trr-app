import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendResponse,
  SOCIAL_PROXY_LONG_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidPositiveIntegerString, isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string; syncSessionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const response = await fetchSeasonBackendResponse(
      showId,
      seasonNumber,
      `/sync-sessions/${syncSessionId}/stream`,
      {
        queryString: forwardedSearchParams.toString(),
        seasonIdHint,
        fallbackError: "Failed to stream social sync session",
        retries: 0,
        timeoutMs: SOCIAL_PROXY_LONG_TIMEOUT_MS,
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-store",
        },
      },
    );

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Connection: "keep-alive",
        "Content-Type": response.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to stream social sync session");
  }
}
