import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getSurveyConfigByKey,
  updateSurveyTheme,
} from "@/lib/server/surveys/survey-config-repository";
import { DEFAULT_SURVEY_THEME } from "@/lib/surveys/types";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ surveyKey: string }>;
}

/**
 * GET /api/admin/surveys/[surveyKey]/theme
 * Get the theme configuration for a survey
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { surveyKey } = await params;

    const survey = await getSurveyConfigByKey(surveyKey);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Merge with defaults to return complete theme
    const theme = { ...DEFAULT_SURVEY_THEME, ...(survey.theme ?? {}) };

    return NextResponse.json({
      theme,
      overrides: survey.theme ?? {},
      defaults: DEFAULT_SURVEY_THEME,
    });
  } catch (error) {
    console.error("[api] Failed to get survey theme", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/surveys/[surveyKey]/theme
 * Update the theme configuration for a survey
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { surveyKey } = await params;

    const body = await request.json();
    const { theme } = body;

    if (theme === undefined) {
      return NextResponse.json({ error: "theme is required" }, { status: 400 });
    }

    const updated = await updateSurveyTheme(surveyKey, theme);
    if (!updated) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Return merged theme
    const mergedTheme = { ...DEFAULT_SURVEY_THEME, ...(updated.theme ?? {}) };

    return NextResponse.json({
      theme: mergedTheme,
      overrides: updated.theme ?? {},
    });
  } catch (error) {
    console.error("[api] Failed to update survey theme", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
