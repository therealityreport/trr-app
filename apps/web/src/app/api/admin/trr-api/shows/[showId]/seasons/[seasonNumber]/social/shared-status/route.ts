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
    if (!isValidUuid(showId) || !isValidPositiveIntegerString(seasonNumber)) {
      return NextResponse.json({ error: "Invalid show or season identifier", code: "BAD_REQUEST", retryable: false }, { status: 400 });
    }
    const seasonIdHintRaw = request.nextUrl.searchParams.get("season_id");
    const seasonIdHint = seasonIdHintRaw ?? undefined;
    const queryString = request.nextUrl.searchParams.toString();
    const data = await fetchSeasonBackendJson(showId, seasonNumber, "/shared-status", {
      queryString,
      seasonIdHint,
      fallbackError: "Failed to fetch shared season social status",
      retries: 0,
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch shared season social status");
  }
}
