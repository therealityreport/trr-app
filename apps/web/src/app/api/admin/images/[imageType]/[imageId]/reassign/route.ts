import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  reassignImage,
  type ImageType,
  type ReassignMode,
} from "@/lib/server/admin/images-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ imageType: string; imageId: string }>;
}

const VALID_TYPES = ["cast", "episode", "season"];

/**
 * PUT /api/admin/images/[imageType]/[imageId]/reassign
 *
 * Reassign an image to a different entity.
 *
 * Request body:
 *   - toEntityId: string (required) - The ID of the target entity
 *   - toType?: ImageType - Change the image type (cast, episode, season)
 *     If provided and different from current type, the image is COPIED
 *     to the new table and the original is archived.
 *   - mode?: ReassignMode - "preserve" (default) or "copy"
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { imageType, imageId } = await params;
    const body = await request.json();

    if (!VALID_TYPES.includes(imageType)) {
      return NextResponse.json(
        { error: "Invalid image type. Must be cast, episode, or season." },
        { status: 400 }
      );
    }

    const { toType, toEntityId, mode = "preserve" } = body;

    if (!toEntityId) {
      return NextResponse.json(
        { error: "toEntityId is required" },
        { status: 400 }
      );
    }

    if (toType && !VALID_TYPES.includes(toType)) {
      return NextResponse.json(
        { error: "Invalid toType. Must be cast, episode, or season." },
        { status: 400 }
      );
    }

    await reassignImage({
      imageType: imageType as ImageType,
      imageId,
      toType: toType as ImageType | undefined,
      toEntityId,
      mode: mode as ReassignMode,
      adminUid: user.uid,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to reassign image", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
