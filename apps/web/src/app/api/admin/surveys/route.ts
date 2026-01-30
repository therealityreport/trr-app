import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { listSurveys } from "@/lib/server/surveys/normalized-survey-admin-repository";
import type { NormalizedSurvey } from "@/lib/surveys/normalized-types";

export const dynamic = "force-dynamic";

/**
 * Transform NormalizedSurvey to the format expected by the admin UI.
 * Maps slug → key and extracts show/season info from metadata.
 */
function transformSurveyForAdmin(survey: NormalizedSurvey) {
  const metadata = survey.metadata ?? {};
  return {
    id: survey.id,
    key: survey.slug,
    title: survey.title,
    description: survey.description,
    show_id: (metadata.showId as string) ?? null,
    season_number: (metadata.seasonNumber as number) ?? null,
    is_active: survey.is_active,
    theme: (metadata.theme as Record<string, unknown>) ?? null,
    air_schedule: (metadata.airSchedule as {
      airDays: string[];
      airTime: string;
      timezone: string;
      autoProgress: boolean;
    }) ?? null,
    current_episode_id: (metadata.currentEpisodeId as string) ?? null,
    created_at: survey.created_at,
    updated_at: survey.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const surveys = await listSurveys();
    const items = surveys.map(transformSurveyForAdmin);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[api] Failed to list surveys", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
