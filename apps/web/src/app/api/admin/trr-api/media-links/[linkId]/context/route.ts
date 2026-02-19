import { NextRequest, NextResponse } from "next/server";

import { parseThumbnailCrop } from "@/lib/thumbnail-crop";
import { requireAdmin } from "@/lib/server/auth";
import {
  updateMediaLinkContextById,
  type MediaLinkContextPatch,
} from "@/lib/server/trr-api/media-links-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ linkId: string }>;
}

const ALLOWED_KEYS = new Set(["people_count", "people_count_source", "thumbnail_crop"]);

const parsePeopleCount = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : undefined;
  }
  return undefined;
};

const parsePeopleCountSource = (value: unknown): "auto" | "manual" | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value === "auto" || value === "manual" ? value : undefined;
};

const parsePatchBody = (value: unknown): MediaLinkContextPatch | null => {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.length === 0) return null;
  if (keys.some((key) => !ALLOWED_KEYS.has(key))) return null;

  const patch: MediaLinkContextPatch = {};

  if (Object.prototype.hasOwnProperty.call(body, "people_count")) {
    const parsed = parsePeopleCount(body.people_count);
    if (parsed === undefined) return null;
    patch.people_count = parsed;
  }

  if (Object.prototype.hasOwnProperty.call(body, "people_count_source")) {
    const parsed = parsePeopleCountSource(body.people_count_source);
    if (parsed === undefined) return null;
    patch.people_count_source = parsed;
  }

  if (Object.prototype.hasOwnProperty.call(body, "thumbnail_crop")) {
    if (body.thumbnail_crop === null) {
      patch.thumbnail_crop = null;
    } else {
      const parsed = parseThumbnailCrop(body.thumbnail_crop, { clamp: true });
      if (!parsed) return null;
      patch.thumbnail_crop = parsed;
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
};

/**
 * PATCH /api/admin/trr-api/media-links/[linkId]/context
 *
 * Merge-patch safe context keys (people_count/source + thumbnail_crop) for a link.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { linkId } = await params;
    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const patch = parsePatchBody(body);
    if (!patch) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. Allowed keys: people_count, people_count_source, thumbnail_crop.",
        },
        { status: 400 }
      );
    }

    const updated = await updateMediaLinkContextById(linkId, patch);
    if (!updated) {
      return NextResponse.json({ error: "Media link not found" }, { status: 404 });
    }

    const context =
      updated.context && typeof updated.context === "object"
        ? (updated.context as Record<string, unknown>)
        : {};
    const peopleCount = parsePeopleCount(context.people_count) ?? null;
    const peopleCountSource = parsePeopleCountSource(context.people_count_source) ?? null;
    const thumbnailCrop =
      context.thumbnail_crop === null
        ? null
        : parseThumbnailCrop(context.thumbnail_crop, { clamp: true });

    return NextResponse.json({
      link_id: updated.id,
      people_count: peopleCount,
      people_count_source: peopleCountSource,
      thumbnail_crop: thumbnailCrop ?? null,
    });
  } catch (error) {
    console.error("[api] Failed to patch media-link context", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

