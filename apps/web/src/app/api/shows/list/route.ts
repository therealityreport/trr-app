import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

export interface ShowWithAlternativeNames {
  id: string;
  name: string;
  alternativeNames: string[];
}

interface ShowRow {
  id: string;
  name: string;
  alternative_names: string[] | null;
}

/**
 * Filter out non-English alternative names (Chinese, Japanese, Korean, etc.)
 */
function isEnglishName(name: string): boolean {
  // Filter out names with CJK characters
  return !/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(name);
}

/**
 * GET /api/shows/list
 * Returns shows with their alternative names (English only)
 */
export async function GET() {
  try {
    const backendUrl = getBackendApiUrl("/shows/list");
    if (!backendUrl) {
      console.error("[api/shows/list] TRR_API_URL not configured");
      return NextResponse.json(
        { error: "Failed to fetch shows" },
        { status: 500 },
      );
    }

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[api/shows/list] Backend error:", response.status, await response.text());
      return NextResponse.json(
        { error: "Failed to fetch shows" },
        { status: 500 },
      );
    }

    const data = (await response.json().catch(() => [])) as ShowRow[];
    const shows: ShowWithAlternativeNames[] = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      alternativeNames: (row.alternative_names ?? []).filter(isEnglishName),
    }));

    return NextResponse.json({ shows });
  } catch (error) {
    console.error("[api/shows/list] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
