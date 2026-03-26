import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ seasonId: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/trr-api/seasons/[seasonId]/assign-backdrops
 *
 * Body: { media_asset_ids: string[] }
 *
 * Creates kind=backdrop media_links from the season to each media_asset_id.
 * Idempotent: skips links that already exist.
 *
 * For TMDb assets that are not hosted yet (hosted_url is null), this will first
 * mirror them into object storage via TRR-Backend, then assign.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { seasonId } = await params;

    if (!seasonId) {
      return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
    }
    if (!UUID_RE.test(seasonId)) {
      return NextResponse.json({ error: "seasonId must be a UUID" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      media_asset_ids?: unknown;
    };
    const mediaAssetIds = Array.isArray(body.media_asset_ids)
      ? (body.media_asset_ids.filter((id) => typeof id === "string") as string[])
      : [];

    const mediaAssetIdsFiltered = mediaAssetIds.filter((id) => UUID_RE.test(id));
    if (mediaAssetIdsFiltered.length === 0) {
      return NextResponse.json(
        { error: "media_asset_ids must be a non-empty string array" },
        { status: 400 }
      );
    }

    const upstream = await fetchAdminBackendJson(
      `/admin/trr-api/seasons/${seasonId}/backdrops/assign`,
      {
        method: "POST",
        body: JSON.stringify({ media_asset_ids: mediaAssetIdsFiltered }),
        headers: { "Content-Type": "application/json" },
        timeoutMs: ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS,
        routeName: "season-assign-backdrops",
      },
    );
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to assign backdrops",
      );
    }
    return NextResponse.json(upstream.data);
  } catch (error) {
    console.error("[api] Failed to assign backdrops", error);
    return buildAdminProxyErrorResponse(error);
  }
}
