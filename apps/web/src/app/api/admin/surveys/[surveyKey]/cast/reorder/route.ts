import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSurveyConfigByKey } from "@/lib/server/surveys/survey-config-repository";
import { reorderCastMembers, getCastBySurveyKey } from "@/lib/server/surveys/survey-cast-repository";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ surveyKey: string }>;
}

/**
 * PUT /api/admin/surveys/[surveyKey]/cast/reorder
 * Reorder cast members for a survey
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { surveyKey } = await params;

    // Get the survey to get its ID
    const survey = await getSurveyConfigByKey(surveyKey);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds must be an array of cast member IDs" },
        { status: 400 }
      );
    }

    await reorderCastMembers(survey.id, orderedIds);

    // Return updated cast list
    const cast = await getCastBySurveyKey(surveyKey);
    return NextResponse.json({ cast });
  } catch (error) {
    console.error("[api] Failed to reorder cast", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
