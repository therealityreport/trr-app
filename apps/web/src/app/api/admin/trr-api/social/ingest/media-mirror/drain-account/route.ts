import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

const CONFIRM_DRAIN = "DRAIN BRAVO MEDIA";
const MEDIA_DRAIN_STAGES = new Set(["media_mirror", "comment_media_mirror", "all"]);

const normalizePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const rawBody = (await request.json().catch(() => ({}))) as {
      run_id?: unknown;
      account_handle?: unknown;
      stage?: unknown;
      recover_limit?: unknown;
      dispatch_limit?: unknown;
      confirm_drain?: unknown;
    };
    const runId = typeof rawBody.run_id === "string" ? rawBody.run_id.trim() : "";
    const accountHandle =
      typeof rawBody.account_handle === "string"
        ? rawBody.account_handle.trim().replace(/^@/, "")
        : "";
    const stage = typeof rawBody.stage === "string" ? rawBody.stage.trim() : "media_mirror";
    const confirmDrain = typeof rawBody.confirm_drain === "string" ? rawBody.confirm_drain : "";

    if (!isValidUuid(runId)) {
      return NextResponse.json(
        { error: "run_id must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    if (!accountHandle) {
      return NextResponse.json(
        { error: "account_handle is required", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    if (!MEDIA_DRAIN_STAGES.has(stage)) {
      return NextResponse.json(
        { error: "stage must be media_mirror, comment_media_mirror, or all", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    if (confirmDrain !== CONFIRM_DRAIN) {
      return NextResponse.json(
        { error: `confirm_drain must equal ${CONFIRM_DRAIN}`, code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    const body = {
      run_id: runId,
      account_handle: accountHandle,
      stage,
      recover_limit: normalizePositiveInt(rawBody.recover_limit, 25),
      dispatch_limit: normalizePositiveInt(rawBody.dispatch_limit, 8),
      confirm_drain: confirmDrain,
    };

    const data = await fetchSocialBackendJson("/ingest/media-mirror/drain-account", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
      },
      fallbackError: "Failed to drain Bravo media mirror jobs",
      retries: 0,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });

    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to drain Bravo media mirror jobs");
  }
}
