import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

interface FeaturedLogoRequestBody {
  media_asset_id?: string;
  show_image_id?: string;
}

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId } = await params;

    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as FeaturedLogoRequestBody;
    const mediaAssetId = normalizeId(body.media_asset_id);
    const showImageId = normalizeId(body.show_image_id);
    if (mediaAssetId && showImageId) {
      return NextResponse.json(
        { error: "Provide either media_asset_id or show_image_id, not both" },
        { status: 400 }
      );
    }
    if (!mediaAssetId && !showImageId) {
      return NextResponse.json(
        { error: "Either media_asset_id or show_image_id is required" },
        { status: 400 }
      );
    }

    const backendUrl = getBackendApiUrl("/admin/shows/logos/set-primary");
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const backendPayload = {
      target_type: "show",
      show_id: showId,
      ...(mediaAssetId ? { media_asset_id: mediaAssetId } : {}),
      ...(showImageId ? { show_image_id: showImageId } : {}),
    };

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(backendPayload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            (data as { error?: string; detail?: string }).error ||
            (data as { detail?: string }).detail ||
            "Failed to set featured logo",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
