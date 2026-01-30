import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getCastMemberById,
  updateCastMember,
  deleteCastMember,
} from "@/lib/server/surveys/survey-cast-repository";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ surveyKey: string; castId: string }>;
}

/**
 * GET /api/admin/surveys/[surveyKey]/cast/[castId]
 * Get a single cast member
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { castId } = await params;

    const castMember = await getCastMemberById(castId);
    if (!castMember) {
      return NextResponse.json({ error: "Cast member not found" }, { status: 404 });
    }

    return NextResponse.json({ castMember });
  } catch (error) {
    console.error("[api] Failed to get cast member", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/surveys/[surveyKey]/cast/[castId]
 * Update a cast member
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { castId } = await params;

    const body = await request.json();
    const {
      name,
      slug,
      imageUrl,
      role,
      status,
      instagram,
      displayOrder,
      isAlumni,
      alumniVerdictEnabled,
      metadata,
    } = body;

    const updated = await updateCastMember(castId, {
      name,
      slug,
      imageUrl,
      role,
      status,
      instagram,
      displayOrder,
      isAlumni,
      alumniVerdictEnabled,
      metadata,
    });

    if (!updated) {
      return NextResponse.json({ error: "Cast member not found" }, { status: 404 });
    }

    return NextResponse.json({ castMember: updated });
  } catch (error) {
    console.error("[api] Failed to update cast member", error);
    const message = error instanceof Error ? error.message : "failed";

    // Check for unique constraint violation
    if (message.includes("duplicate key") || message.includes("unique constraint")) {
      return NextResponse.json(
        { error: "A cast member with this slug already exists in this survey" },
        { status: 409 }
      );
    }

    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/surveys/[surveyKey]/cast/[castId]
 * Delete a cast member
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { castId } = await params;

    const success = await deleteCastMember(castId);
    if (!success) {
      return NextResponse.json({ error: "Cast member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete cast member", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
