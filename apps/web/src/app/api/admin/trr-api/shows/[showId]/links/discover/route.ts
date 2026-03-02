import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { isRetryableSseNetworkError, normalizeSseProxyError } from "@/lib/server/sse-proxy";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BACKEND_DISCOVER_TIMEOUT_MS = 10 * 60 * 1000;
const BACKEND_FETCH_ATTEMPTS = 2;

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const getErrorDetail = (error: unknown): string =>
  normalizeSseProxyError(error, { timeoutMs: BACKEND_DISCOVER_TIMEOUT_MS }).detail;

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId } = await params;

    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/links/discover`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    let response: Response | null = null;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= BACKEND_FETCH_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BACKEND_DISCOVER_TIMEOUT_MS);
      try {
        const nextResponse = await fetch(backendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
          cache: "no-store",
        });
        if (nextResponse.ok || nextResponse.status < 500 || attempt >= BACKEND_FETCH_ATTEMPTS) {
          response = nextResponse;
          break;
        }
      } catch (error) {
        lastError = error;
        if (!isRetryableSseNetworkError(error) || attempt >= BACKEND_FETCH_ATTEMPTS) {
          break;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    if (!response) {
      return NextResponse.json(
        {
          error: "Backend discover request failed",
          reason: "request_abort",
          detail: getErrorDetail(lastError),
        },
        { status: 502 }
      );
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return NextResponse.json(
        {
          error: (typeof data.error === "string" && data.error) || "Failed to discover links",
          detail: typeof data.detail === "string" ? data.detail : undefined,
          reason: typeof data.reason === "string" ? data.reason : "server_processing_timeout",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
