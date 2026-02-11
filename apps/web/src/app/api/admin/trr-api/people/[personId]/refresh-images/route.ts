import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ personId: string }>;
}

const getErrorDetail = (error: unknown): string => {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error instanceof Error) {
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message.trim();
    }
    if (typeof error.name === "string" && error.name.trim()) {
      return error.name.trim();
    }
  }
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage.trim();
    }
    try {
      return JSON.stringify(error);
    } catch {
      // fall through
    }
  }
  if (error == null) return "unknown error (null/undefined)";
  return String(error);
};

const parseBackendPayload = async (
  response: Response
): Promise<{ data: Record<string, unknown>; rawText: string | null }> => {
  const rawText = await response.text().catch(() => "");
  if (!rawText) {
    return { data: {}, rawText: null };
  }
  try {
    return { data: JSON.parse(rawText) as Record<string, unknown>, rawText };
  } catch {
    return { data: {}, rawText };
  }
};

/**
 * POST /api/admin/trr-api/people/[personId]/refresh-images
 *
 * Proxies refresh images request to TRR-Backend for a person.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    // Parse JSON body if provided (optional)
    let body: Record<string, unknown> | undefined;
    if (request.headers.get("content-type")?.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        body = undefined;
      }
    }

    const backendUrl = getBackendApiUrl(`/admin/person/${personId}/refresh-images`);
    const rawBackendUrl = process.env.TRR_API_URL ?? "unset";
    if (!backendUrl) {
      console.error("[person/refresh-images] TRR_API_URL not configured");
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 500 }
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error(
        "[person/refresh-images] TRR_CORE_SUPABASE_SERVICE_ROLE_KEY not configured"
      );
      return NextResponse.json(
        { error: "Backend auth not configured" },
        { status: 500 }
      );
    }

    let backendResponse: Response;
    let data: Record<string, unknown> = {};
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
      try {
        backendResponse = await fetch(backendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(body ?? {}),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      const parsed = await parseBackendPayload(backendResponse);
      data = parsed.data;
      if (
        Object.keys(data).length === 0 &&
        parsed.rawText &&
        !backendResponse.ok
      ) {
        data = { detail: parsed.rawText };
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          {
            error: "Refresh timed out",
            detail: "Timed out waiting for backend person refresh response (10m).",
          },
          { status: 504 }
        );
      }
      const detail = getErrorDetail(error);
      console.error("[person/refresh-images] Backend fetch failed", {
        backendUrl,
        detail,
        error,
      });
      return NextResponse.json(
        { error: "Backend fetch failed", detail: `${detail} (TRR_API_URL=${rawBackendUrl})` },
        { status: 502 }
      );
    }

    if (!backendResponse.ok) {
      const detail =
        typeof data.detail === "string"
          ? data.detail
          : typeof data.error === "string"
            ? data.error
            : undefined;
      const errorMessage =
        typeof data.error === "string"
          ? data.error
          : detail || "Refresh failed";
      return NextResponse.json(
        detail
          ? { error: errorMessage, detail }
          : { error: errorMessage },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to refresh person images", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
