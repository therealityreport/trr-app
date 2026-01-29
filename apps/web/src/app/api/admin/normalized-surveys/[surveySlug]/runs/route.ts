import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  createRun,
  getSurveyBySlug,
  listRuns,
  getResponseCount,
  type CreateRunInput,
} from "@/lib/server/surveys/normalized-survey-admin-repository";
import type { SurveyRun } from "@/lib/surveys/normalized-types";

export const dynamic = "force-dynamic";

interface RunWithCount extends SurveyRun {
  response_count: number;
}

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

    const runs = await listRuns(survey.id);

    // Add response counts
    const runsWithCounts: RunWithCount[] = await Promise.all(
      runs.map(async (run) => ({
        ...run,
        response_count: await getResponseCount(run.id),
      })),
    );

    return NextResponse.json({ runs: runsWithCounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to list runs", error);
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
    const body = (await request.json()) as Omit<CreateRunInput, "survey_id">;

    const survey = await getSurveyBySlug(surveySlug);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (!body.run_key || !body.starts_at) {
      return NextResponse.json(
        { error: "run_key and starts_at are required" },
        { status: 400 },
      );
    }

    const run = await createRun(
      { firebaseUid: user.uid, isAdmin: true },
      { ...body, survey_id: survey.id },
    );

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("duplicate key") || message.includes("unique constraint")) {
      return NextResponse.json({ error: "Run with this key already exists" }, { status: 409 });
    }
    console.error("[api] Failed to create run", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
