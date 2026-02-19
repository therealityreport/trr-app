import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  getTagsByPhotoIds,
  upsertCastPhotoTags,
} from "@/lib/server/admin/cast-photo-tags-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ photoId: string }>;
}

const parsePeopleCount = (value: unknown): number | null | undefined => {
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

/**
 * PATCH /api/admin/trr-api/cast-photos/[photoId]/people-count
 *
 * Persist manual people_count while preserving existing people tags.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { photoId } = await params;
    if (!photoId) {
      return NextResponse.json({ error: "photoId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const rawCount = (body as { people_count?: unknown }).people_count;
    const peopleCount = parsePeopleCount(rawCount);
    if (peopleCount === undefined) {
      return NextResponse.json(
        { error: "Invalid payload. Expected people_count as integer or null." },
        { status: 400 }
      );
    }

    const existing = (await getTagsByPhotoIds([photoId])).get(photoId) ?? null;
    const updated = await upsertCastPhotoTags({
      cast_photo_id: photoId,
      people_names: existing?.people_names ?? null,
      people_ids: existing?.people_ids ?? null,
      people_count: peopleCount,
      people_count_source: peopleCount === null ? null : "manual",
      detector: existing?.detector ?? null,
      created_by_firebase_uid: existing?.created_by_firebase_uid ?? user.uid,
      updated_by_firebase_uid: user.uid,
    });

    if (!updated) {
      return NextResponse.json({ error: "Failed to update people count" }, { status: 500 });
    }

    return NextResponse.json({
      cast_photo_id: updated.cast_photo_id,
      people_count: updated.people_count,
      people_count_source: updated.people_count_source,
    });
  } catch (error) {
    console.error("[api] Failed to patch cast photo people count", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

