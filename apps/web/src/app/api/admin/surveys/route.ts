import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { listSurveys } from "@/lib/server/surveys/fetch";
import {
  getAllSurveyConfigs,
  createSurvey,
  type CreateSurveyInput,
} from "@/lib/server/surveys/survey-config-repository";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    // Check for ?full=true to get full config with theme/air_schedule
    const url = new URL(request.url);
    const full = url.searchParams.get("full") === "true";

    if (full) {
      const configs = await getAllSurveyConfigs();
      return NextResponse.json({ items: configs });
    }

    // Default: return minimal survey list (existing behavior)
    const items = await listSurveys();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[api] Failed to list surveys", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { key, title, description, responseTableName, showId, seasonNumber, theme, airSchedule, firestorePath } = body;

    if (!key || !title || !responseTableName) {
      return NextResponse.json(
        { error: "key, title, and responseTableName are required" },
        { status: 400 }
      );
    }

    const input: CreateSurveyInput = {
      key,
      title,
      description: description ?? null,
      responseTableName,
      showId: showId ?? null,
      seasonNumber: seasonNumber ?? null,
      theme: theme ?? null,
      airSchedule: airSchedule ?? null,
      firestorePath: firestorePath ?? null,
    };

    const created = await createSurvey(input);
    return NextResponse.json({ survey: created }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create survey", error);
    const message = error instanceof Error ? error.message : "failed";

    // Check for unique constraint violation
    if (message.includes("duplicate key") || message.includes("unique constraint")) {
      return NextResponse.json({ error: "A survey with this key already exists" }, { status: 409 });
    }

    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
