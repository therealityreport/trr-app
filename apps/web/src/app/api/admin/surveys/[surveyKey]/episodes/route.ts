import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSurveyConfigByKey } from "@/lib/server/surveys/survey-config-repository";
import {
  getEpisodesBySurveyKey,
  createEpisode,
  type CreateEpisodeInput,
} from "@/lib/server/surveys/survey-episodes-repository";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ surveyKey: string }>;
}

/**
 * GET /api/admin/surveys/[surveyKey]/episodes
 * Get all episodes for a survey
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { surveyKey } = await params;

    const episodes = await getEpisodesBySurveyKey(surveyKey);
    return NextResponse.json({ episodes });
  } catch (error) {
    console.error("[api] Failed to get episodes", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/surveys/[surveyKey]/episodes
 * Add a new episode to a survey
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { surveyKey } = await params;

    // Get the survey to get its ID
    const survey = await getSurveyConfigByKey(surveyKey);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      episodeNumber,
      episodeId,
      episodeLabel,
      airDate,
      opensAt,
      closesAt,
      isActive,
      isCurrent,
    } = body;

    if (episodeNumber === undefined || !episodeId) {
      return NextResponse.json(
        { error: "episodeNumber and episodeId are required" },
        { status: 400 }
      );
    }

    const input: CreateEpisodeInput = {
      surveyId: survey.id,
      episodeNumber,
      episodeId,
      episodeLabel: episodeLabel ?? null,
      airDate: airDate ?? null,
      opensAt: opensAt ?? null,
      closesAt: closesAt ?? null,
      isActive: isActive ?? true,
      isCurrent: isCurrent ?? false,
    };

    const created = await createEpisode(input);
    return NextResponse.json({ episode: created }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create episode", error);
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
