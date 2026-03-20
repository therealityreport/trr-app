import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const rawBody = (await request.json().catch(() => ({}))) as { stale_after_seconds?: unknown };
    const staleAfterSeconds =
      typeof rawBody.stale_after_seconds === "number" && Number.isFinite(rawBody.stale_after_seconds)
        ? Math.max(5, Math.trunc(rawBody.stale_after_seconds))
        : undefined;

    const data = await fetchSocialBackendJson("/ingest/workers/purge-inactive", {
      method: "POST",
      body: JSON.stringify(
        staleAfterSeconds ? { stale_after_seconds: staleAfterSeconds } : {},
      ),
      headers: {
        "content-type": "application/json",
      },
      fallbackError: "Failed to clear older worker check-ins",
      retries: 1,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });

    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to clear older worker check-ins");
  }
}
