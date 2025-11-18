import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { fetchSurveyResponses, type SurveyFilters } from "@/lib/server/surveys/fetch";

const parseNumber = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyKey: string }> },
) {
  try {
    await requireAdmin(request);
    const { surveyKey } = await params;
    const search = request.nextUrl.searchParams;
    const filters: SurveyFilters = {
      from: search.get("from") ?? undefined,
      to: search.get("to") ?? undefined,
      showId: search.get("showId") ?? undefined,
      seasonNumber: parseNumber(search.get("seasonNumber")) ?? undefined,
      episodeNumber: parseNumber(search.get("episodeNumber")) ?? undefined,
    };
    const limit = parseNumber(search.get("limit")) ?? 50;
    const offset = parseNumber(search.get("offset")) ?? 0;

    const result = await fetchSurveyResponses({
      surveyKey,
      limit,
      offset,
      ...filters,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api] Failed to fetch survey responses", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
