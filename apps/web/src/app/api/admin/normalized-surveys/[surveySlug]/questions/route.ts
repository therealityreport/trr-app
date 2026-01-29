import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  createQuestion,
  getSurveyBySlug,
  listQuestions,
  type CreateQuestionInput,
} from "@/lib/server/surveys/normalized-survey-admin-repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string }> },
) {
  try {
    await requireAdmin(request);
    const { surveySlug } = await params;

    const survey = await getSurveyBySlug(surveySlug);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const questions = await listQuestions(survey.id);
    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to list questions", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { surveySlug } = await params;
    const body = (await request.json()) as Omit<CreateQuestionInput, "survey_id">;

    const survey = await getSurveyBySlug(surveySlug);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (!body.question_key || !body.question_text || !body.question_type) {
      return NextResponse.json(
        { error: "question_key, question_text, and question_type are required" },
        { status: 400 },
      );
    }

    const question = await createQuestion(
      { firebaseUid: user.uid, isAdmin: true },
      { ...body, survey_id: survey.id },
    );

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("duplicate key") || message.includes("unique constraint")) {
      return NextResponse.json({ error: "Question with this key already exists" }, { status: 409 });
    }
    console.error("[api] Failed to create question", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
