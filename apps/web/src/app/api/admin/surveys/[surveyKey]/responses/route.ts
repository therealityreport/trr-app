import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { fetchSurveyResponses, type SurveyAdminFilters } from "@/lib/server/surveys/admin-service";

const parseNumber = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { surveyKey: string } },
) {
  try {
    await requireAdmin(request);
    const search = request.nextUrl.searchParams;
    const filters: SurveyAdminFilters = {
      from: search.get("from") ?? undefined,
      to: search.get("to") ?? undefined,
      showId: search.get("showId") ?? undefined,
      seasonNumber: parseNumber(search.get("seasonNumber")) ?? undefined,
      episodeNumber: parseNumber(search.get("episodeNumber")) ?? undefined,
    };
    const page = parseNumber(search.get("page")) ?? 1;
    const pageSize = parseNumber(search.get("pageSize")) ?? 25;

    const result = await fetchSurveyResponses(params.surveyKey, filters, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api] Failed to fetch survey responses", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
