import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getMediaLinksByAssetId, updateMediaLinksContext } from "@/lib/server/trr-api/media-links-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

/**
 * POST /api/admin/trr-api/media-assets/[assetId]/auto-count
 *
 * Proxy to TRR-Backend auto-count for media assets.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { assetId } = await params;

    if (!assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(`/admin/media-assets/${assetId}/auto-count`);
    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 500 }
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Backend auth not configured" },
        { status: 500 }
      );
    }

    let backendResponse: Response;
    let data: Record<string, unknown> = {};
    try {
      backendResponse = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ force: false }),
      });
      data = (await backendResponse.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
    } catch (error) {
      const baseDetail = error instanceof Error ? error.message : "unknown error";
      const causeDetail =
        error instanceof Error && error.cause
          ? `; cause=${String(error.cause)}`
          : "";
      return NextResponse.json(
        {
          error: "Backend fetch failed",
          detail: `${baseDetail}${causeDetail} (TRR_API_URL=${process.env.TRR_API_URL ?? "unset"})`,
        },
        { status: 502 }
      );
    }

    if (!backendResponse.ok) {
      const errorMessage =
        typeof data.error === "string" ? data.error : "Auto-count failed";
      const detail =
        typeof data.detail === "string" ? data.detail : undefined;
      return NextResponse.json(
        detail ? { error: errorMessage, detail } : { error: errorMessage },
        { status: backendResponse.status }
      );
    }

    const rawCount = (data as { people_count?: unknown }).people_count;
    const parsedCount =
      typeof rawCount === "number" && Number.isFinite(rawCount)
        ? Math.max(1, Math.floor(rawCount))
        : null;

    if (parsedCount !== null) {
      const links = await getMediaLinksByAssetId(assetId);
      if (links.length > 0) {
        const baseContext =
          links[0].context && typeof links[0].context === "object"
            ? (links[0].context as Record<string, unknown>)
            : {};
        await updateMediaLinksContext(assetId, {
          ...baseContext,
          people_count: parsedCount,
          people_count_source: "auto",
        });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to auto-count media asset", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
