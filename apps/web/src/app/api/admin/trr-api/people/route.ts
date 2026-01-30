import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { searchPeople } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

const MIN_QUERY_LENGTH = 2;
const MAX_LIMIT = 20;

/**
 * GET /api/admin/trr-api/people
 *
 * Search people in TRR Core API by name (prefix match).
 *
 * Query params:
 * - q: search query (required, min 2 chars)
 * - limit: max results (default 10, max 20)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const rawLimit = parseInt(searchParams.get("limit") ?? "10", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    // Enforce min query length to avoid full table scans
    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Query must be at least ${MIN_QUERY_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Cap limit to prevent abuse
    const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);

    const people = await searchPeople(query, { limit, offset });

    return NextResponse.json({
      people,
      pagination: {
        limit,
        offset,
        count: people.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to search TRR people", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
