import { NextRequest, NextResponse } from "next/server";

import {
  parseThumbnailCrop,
  type ThumbnailCrop,
} from "@/lib/thumbnail-crop";
import { requireAdmin } from "@/lib/server/auth";
import {
  updateCastPhotoThumbnailCrop,
  updateMediaLinkThumbnailCrop,
  type ThumbnailCropOrigin,
} from "@/lib/server/admin/person-thumbnail-crops-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string; photoId: string }>;
}

const parseOrigin = (value: unknown): ThumbnailCropOrigin | null => {
  if (value === "cast_photos" || value === "media_links") {
    return value;
  }
  return null;
};

const parseRequestBody = (body: unknown): {
  origin: ThumbnailCropOrigin;
  linkId: string | null;
  crop: ThumbnailCrop | null;
} | null => {
  if (!body || typeof body !== "object") return null;

  const payload = body as {
    origin?: unknown;
    link_id?: unknown;
    crop?: unknown;
  };

  const origin = parseOrigin(payload.origin);
  if (!origin) return null;

  const linkId =
    typeof payload.link_id === "string" && payload.link_id.trim().length > 0
      ? payload.link_id.trim()
      : null;

  if (payload.crop === null) {
    return { origin, linkId, crop: null };
  }

  const parsedCrop = parseThumbnailCrop(payload.crop, { clamp: false });
  if (!parsedCrop) return null;

  return {
    origin,
    linkId,
    crop: parsedCrop,
  };
};

/**
 * PUT /api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop
 *
 * Persist per-photo thumbnail focal point/zoom for person gallery previews.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId, photoId } = await params;
    if (!personId || !photoId) {
      return NextResponse.json(
        { error: "personId and photoId are required" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = parseRequestBody(body);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. Expected origin + crop object with x/y/zoom/mode in bounds, or crop:null.",
        },
        { status: 400 },
      );
    }

    if (parsed.origin === "media_links") {
      const linkId = parsed.linkId ?? photoId;
      if (parsed.linkId && parsed.linkId !== photoId) {
        return NextResponse.json(
          { error: "link_id must match photoId for media_links updates" },
          { status: 400 },
        );
      }

      const result = await updateMediaLinkThumbnailCrop({
        personId,
        linkId,
        crop: parsed.crop,
      });
      if (!result) {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    const result = await updateCastPhotoThumbnailCrop({
      personId,
      photoId,
      crop: parsed.crop,
    });

    if (!result) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api] Failed to update thumbnail crop", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
