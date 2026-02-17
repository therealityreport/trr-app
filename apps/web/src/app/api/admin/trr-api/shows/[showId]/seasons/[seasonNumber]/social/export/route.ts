import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendResponse,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

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

    const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "csv";
    const seasonPath = format === "pdf" ? "/analytics/export.pdf" : "/analytics/export.csv";

    const proxyParams = new URLSearchParams(request.nextUrl.searchParams);
    proxyParams.delete("format");
    const response = await fetchSeasonBackendResponse(showId, seasonNumber, seasonPath, {
      queryString: proxyParams.toString(),
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
