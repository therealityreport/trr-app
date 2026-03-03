import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { jobId } = await params;
    const normalizedJobId = String(jobId || "").trim();
    if (!isValidUuid(normalizedJobId)) {
      return NextResponse.json(
        { error: "jobId must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    const rawBody = (await request.json().catch(() => ({}))) as {
      apply_patch?: unknown;
      confirm_apply?: unknown;
      include_context?: unknown;
    };
    const payload = {
      apply_patch: Boolean(rawBody.apply_patch),
      confirm_apply: Boolean(rawBody.confirm_apply),
      include_context: rawBody.include_context === undefined ? true : Boolean(rawBody.include_context),
    };

    const data = await fetchSocialBackendJson(`/ingest/jobs/${normalizedJobId}/debug`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
      },
      fallbackError: "Failed to debug social ingest job",
      retries: 1,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to debug social ingest job");
  }
}
