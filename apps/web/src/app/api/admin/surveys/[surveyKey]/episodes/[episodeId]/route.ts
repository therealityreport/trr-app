import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getEpisodeById,
  updateEpisode,
  deleteEpisode,
} from "@/lib/server/surveys/survey-episodes-repository";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ surveyKey: string; episodeId: string }>;
}

/**
 * GET /api/admin/surveys/[surveyKey]/episodes/[episodeId]
 * Get a single episode
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { episodeId } = await params;

    const episode = await getEpisodeById(episodeId);
    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    return NextResponse.json({ episode });
  } catch (error) {
    console.error("[api] Failed to get episode", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/surveys/[surveyKey]/episodes/[episodeId]
 * Update an episode
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { episodeId } = await params;

    const body = await request.json();
    const {
      episodeNumber,
      episodeId: newEpisodeId,
      episodeLabel,
      airDate,
      opensAt,
      closesAt,
      isActive,
      isCurrent,
    } = body;

    const updated = await updateEpisode(episodeId, {
      episodeNumber,
      episodeId: newEpisodeId,
      episodeLabel,
      airDate,
      opensAt,
      closesAt,
      isActive,
      isCurrent,
    });

    if (!updated) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    return NextResponse.json({ episode: updated });
  } catch (error) {
    console.error("[api] Failed to update episode", error);
    const message = error instanceof Error ? error.message : "failed";

    // Check for unique constraint violation
    if (message.includes("duplicate key") || message.includes("unique constraint")) {
      return NextResponse.json(
        { error: "An episode with this number or ID already exists in this survey" },
        { status: 409 }
      );
    }

    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/surveys/[surveyKey]/episodes/[episodeId]
 * Delete an episode
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { episodeId } = await params;

    const success = await deleteEpisode(episodeId);
    if (!success) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete episode", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
