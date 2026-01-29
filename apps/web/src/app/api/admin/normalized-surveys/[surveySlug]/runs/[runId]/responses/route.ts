import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  getRunById,
  listResponses,
  getResponseWithAnswers,
} from "@/lib/server/surveys/normalized-survey-admin-repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string; runId: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { runId } = await params;

    const run = await getRunById(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Check for specific response ID query param
    const url = new URL(request.url);
    const responseId = url.searchParams.get("responseId");

    if (responseId) {
      const response = await getResponseWithAnswers(
        { firebaseUid: user.uid, isAdmin: true },
        responseId,
      );
      if (!response) {
        return NextResponse.json({ error: "Response not found" }, { status: 404 });
      }
      return NextResponse.json({ response });
    }

    // List all responses for this run
    const responses = await listResponses(
      { firebaseUid: user.uid, isAdmin: true },
      runId,
    );

    return NextResponse.json({ responses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to list responses", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
