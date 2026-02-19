import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendJson,
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

    const data = await fetchSeasonBackendJson(
      showId,
      seasonNumber,
      `/analytics/week/${weekIndex}`,
      {
        queryString: request.nextUrl.searchParams.toString(),
        fallbackError: "Failed to fetch week detail",
        retries: 2,
        timeoutMs: 20_000,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch week detail");
  }
}
