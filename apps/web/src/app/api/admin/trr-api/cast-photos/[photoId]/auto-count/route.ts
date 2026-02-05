import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getTagsByPhotoIds, upsertCastPhotoTags } from "@/lib/server/admin/cast-photo-tags-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ photoId: string }>;
}

/**
 * POST /api/admin/trr-api/cast-photos/[photoId]/auto-count
 *
 * Proxy to TRR-Backend auto-count for cast photos.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { photoId } = await params;

    if (!photoId) {
      return NextResponse.json({ error: "photoId is required" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(`/admin/cast-photos/${photoId}/auto-count`);
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
      const existingTags = await getTagsByPhotoIds([photoId]);
      const existing = existingTags.get(photoId) ?? null;
      await upsertCastPhotoTags({
        cast_photo_id: photoId,
        people_names: existing?.people_names ?? null,
        people_ids: existing?.people_ids ?? null,
        people_count: parsedCount,
        people_count_source: "auto",
        detector: existing?.detector ?? null,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to auto-count cast photo", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
