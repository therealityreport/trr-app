import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/auth";
import {
  getActiveRunForSurvey,
  getSurveyWithQuestions,
  getUserSubmissionCount,
} from "@/lib/server/surveys/survey-run-repository";
import type { ActiveRunResponse } from "@/lib/surveys/normalized-types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string }> },
): Promise<NextResponse<ActiveRunResponse | { error: string }>> {
  try {
    const { surveySlug } = await params;

    // Get active run
    const activeRun = await getActiveRunForSurvey(surveySlug);
    if (!activeRun) {
      return NextResponse.json({
        activeRun: null,
        survey: null,
        userSubmissions: 0,
        canSubmit: false,
      });
    }

    // Get survey with questions
    const survey = await getSurveyWithQuestions(surveySlug);
    if (!survey) {
      return NextResponse.json({
        activeRun: null,
        survey: null,
        userSubmissions: 0,
        canSubmit: false,
      });
    }

    // Check user authentication (optional for this endpoint)
    const user = await getUserFromRequest(request);
    let userSubmissions = 0;
    let canSubmit = false;

    if (user) {
      userSubmissions = await getUserSubmissionCount(
        { firebaseUid: user.uid },
        activeRun.id,
      );
      canSubmit = userSubmissions < activeRun.max_submissions_per_user;
    }

    return NextResponse.json({
      activeRun,
      survey,
      userSubmissions,
      canSubmit,
    });
  } catch (error) {
    console.error("[api] Failed to fetch active run", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
