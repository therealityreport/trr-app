import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { runId } = await params;
    if (!runId || !isValidUuid(runId)) {
      return NextResponse.json({ error: "runId must be a valid UUID" }, { status: 400 });
    }

    const run = await fetchSocialBackendJson(`/reddit/runs/${runId}`, {
      fallbackError: "Failed to fetch reddit refresh run status",
      timeoutMs: 20_000,
      retries: 1,
    });
    return NextResponse.json(run);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch reddit refresh run status via TRR-Backend");
  }
}

