import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";
const FULL_FETCH_LIMIT = 5000;

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

/**
 * GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets
 *
 * Get all media assets (posters, stills, cast photos) for a show season.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { showId, seasonNumber } = await params;

    if (!showId || !seasonNumber) {
      return NextResponse.json(
        { error: "showId and seasonNumber are required" },
        { status: 400 }
      );
    }

    const seasonNum = parseInt(seasonNumber, 10);
    if (isNaN(seasonNum)) {
      return NextResponse.json(
        { error: "seasonNumber must be a valid number" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedLimit = parseInt(searchParams.get("limit") ?? "200", 10);
    const parsedOffset = parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 200;
    const offset = Number.isFinite(parsedOffset) ? parsedOffset : 0;
    const full =
      searchParams.get("full") === "1" ||
      searchParams.get("full")?.toLowerCase() === "true";
    const sources = (searchParams.get("sources") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const upstreamParams = new URLSearchParams({
      limit: String(full ? FULL_FETCH_LIMIT + 1 : limit),
      offset: String(full ? 0 : offset),
    });
    if (full) upstreamParams.set("full", "true");
    if (sources.length > 0) upstreamParams.set("sources", sources.join(","));

    const upstream = await fetchAdminBackendJson(
      `/admin/trr-api/shows/${showId}/seasons/${seasonNum}/assets?${upstreamParams.toString()}`,
      {
        timeoutMs: ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS,
        routeName: "season-assets",
      },
    );
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to fetch season assets",
      );
    }
    return NextResponse.json(upstream.data);
  } catch (error) {
    console.error("[api] Failed to fetch season assets", error);
    return buildAdminProxyErrorResponse(error);
  }
}
