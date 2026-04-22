import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const rawBody = (await request.json().catch(() => ({}))) as { job_ids?: unknown };
    const rawJobIds = Array.isArray(rawBody.job_ids) ? rawBody.job_ids : [];
    const normalizedJobIds = rawJobIds
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);

    if (normalizedJobIds.some((jobId) => !isValidUuid(jobId))) {
      return NextResponse.json(
        { error: "job_ids must contain valid UUID values", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    const data = await fetchSocialBackendJson("/ingest/stuck-jobs/cancel", {
      method: "POST",
      body: JSON.stringify({ job_ids: normalizedJobIds }),
      headers: {
        "content-type": "application/json",
      },
      fallbackError: "Failed to cancel stuck jobs",
      retries: 0,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });

    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to cancel stuck jobs");
  }
}
