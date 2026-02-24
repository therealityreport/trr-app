import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; jobId: string }>;
}

const BACKEND_TIMEOUT_MS = 60_000;

const formatFetchProxyError = (
  error: unknown,
  context: { backendUrl: string | null }
): { error: string; status: number } => {
  const { backendUrl } = context;
  const message = error instanceof Error ? error.message : "failed";
  if (message === "unauthorized") return { error: message, status: 401 };
  if (message === "forbidden") return { error: message, status: 403 };
  if (error instanceof Error && error.name === "AbortError") {
    return {
      error: `Google News sync status request timed out after ${Math.round(BACKEND_TIMEOUT_MS / 1000)}s`,
      status: 504,
    };
  }
  if (message.toLowerCase().includes("fetch failed")) {
    const backendHint = backendUrl ?? process.env.TRR_API_URL ?? "<unset>";
    return {
      error: `Backend request failed during Google News sync status check (TRR_API_URL=${backendHint}). Ensure TRR-Backend is running and reachable.`,
      status: 502,
    };
  }
  return { error: message, status: 500 };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  let backendUrl: string | null = null;
  try {
    await requireAdmin(request);
    const { showId, jobId } = await params;
    if (!showId || !jobId) {
      return NextResponse.json({ error: "showId and jobId are required" }, { status: 400 });
    }

    backendUrl = getBackendApiUrl(`/admin/shows/${showId}/google-news/sync/${jobId}`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(backendUrl, {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Failed to fetch Google News sync status";
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to fetch Google News sync status", error);
    const mapped = formatFetchProxyError(error, { backendUrl });
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
