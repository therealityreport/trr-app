import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { buildInternalAdminHeaders } from "@/lib/server/trr-api/internal-admin-auth";
import {
  isTimeoutSafeFetchTimeoutError,
  timeoutSafeFetch,
} from "@/lib/server/timeout-safe-fetch";
import {
  buildSocialBladeBackendErrorPayload,
  buildSocialBladeTimeoutResponse,
} from "@/lib/server/trr-api/socialblade-proxy";

export const dynamic = "force-dynamic";

const SOCIALBLADE_CALL_STATUS_TIMEOUT_MS = 15_000;

interface RouteParams {
  params: Promise<{ callId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { callId } = await params;
    const safeCallId = String(callId || "").trim();
    if (!safeCallId) {
      return NextResponse.json({ error: "callId is required" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(
      `/admin/people/socialblade/calls/${encodeURIComponent(safeCallId)}`
    );
    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend API not configured (TRR_API_URL)" },
        { status: 502 }
      );
    }

    let headers: Headers;
    try {
      headers = buildInternalAdminHeaders();
    } catch {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 502 });
    }

    const upstream = await timeoutSafeFetch(backendUrl, {
      headers,
      timeoutMs: SOCIALBLADE_CALL_STATUS_TIMEOUT_MS,
      timeoutName: "socialblade-call-status",
    });
    const data = await upstream.json().catch(() => ({ error: "Invalid response from backend" }));

    if (!upstream.ok) {
      return NextResponse.json(
        buildSocialBladeBackendErrorPayload(data, `Backend returned ${upstream.status}`),
        { status: upstream.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (isTimeoutSafeFetchTimeoutError(error)) {
      return buildSocialBladeTimeoutResponse(error, SOCIALBLADE_CALL_STATUS_TIMEOUT_MS);
    }
    console.error("[api] Failed to get SocialBlade call status", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
