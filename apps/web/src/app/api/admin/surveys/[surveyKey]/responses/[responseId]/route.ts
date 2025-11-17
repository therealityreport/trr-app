import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { fetchSurveyResponseById } from "@/lib/server/surveys/admin-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { surveyKey: string; responseId: string } },
) {
  try {
    await requireAdmin(request);
    const row = await fetchSurveyResponseById(params.surveyKey, params.responseId);
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ item: row });
  } catch (error) {
    console.error("[api] Failed to fetch survey response", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
