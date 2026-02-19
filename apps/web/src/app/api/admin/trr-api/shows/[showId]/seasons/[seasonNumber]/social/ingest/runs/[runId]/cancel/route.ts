import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidPositiveIntegerString, isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string; runId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, seasonNumber, runId } = await params;
    if (!showId || !runId) {
      return NextResponse.json(
        { error: "showId and runId are required", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
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
    if (!isValidUuid(runId)) {
      return NextResponse.json(
        { error: "runId must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    const data = await fetchSeasonBackendJson(showId, seasonNumber, `/ingest/runs/${runId}/cancel`, {
      method: "POST",
      fallbackError: "Failed to cancel ingest run",
      retries: 1,
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to cancel social ingest run");
  }
}
