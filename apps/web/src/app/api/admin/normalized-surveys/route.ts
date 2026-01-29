import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  createSurvey,
  listSurveys,
  type CreateSurveyInput,
} from "@/lib/server/surveys/normalized-survey-admin-repository";

export const dynamic = "force-dynamic";

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
    const body = (await request.json()) as CreateSurveyInput;

    if (!body.slug || !body.title) {
      return NextResponse.json(
        { error: "slug and title are required" },
        { status: 400 },
      );
    }

    const survey = await createSurvey(
      { firebaseUid: user.uid, isAdmin: true },
      body,
    );
    return NextResponse.json({ survey }, { status: 201 });
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
