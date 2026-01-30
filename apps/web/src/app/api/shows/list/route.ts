import { NextResponse } from "next/server";
import { getSupabaseTrrCore } from "@/lib/server/supabase-trr-core";

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
    const supabase = getSupabaseTrrCore();

    const { data, error } = await supabase
      .from("shows")
      .select("id, name, alternative_names")
      .order("name");

    if (error) {
      console.error("[api/shows/list] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch shows" },
        { status: 500 }
      );
    }

    const shows: ShowWithAlternativeNames[] = ((data ?? []) as ShowRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      alternativeNames: (row.alternative_names ?? []).filter(isEnglishName),
    }));

    return NextResponse.json({ shows });
  } catch (error) {
    console.error("[api/shows/list] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
