import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

const parsePositiveInt = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const communityId = request.nextUrl.searchParams.get("community_id");
    const seasonId = request.nextUrl.searchParams.get("season_id");
    const periodKey = request.nextUrl.searchParams.get("period_key");
    const status = request.nextUrl.searchParams.get("status");
    const limit = Math.min(parsePositiveInt(request.nextUrl.searchParams.get("limit"), 25), 100);

    if (communityId && !isValidUuid(communityId)) {
      return NextResponse.json({ error: "community_id must be a valid UUID" }, { status: 400 });
    }
    if (seasonId && !isValidUuid(seasonId)) {
      return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
    }

    const query = new URLSearchParams();
    if (communityId) query.set("community_id", communityId);
    if (seasonId) query.set("season_id", seasonId);
    if (periodKey) query.set("period_key", periodKey);
    if (status) query.set("status", status);
    query.set("limit", String(limit));

    const payload = await fetchSocialBackendJson("/reddit/runs", {
      queryString: query.toString(),
      fallbackError: "Failed to list reddit refresh runs",
      timeoutMs: 20_000,
      retries: 1,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to list reddit refresh runs via TRR-Backend");
  }
}
