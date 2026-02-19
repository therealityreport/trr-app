import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const BACKEND_TIMEOUT_MS = 20_000;

const formatFetchProxyError = (
  error: unknown,
  context: { backendBase: string | null }
): { error: string; status: number } => {
  const { backendBase } = context;
  const message = error instanceof Error ? error.message : "failed";
  if (message === "unauthorized") return { error: message, status: 401 };
  if (message === "forbidden") return { error: message, status: 403 };
  if (error instanceof Error && error.name === "AbortError") {
    return {
      error: `Unified news request timed out after ${Math.round(BACKEND_TIMEOUT_MS / 1000)}s`,
      status: 504,
    };
  }
  const lower = message.toLowerCase();
  if (lower.includes("fetch failed")) {
    const backendHint = backendBase ?? process.env.TRR_API_URL ?? "<unset>";
    return {
      error: `Backend request failed while loading unified news (TRR_API_URL=${backendHint}). Ensure TRR-Backend is running and reachable.`,
      status: 502,
    };
  }
  return { error: message, status: 500 };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  let backendBase: string | null = null;
  try {
    await requireAdmin(request);
    const { showId } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    backendBase = getBackendApiUrl(`/admin/shows/${showId}/news`);
    if (!backendBase) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const query = request.nextUrl.searchParams.toString();
    const backendUrl = query ? `${backendBase}?${query}` : backendBase;
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
            : "Failed to fetch unified news";
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to fetch unified news", error);
    const mapped = formatFetchProxyError(error, { backendBase });
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
