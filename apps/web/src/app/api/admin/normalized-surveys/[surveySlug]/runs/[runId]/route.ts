import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  deleteRun,
  getRunForSurvey,
  updateRun,
  getResponseCount,
  type UpdateRunInput,
} from "@/lib/server/surveys/normalized-survey-admin-repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string; runId: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { surveySlug, runId } = await params;

    const run = await getRunForSurvey(surveySlug, runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const responseCount = await getResponseCount({ firebaseUid: user.uid, isAdmin: true }, surveySlug, runId);

    return NextResponse.json({ run: { ...run, response_count: responseCount } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to get run", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string; runId: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { surveySlug, runId } = await params;
    const body = (await request.json()) as UpdateRunInput;

    const run = await updateRun(
      { firebaseUid: user.uid, isAdmin: true },
      surveySlug,
      runId,
      body,
    );
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to update run", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string; runId: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { surveySlug, runId } = await params;

    const result = await deleteRun({ firebaseUid: user.uid, isAdmin: true }, surveySlug, runId);
    if (result === "not_found") {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (result === "has_responses") {
      return NextResponse.json(
        { error: "Cannot delete run with existing responses" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to delete run", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
