import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  deleteImage,
  getImage,
  type ImageType,
} from "@/lib/server/admin/images-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ imageType: string; imageId: string }>;
}

const VALID_TYPES = ["cast", "episode", "season"];

/**
 * GET /api/admin/images/[imageType]/[imageId]
 *
 * Get a single image by type and ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { imageType, imageId } = await params;

    if (!VALID_TYPES.includes(imageType)) {
      return NextResponse.json(
        { error: "Invalid image type. Must be cast, episode, or season." },
        { status: 400 }
      );
    }

    const image = await getImage(imageType as ImageType, imageId);

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ image });
  } catch (error) {
    console.error("[api] Failed to get image", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/images/[imageType]/[imageId]
 *
 * Permanently delete an image. This action cannot be undone.
 * Consider using archive instead for soft delete.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { imageType, imageId } = await params;

    if (!VALID_TYPES.includes(imageType)) {
      return NextResponse.json(
        { error: "Invalid image type. Must be cast, episode, or season." },
        { status: 400 }
      );
    }

    await deleteImage({
      imageType: imageType as ImageType,
      imageId,
      adminUid: user.uid,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete image", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
