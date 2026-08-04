import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import { buildAdminProxyErrorResponse } from "@/lib/server/trr-api/admin-read-proxy";
import { parseBoundedIntegerParam } from "@/lib/server/trr-api/query-integer-params";
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
    const user = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const limitResult = parseBoundedIntegerParam(searchParams.get("limit"), {
      name: "limit",
      defaultValue: 10,
      min: 1,
      max: MAX_LIMIT,
    });
    if (!limitResult.ok) {
      return NextResponse.json({ error: limitResult.error }, { status: 400 });
    }
    const offsetResult = parseBoundedIntegerParam(searchParams.get("offset"), {
      name: "offset",
      defaultValue: 0,
      min: 0,
    });
    if (!offsetResult.ok) {
      return NextResponse.json({ error: offsetResult.error }, { status: 400 });
    }

    // Enforce min query length to avoid full table scans
    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Query must be at least ${MIN_QUERY_LENGTH} characters` },
        { status: 400 }
      );
    }

    const limit = limitResult.value;
    const offset = offsetResult.value;

    const people = await searchPeople(query, {
      limit,
      offset,
      adminContext: toVerifiedAdminContext(user),
    });

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
    return buildAdminProxyErrorResponse(error);
  }
}
