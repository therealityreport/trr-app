import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendResponse,
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

    const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "csv";
    const seasonPath = format === "pdf" ? "/analytics/export.pdf" : "/analytics/export.csv";

    const proxyParams = new URLSearchParams(request.nextUrl.searchParams);
    proxyParams.delete("format");
    const seasonIdHintRaw = proxyParams.get("season_id");
    if (seasonIdHintRaw && !isValidUuid(seasonIdHintRaw)) {
      return NextResponse.json(
        { error: "season_id must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    const seasonIdHint = seasonIdHintRaw ?? undefined;
    proxyParams.delete("season_id");
    const response = await fetchSeasonBackendResponse(showId, seasonNumber, seasonPath, {
      queryString: proxyParams.toString(),
      seasonIdHint,
      fallbackError: `Failed to export ${format.toUpperCase()}`,
      retries: 2,
      timeoutMs: 45_000,
    });

    const contentType = response.headers.get("content-type") ?? (format === "pdf" ? "application/pdf" : "text/csv");
    const disposition = response.headers.get("content-disposition") ??
      `attachment; filename="social_report_${showId}_s${seasonNumber}.${format}"`;

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": disposition,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to export social analytics");
  }
}
