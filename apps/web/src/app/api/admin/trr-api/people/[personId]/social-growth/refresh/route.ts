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
export const maxDuration = 300; // 5 minutes — Modal scrape can take a while

const SOCIALBLADE_REFRESH_TIMEOUT_MS = 210_000;

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * POST /api/admin/trr-api/people/[personId]/social-growth/refresh
 *
 * Proxy to TRR-Backend which dispatches a SocialBlade scrape via Modal,
 * merges with existing data, and persists to Supabase.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;
    if (!personId) {
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const handle = (typeof body.handle === "string" ? body.handle : "").trim();
    const force = Boolean(body.force);
    const sourceScope = typeof body.source_scope === "string" ? body.source_scope : undefined;
    if (!handle) {
      return NextResponse.json({ error: "handle is required in request body" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(`/admin/people/${personId}/socialblade/refresh`);
    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend API not configured (TRR_API_URL)" },
        { status: 502 }
      );
    }

    let headers: Headers;
    try {
      headers = buildInternalAdminHeaders({
        "Content-Type": "application/json",
      });
    } catch {
      return NextResponse.json(
        { error: "Backend auth not configured" },
        { status: 502 }
      );
    }

    const upstream = await timeoutSafeFetch(backendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        handle,
        force,
        ...(sourceScope !== undefined ? { source_scope: sourceScope } : {}),
      }),
      timeoutMs: SOCIALBLADE_REFRESH_TIMEOUT_MS,
      timeoutName: "socialblade-refresh",
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
      return buildSocialBladeTimeoutResponse(error, SOCIALBLADE_REFRESH_TIMEOUT_MS);
    }
    console.error("[api] Failed to refresh social growth data", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
