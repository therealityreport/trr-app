import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { communityId } = await params;
    if (!communityId || !isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const scope = request.nextUrl.searchParams.get("scope") === "all" ? "all" : "season";
    const seasonId = request.nextUrl.searchParams.get("season_id");
    if (scope === "season" && (!seasonId || !isValidUuid(seasonId))) {
      return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
    }

    const query = new URLSearchParams();
    query.set("scope", scope);
    if (seasonId) query.set("season_id", seasonId);

    const payload = await fetchSocialBackendJson(`/reddit/analytics/community/${communityId}/summary`, {
      queryString: query.toString(),
      fallbackError: "Failed to fetch reddit analytics summary",
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
      retries: 1,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch reddit analytics summary via TRR-Backend");
  }
}
