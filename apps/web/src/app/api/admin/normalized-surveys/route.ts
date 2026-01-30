import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  createSurvey,
  listSurveys,
  type CreateSurveyInput,
} from "@/lib/server/surveys/normalized-survey-admin-repository";
import { createLink } from "@/lib/server/surveys/survey-trr-links-repository";

export const dynamic = "force-dynamic";

interface CreateSurveyWithLinkInput extends CreateSurveyInput {
  trrShowId?: string;
  trrSeasonId?: string;
  seasonNumber?: number;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const surveys = await listSurveys();
    return NextResponse.json({ surveys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to list surveys", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = (await request.json()) as CreateSurveyWithLinkInput;

    if (!body.slug || !body.title) {
      return NextResponse.json(
        { error: "slug and title are required" },
        { status: 400 },
      );
    }

    const authContext = { firebaseUid: user.uid, isAdmin: true };

    // Extract TRR link fields before creating survey
    const { trrShowId, trrSeasonId, seasonNumber, ...surveyInput } = body;

    // Create the survey
    const survey = await createSurvey(authContext, surveyInput);

    // If TRR show ID provided, create the link
    let trrLink = null;
    if (trrShowId) {
      try {
        trrLink = await createLink(authContext, {
          survey_id: survey.id,
          trr_show_id: trrShowId,
          trr_season_id: trrSeasonId ?? null,
          season_number: seasonNumber ?? null,
        });
      } catch (linkError) {
        console.error("[api] Failed to create TRR link for survey", linkError);
        // Don't fail the whole request - survey was created successfully
      }
    }

    return NextResponse.json({ survey, trrLink }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("duplicate key") || message.includes("unique constraint")) {
      return NextResponse.json({ error: "Survey with this slug already exists" }, { status: 409 });
    }
    console.error("[api] Failed to create survey", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
