import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  archiveImage,
  unarchiveImage,
  type ImageType,
} from "@/lib/server/admin/images-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ imageType: string; imageId: string }>;
}

const VALID_TYPES = ["cast", "episode", "season"];

/**
 * PUT /api/admin/images/[imageType]/[imageId]/archive
 *
 * Archive or unarchive an image.
 *
 * Request body:
 *   - archive: boolean - true to archive, false to unarchive
 *   - reason?: string - optional reason for archiving
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

    const { archive, reason } = body;

    if (typeof archive !== "boolean") {
      return NextResponse.json(
        { error: "archive field is required and must be a boolean" },
        { status: 400 }
      );
    }

    if (archive) {
      await archiveImage({
        imageType: imageType as ImageType,
        imageId,
        adminUid: user.uid,
        reason,
      });
    } else {
      await unarchiveImage({
        imageType: imageType as ImageType,
        imageId,
        adminUid: user.uid,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to archive/unarchive image", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
