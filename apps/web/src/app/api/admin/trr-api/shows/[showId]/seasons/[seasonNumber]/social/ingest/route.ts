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

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const seasonIdHintRaw = request.nextUrl.searchParams.get("season_id");
    if (seasonIdHintRaw && !isValidUuid(seasonIdHintRaw)) {
      return NextResponse.json(
        { error: "season_id must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    const seasonIdHint = seasonIdHintRaw ?? undefined;
    const tabSessionId = request.headers.get("x-trr-tab-session-id")?.trim() || "";
    const flowKey = request.headers.get("x-trr-flow-key")?.trim() || "";
    const requestText = await request.text();
    let outboundBody = requestText;
    if ((request.headers.get("content-type") || "").includes("application/json")) {
      try {
        const parsed = JSON.parse(requestText || "{}") as Record<string, unknown>;
        if (tabSessionId && typeof parsed.client_session_id !== "string") {
          parsed.client_session_id = tabSessionId;
        }
        if (flowKey && typeof parsed.client_workflow_id !== "string") {
          parsed.client_workflow_id = flowKey;
        }
        outboundBody = JSON.stringify(parsed);
      } catch {
        outboundBody = requestText;
      }
    }

    const data = await fetchSeasonBackendJson(showId, seasonNumber, "/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tabSessionId ? { "x-trr-tab-session-id": tabSessionId } : {}),
        ...(flowKey ? { "x-trr-flow-key": flowKey } : {}),
      },
      body: outboundBody,
      seasonIdHint,
      fallbackError: "Failed to run social ingest",
      retries: 0,
      timeoutMs: 210_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to run social ingest");
  }
}
