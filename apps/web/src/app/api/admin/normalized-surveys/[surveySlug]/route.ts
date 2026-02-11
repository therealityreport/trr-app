import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  deleteSurvey,
  getSurveyBySlug,
  updateSurvey,
  type UpdateSurveyInput,
} from "@/lib/server/surveys/normalized-survey-admin-repository";
import { getSurveyWithQuestions } from "@/lib/server/surveys/survey-run-repository";
import { getLinkBySurveyId } from "@/lib/server/surveys/survey-trr-links-repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string }> },
) {
  try {
    await requireAdmin(request);
    const { surveySlug } = await params;

    const survey = await getSurveyWithQuestions(surveySlug);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const trrLink = await getLinkBySurveyId(survey.id);

    return NextResponse.json({ survey, trrLink });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to get survey", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { surveySlug } = await params;
    const body = (await request.json()) as UpdateSurveyInput;

    const existing = await getSurveyBySlug(surveySlug);
    if (!existing) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const survey = await updateSurvey(
      { firebaseUid: user.uid, isAdmin: true },
      existing.id,
      body,
    );

    return NextResponse.json({ survey });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to update survey", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { surveySlug } = await params;

    const existing = await getSurveyBySlug(surveySlug);
    if (!existing) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    await deleteSurvey({ firebaseUid: user.uid, isAdmin: true }, existing.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to delete survey", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
