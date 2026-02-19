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

    const data = await fetchSeasonBackendJson(showId, seasonNumber, "/analytics", {
      queryString: request.nextUrl.searchParams.toString(),
      fallbackError: "Failed to fetch social analytics",
      retries: 2,
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social analytics");
  }
}
