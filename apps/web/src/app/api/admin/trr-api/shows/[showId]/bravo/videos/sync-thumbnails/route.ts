import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const BACKEND_TIMEOUT_MS = 15 * 60_000;

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
      error: `Bravo video thumbnail sync request timed out after ${Math.round(BACKEND_TIMEOUT_MS / 1000)}s`,
      status: 504,
    };
  }
  if (message.toLowerCase().includes("fetch failed")) {
    const backendHint = backendUrl ?? process.env.TRR_API_URL ?? "<unset>";
    return {
      error: `Backend request failed during Bravo video thumbnail sync (TRR_API_URL=${backendHint}). Ensure TRR-Backend is running and reachable.`,
      status: 502,
    };
  }
  return { error: message, status: 500 };
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  let backendUrl: string | null = null;
  try {
    await requireAdmin(request);
    const { showId } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    backendUrl = getBackendApiUrl(`/admin/shows/${showId}/bravo/videos/sync-thumbnails`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(body),
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
            : "Failed to sync Bravo video thumbnails";
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to sync Bravo video thumbnails", error);
    const mapped = formatFetchProxyError(error, { backendUrl });
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
