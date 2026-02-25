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

const isValidIsoDateTime = (value: string): boolean => {
  if (!value.includes("T")) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
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

    for (const key of ["date_start", "date_end"] as const) {
      const value = forwardedSearchParams.get(key);
      if (value && !isValidIsoDateTime(value)) {
        return NextResponse.json(
          { error: `${key} must be a valid ISO datetime`, code: "BAD_REQUEST", retryable: false },
          { status: 400 },
        );
      }
    }

    const data = await fetchSeasonBackendJson(showId, seasonNumber, "/analytics/mirror-coverage", {
      queryString: forwardedSearchParams.toString(),
      seasonIdHint,
      fallbackError: "Failed to fetch mirror coverage",
      retries: 0,
      timeoutMs: 20_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch mirror coverage");
  }
}
