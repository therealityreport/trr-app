import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/auth";
import {
  getActiveRunForSurvey,
  getSurveyWithQuestions,
  getUserSubmissionCount,
} from "@/lib/server/surveys/survey-run-repository";
import type {
  ActiveRunResponse,
  SurveySubmissionEligibility,
} from "@/lib/surveys/normalized-types";

export const dynamic = "force-dynamic";

const noActiveRun: ActiveRunResponse = {
  activeRun: null,
  survey: null,
  userSubmissions: 0,
  canSubmit: false,
  eligibility: "no-active-run",
};
const responseOptions = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string }> },
): Promise<NextResponse<ActiveRunResponse | { error: string }>> {
  try {
    const { surveySlug } = await params;

    // Get active run
    const activeRun = await getActiveRunForSurvey(surveySlug);
    if (!activeRun) {
      return NextResponse.json(noActiveRun, responseOptions);
    }

    // Get survey with questions
    const survey = await getSurveyWithQuestions(surveySlug);
    if (!survey) {
      return NextResponse.json(noActiveRun, responseOptions);
    }

    // Check user authentication (optional for this endpoint)
    const user = await getUserFromRequest(request);
    let userSubmissions = 0;
    let eligibility: SurveySubmissionEligibility = "sign-in-required";

    if (user) {
      userSubmissions = await getUserSubmissionCount(
        { firebaseUid: user.uid },
        activeRun.id,
      );
      eligibility = userSubmissions < activeRun.max_submissions_per_user ? "allowed" : "limit-reached";
    }

    return NextResponse.json(
      { activeRun, survey, userSubmissions, canSubmit: eligibility === "allowed", eligibility },
      responseOptions,
    );
  } catch (error) {
    console.error("[api] Failed to fetch active run", error);
    return NextResponse.json({ error: "Internal error" }, { ...responseOptions, status: 500 });
  }
}
