import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getPhotosByPersonId } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * GET /api/admin/trr-api/people/[personId]/photos
 *
 * Get all photos for a person from TRR Core API.
 * Only returns photos with hosted_url (mirrored to CloudFront).
 *
 * Query params:
 * - limit: max results (default 100, max 100)
 * - offset: pagination offset (default 0)
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const photos = await getPhotosByPersonId(personId, { limit, offset });

    return NextResponse.json({
      photos,
      pagination: {
        limit,
        offset,
        count: photos.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to get TRR person photos", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
