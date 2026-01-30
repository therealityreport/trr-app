import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getCoverPhoto,
  setCoverPhoto,
  removeCoverPhoto,
} from "@/lib/server/admin/person-cover-photos-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * GET /api/admin/trr-api/people/[personId]/cover-photo
 *
 * Get the cover photo for a person.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const coverPhoto = await getCoverPhoto(personId);

    return NextResponse.json({ coverPhoto });
  } catch (error) {
    console.error("[api] Failed to get cover photo", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/trr-api/people/[personId]/cover-photo
 *
 * Set the cover photo for a person.
 * Body: { photo_id: string, photo_url: string }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { photo_id, photo_url } = body;

    if (!photo_id || !photo_url) {
      return NextResponse.json(
        { error: "photo_id and photo_url are required" },
        { status: 400 }
      );
    }

    const authContext = { firebaseUid: user.uid, isAdmin: true };
    const coverPhoto = await setCoverPhoto(authContext, {
      person_id: personId,
      photo_id,
      photo_url,
    });

    return NextResponse.json({ coverPhoto });
  } catch (error) {
    console.error("[api] Failed to set cover photo", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/trr-api/people/[personId]/cover-photo
 *
 * Remove the cover photo for a person (revert to default).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const authContext = { firebaseUid: user.uid, isAdmin: true };
    await removeCoverPhoto(authContext, personId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to remove cover photo", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
