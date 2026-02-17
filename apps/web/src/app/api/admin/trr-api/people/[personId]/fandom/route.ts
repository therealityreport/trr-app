import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getFandomDataByPersonId } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * GET /api/admin/trr-api/people/[personId]/fandom
 *
 * Get Fandom/Wikia biographical data for a person.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;
    const { searchParams } = new URL(request.url);
    const showIdParam = searchParams.get("showId");
    const showId = typeof showIdParam === "string" && showIdParam.trim().length > 0
      ? showIdParam.trim()
      : undefined;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const fandomData = await getFandomDataByPersonId(personId, { showId });

    return NextResponse.json({
      fandomData,
      count: fandomData.length,
    });
  } catch (error) {
    console.error("[api] Failed to get TRR person fandom data", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
