import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  deleteRun,
  getRunById,
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
    await requireAdmin(request);
    const { runId } = await params;

    const run = await getRunById(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const responseCount = await getResponseCount(runId);

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
    const { runId } = await params;
    const body = (await request.json()) as UpdateRunInput;

    const existing = await getRunById(runId);
    if (!existing) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const run = await updateRun(
      { firebaseUid: user.uid, isAdmin: true },
      runId,
      body,
    );

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
    const { runId } = await params;

    const existing = await getRunById(runId);
    if (!existing) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Check if run has responses
    const responseCount = await getResponseCount(runId);
    if (responseCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete run with existing responses" },
        { status: 400 },
      );
    }

    await deleteRun({ firebaseUid: user.uid, isAdmin: true }, runId);

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
