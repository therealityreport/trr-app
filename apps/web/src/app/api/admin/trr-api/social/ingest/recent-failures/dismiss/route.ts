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
    const normalizedJobIds = (Array.isArray(rawBody.job_ids) ? rawBody.job_ids : [])
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);

    if (normalizedJobIds.length === 0) {
      return NextResponse.json(
        { error: "job_ids must contain at least one valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    if (normalizedJobIds.some((jobId) => !isValidUuid(jobId))) {
      return NextResponse.json(
        { error: "job_ids must contain valid UUID values", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    const data = await fetchSocialBackendJson("/ingest/recent-failures/dismiss", {
      method: "POST",
      body: JSON.stringify({ job_ids: normalizedJobIds }),
      headers: {
        "content-type": "application/json",
      },
      fallbackError: "Failed to dismiss recent failures",
      retries: 1,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });

    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to dismiss recent failures");
  }
}
