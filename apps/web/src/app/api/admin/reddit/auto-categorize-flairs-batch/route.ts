import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reddit/auto-categorize-flairs-batch
 *
 * Proxy to TRR-Backend batch auto-categorize flairs endpoint.
 * Body: { show_id: UUID }
 * Returns: { communities: [...], total_communities, total_matched, total_flairs }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = (await request.json().catch(() => ({}))) as { show_id?: unknown };
    const showId = body.show_id;
    if (!showId || typeof showId !== "string" || !isValidUuid(showId)) {
      return NextResponse.json({ error: "show_id must be a valid UUID" }, { status: 400 });
    }

    const data = await fetchSocialBackendJson(
      "/reddit/auto-categorize-flairs-batch",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_id: showId }),
        fallbackError: "Failed to batch auto-categorize flairs",
        timeoutMs: 120_000,
        retries: 1,
      },
    );

    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to batch auto-categorize flairs");
  }
}
