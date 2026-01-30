import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSurveyConfigByKey } from "@/lib/server/surveys/survey-config-repository";
import {
  getCastBySurveyKey,
  createCastMember,
  type CreateCastMemberInput,
} from "@/lib/server/surveys/survey-cast-repository";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ surveyKey: string }>;
}

/**
 * GET /api/admin/surveys/[surveyKey]/cast
 * Get all cast members for a survey
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { surveyKey } = await params;

    const cast = await getCastBySurveyKey(surveyKey);
    return NextResponse.json({ cast });
  } catch (error) {
    console.error("[api] Failed to get cast", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/surveys/[surveyKey]/cast
 * Add a new cast member to a survey
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

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const input: CreateCastMemberInput = {
      surveyId: survey.id,
      name,
      slug,
      imageUrl: imageUrl ?? null,
      role: role ?? null,
      status: status ?? null,
      instagram: instagram ?? null,
      displayOrder,
      isAlumni: isAlumni ?? false,
      alumniVerdictEnabled: alumniVerdictEnabled ?? false,
      metadata: metadata ?? {},
    };

    const created = await createCastMember(input);
    return NextResponse.json({ castMember: created }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create cast member", error);
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
