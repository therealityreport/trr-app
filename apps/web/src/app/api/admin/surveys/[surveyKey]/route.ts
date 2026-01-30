import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  getSurveyBySlug,
  updateSurvey,
} from "@/lib/server/surveys/normalized-survey-admin-repository";
import type { NormalizedSurvey } from "@/lib/surveys/normalized-types";
import { getLinkBySurveyId } from "@/lib/server/surveys/survey-trr-links-repository";
import { getCastByShowSeason, getEpisodesByShowAndSeason, getAssetsByShowSeason } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ surveyKey: string }>;
}

/**
 * Transform NormalizedSurvey to the format expected by the admin UI.
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

/**
 * GET /api/admin/surveys/[surveyKey]
 * Get full survey configuration including cast and episodes
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { surveyKey } = await params;

    const survey = await getSurveyBySlug(surveyKey);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Check if we should include related data
    const url = new URL(request.url);
    const includeCast = url.searchParams.get("includeCast") === "true";
    const includeEpisodes = url.searchParams.get("includeEpisodes") === "true";
    const includeAssets = url.searchParams.get("includeAssets") === "true";

    const response: Record<string, unknown> = { survey: transformSurveyForAdmin(survey) };

    // Check if survey is linked to a TRR show/season
    const trrLink = (includeCast || includeEpisodes || includeAssets)
      ? await getLinkBySurveyId(survey.id)
      : null;

    // Fetch cast from TRR core for this show/season
    if (includeCast) {
      if (trrLink && trrLink.season_number) {
        const seasonCast = await getCastByShowSeason(
          trrLink.trr_show_id,
          trrLink.season_number,
          { limit: 50 }
        );
        // Transform to the format expected by the admin UI
        response.cast = seasonCast.map((member, index) => ({
          id: member.person_id,
          name: member.person_name,
          slug: member.person_name.toLowerCase().replace(/\s+/g, "-"),
          image_url: member.photo_url,
          role: "Self",
          status: "main",
          instagram: null,
          display_order: index,
          is_alumni: false,
          alumni_verdict_enabled: false,
        }));
      } else {
        response.cast = [];
      }
    }

    // Fetch episodes from TRR core for this show/season
    if (includeEpisodes) {
      if (trrLink && trrLink.season_number) {
        const episodes = await getEpisodesByShowAndSeason(
          trrLink.trr_show_id,
          trrLink.season_number,
          { limit: 50 }
        );
        // Transform to the format expected by the admin UI
        // Determine current episode based on metadata
        const currentEpisodeId = survey.metadata?.currentEpisodeId as string | undefined;
        response.episodes = episodes.map((ep) => ({
          id: ep.id,
          episode_number: ep.episode_number,
          episode_id: `E${ep.episode_number.toString().padStart(2, "0")}`,
          episode_label: ep.title,
          air_date: ep.air_date,
          opens_at: null,
          closes_at: null,
          is_active: true,
          is_current: currentEpisodeId === ep.id,
        }));
      } else {
        response.episodes = [];
      }
    }

    // Fetch assets from TRR core for this show/season
    if (includeAssets) {
      if (trrLink && trrLink.season_number) {
        const assets = await getAssetsByShowSeason(
          trrLink.trr_show_id,
          trrLink.season_number,
          { limit: 200 }
        );
        response.assets = assets;
      } else {
        response.assets = [];
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api] Failed to get survey", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/surveys/[surveyKey]
 * Update survey configuration
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };
    const { surveyKey } = await params;

    // First get the survey to find its ID
    const survey = await getSurveyBySlug(surveyKey);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      showId,
      seasonNumber,
      isActive,
      theme,
      airSchedule,
      currentEpisodeId,
    } = body;

    // Build metadata object from fields
    const existingMetadata = survey.metadata ?? {};
    const metadata: Record<string, unknown> = { ...existingMetadata };

    if (showId !== undefined) metadata.showId = showId;
    if (seasonNumber !== undefined) metadata.seasonNumber = seasonNumber;
    if (theme !== undefined) metadata.theme = theme;
    if (airSchedule !== undefined) metadata.airSchedule = airSchedule;
    if (currentEpisodeId !== undefined) metadata.currentEpisodeId = currentEpisodeId;

    const updated = await updateSurvey(authContext, survey.id, {
      title,
      description,
      is_active: isActive,
      metadata,
    });

    if (!updated) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    return NextResponse.json({ survey: transformSurveyForAdmin(updated) });
  } catch (error) {
    console.error("[api] Failed to update survey", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/surveys/[surveyKey]
 * Soft delete (deactivate) a survey
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };
    const { surveyKey } = await params;

    // First get the survey to find its ID
    const survey = await getSurveyBySlug(surveyKey);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Soft delete by setting is_active to false
    const updated = await updateSurvey(authContext, survey.id, {
      is_active: false,
    });

    if (!updated) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete survey", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
