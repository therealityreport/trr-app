import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

const toOptionalHeaderValue = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as {
      community_id?: string;
      season_id?: string;
      container_keys?: unknown;
      mode?: "sync_posts" | "sync_details" | "sync_full";
      detail_refresh?: boolean;
    };

    if (!body.community_id || !isValidUuid(body.community_id)) {
      return NextResponse.json({ error: "community_id must be a valid UUID" }, { status: 400 });
    }
    if (!body.season_id || !isValidUuid(body.season_id)) {
      return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
    }

    const payload = {
      community_id: body.community_id,
      season_id: body.season_id,
      container_keys: Array.isArray(body.container_keys)
        ? body.container_keys.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [],
      mode:
        body.mode === "sync_posts" || body.mode === "sync_details" || body.mode === "sync_full"
          ? body.mode
          : "sync_full",
      detail_refresh: body.detail_refresh === true,
    };

    const requestId = toOptionalHeaderValue(request.headers.get("x-trr-request-id"));
    const tabSessionId = toOptionalHeaderValue(request.headers.get("x-trr-tab-session-id"));
    const flowKey = toOptionalHeaderValue(request.headers.get("x-trr-flow-key"));

    const data = await fetchSocialBackendJson("/reddit/runs/backfill", {
      method: "POST",
      body: JSON.stringify(payload),
      fallbackError: "Failed to backfill reddit refresh runs",
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
      retries: 1,
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "x-trr-request-id": requestId } : {}),
        ...(tabSessionId ? { "x-trr-tab-session-id": tabSessionId } : {}),
        ...(flowKey ? { "x-trr-flow-key": flowKey } : {}),
      },
    });
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to backfill reddit refresh runs via TRR-Backend");
  }
}
