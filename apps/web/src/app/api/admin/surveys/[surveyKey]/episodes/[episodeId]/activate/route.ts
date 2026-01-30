import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSurveyConfigByKey } from "@/lib/server/surveys/survey-config-repository";
import {
  getEpisodeById,
  setCurrentEpisode,
  getEpisodesBySurveyKey,
} from "@/lib/server/surveys/survey-episodes-repository";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ surveyKey: string; episodeId: string }>;
}

/**
 * POST /api/admin/surveys/[surveyKey]/episodes/[episodeId]/activate
 * Set an episode as the current active episode
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { surveyKey, episodeId } = await params;

    // Verify survey exists
    const survey = await getSurveyConfigByKey(surveyKey);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Verify episode exists
    const episode = await getEpisodeById(episodeId);
    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Verify episode belongs to this survey
    if (episode.survey_id !== survey.id) {
      return NextResponse.json(
        { error: "Episode does not belong to this survey" },
        { status: 400 }
      );
    }

    // Set as current episode
    const updated = await setCurrentEpisode(survey.id, episodeId);
    if (!updated) {
      return NextResponse.json({ error: "Failed to activate episode" }, { status: 500 });
    }

    // Return updated episode list
    const episodes = await getEpisodesBySurveyKey(surveyKey);

    return NextResponse.json({
      currentEpisode: updated,
      episodes,
    });
  } catch (error) {
    console.error("[api] Failed to activate episode", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
