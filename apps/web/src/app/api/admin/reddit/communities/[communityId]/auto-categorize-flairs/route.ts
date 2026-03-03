import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

/**
 * POST /api/admin/reddit/communities/[communityId]/auto-categorize-flairs
 *
 * Proxy to TRR-Backend auto-categorize flairs endpoint for a single community.
 * Body: { show_id: UUID }
 * Returns: { categories: Record<string, string>, matched: number, total: number }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { communityId } = await params;
    if (!communityId) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }
    if (!isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as { show_id?: unknown };
    const showId = body.show_id;
    if (!showId || typeof showId !== "string" || !isValidUuid(showId)) {
      return NextResponse.json({ error: "show_id must be a valid UUID" }, { status: 400 });
    }

    const data = await fetchSocialBackendJson(
      `/reddit/communities/${communityId}/auto-categorize-flairs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_id: showId }),
        fallbackError: "Failed to auto-categorize flairs",
        timeoutMs: 60_000,
        retries: 1,
      },
    );

    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to auto-categorize flairs for community");
  }
}
