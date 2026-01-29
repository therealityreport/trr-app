import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import {
  getActiveRunForSurvey,
  submitSurveyResponse,
} from "@/lib/server/surveys/survey-run-repository";
import type { AnswerInput, SubmitResponse } from "@/lib/surveys/normalized-types";

export const dynamic = "force-dynamic";

interface SubmitRequestBody {
  answers: AnswerInput[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string }> },
): Promise<NextResponse<SubmitResponse>> {
  try {
    const { surveySlug } = await params;

    // Require authentication
    const user = await requireUser(request);

    // Parse request body
    const body = (await request.json()) as SubmitRequestBody;
    const { answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: "Invalid request: answers array required" },
        { status: 400 },
      );
    }

    // Get active run
    const activeRun = await getActiveRunForSurvey(surveySlug);
    if (!activeRun) {
      return NextResponse.json(
        { success: false, error: "No active survey run" },
        { status: 400 },
      );
    }

    // Submit response
    const response = await submitSurveyResponse(
      { firebaseUid: user.uid },
      activeRun.id,
      answers,
    );

    return NextResponse.json({
      success: true,
      responseId: response.id,
    });
  } catch (error) {
    console.error("[api] Failed to submit survey", error);

    const message = error instanceof Error ? error.message : "failed";

    // Handle specific error cases
    if (message === "Maximum submissions reached") {
      return NextResponse.json(
        { success: false, error: "You have already submitted this survey" },
        { status: 409 },
      );
    }
    if (message === "unauthorized") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (message === "Survey run not found" || message === "Survey run is not active") {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }
    if (message === "Survey run has not started yet" || message === "Survey run has ended") {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
