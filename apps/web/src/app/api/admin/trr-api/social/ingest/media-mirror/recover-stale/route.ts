import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

const CONFIRM_RECOVERY = "RECOVER MEDIA MIRROR JOBS";
const MEDIA_RECOVERY_STAGES = new Set(["media_mirror", "comment_media_mirror", "all"]);

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const rawBody = (await request.json().catch(() => ({}))) as {
      run_id?: unknown;
      stage?: unknown;
      stale_after_seconds?: unknown;
      recover_limit?: unknown;
      dispatch_limit?: unknown;
      skip_dispatch?: unknown;
      confirm_recovery?: unknown;
    };
    const runId = typeof rawBody.run_id === "string" ? rawBody.run_id.trim() : "";
    const stage = typeof rawBody.stage === "string" ? rawBody.stage.trim() : "media_mirror";
    const confirmRecovery =
      typeof rawBody.confirm_recovery === "string" ? rawBody.confirm_recovery : "";

    if (!isValidUuid(runId)) {
      return NextResponse.json(
        { error: "run_id must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    if (!MEDIA_RECOVERY_STAGES.has(stage)) {
      return NextResponse.json(
        { error: "stage must be media_mirror, comment_media_mirror, or all", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    if (confirmRecovery !== CONFIRM_RECOVERY) {
      return NextResponse.json(
        { error: `confirm_recovery must equal ${CONFIRM_RECOVERY}`, code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    const body = {
      run_id: runId,
      stage,
      stale_after_seconds: Number(rawBody.stale_after_seconds) || 900,
      recover_limit: Number(rawBody.recover_limit) || 5,
      dispatch_limit: Number(rawBody.dispatch_limit) || 8,
      skip_dispatch: Boolean(rawBody.skip_dispatch),
      confirm_recovery: confirmRecovery,
    };

    const data = await fetchSocialBackendJson("/ingest/media-mirror/recover-stale", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
      },
      fallbackError: "Failed to recover stale media mirror jobs",
      retries: 0,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });

    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to recover stale media mirror jobs");
  }
}
