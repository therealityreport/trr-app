import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { updateShowById } from "@/lib/server/trr-api/trr-shows-repository";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

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

const toErrorMessage = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => toErrorMessage(item))
      .filter((item): item is string => Boolean(item));
    return messages.length > 0 ? messages.join("; ") : null;
  }

  if (value && typeof value === "object") {
    const candidate = value as {
      detail?: unknown;
      error?: unknown;
      msg?: unknown;
      message?: unknown;
    };
    return (
      toErrorMessage(candidate.error) ??
      toErrorMessage(candidate.detail) ??
      toErrorMessage(candidate.msg) ??
      toErrorMessage(candidate.message) ??
      JSON.stringify(value)
    );
  }

  return null;
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

    if (showImageId) {
      const show = await updateShowById(showId, {
        primaryLogoImageId: showImageId,
      });
      if (!show) {
        return NextResponse.json({ error: "Show not found" }, { status: 404 });
      }
      return NextResponse.json({ status: "updated", show });
    }

    const backendUrl = getBackendApiUrl("/admin/shows/logos/set-primary");
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        target_type: "show",
        show_id: showId,
        asset_id: mediaAssetId,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            toErrorMessage((data as { error?: unknown }).error) ??
            toErrorMessage((data as { detail?: unknown }).detail) ??
            "Failed to set featured logo",
        },
        { status: response.status }
      );
    }

    const show = await updateShowById(showId, {
      primaryLogoImageId: null,
    });
    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...(data && typeof data === "object" ? data : {}),
      show,
    });
  } catch (error) {
    const message = toErrorMessage(error) ?? "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
