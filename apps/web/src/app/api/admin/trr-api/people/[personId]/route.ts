import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getPersonById } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * GET /api/admin/trr-api/people/[personId]
 *
 * Get person details from TRR Core API.
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

    const person = await getPersonById(personId);

    if (!person) {
      return NextResponse.json(
        { error: "Person not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ person });
  } catch (error) {
    console.error("[api] Failed to get TRR person", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
