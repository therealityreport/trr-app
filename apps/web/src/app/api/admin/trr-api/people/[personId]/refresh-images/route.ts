import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import {
  readGettyPrefetchPayload,
} from "@/lib/server/admin/getty-local-scrape";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

interface RouteParams {
  params: Promise<{ personId: string }>;
}

const BACKEND_REFRESH_TIMEOUT_MS = 12 * 60 * 1000;

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

const hydrateGettyPrefetchPayload = async (rawBody: string): Promise<string> => {
  const parsed = JSON.parse(rawBody) as Record<string, unknown>;
  const prefetchToken =
    typeof parsed.getty_prefetch_token === "string" ? parsed.getty_prefetch_token.trim() : "";
  if (!prefetchToken) {
    return rawBody;
  }
  if (Array.isArray(parsed.getty_prefetched_assets) || Array.isArray(parsed.getty_prefetched_events)) {
    return rawBody;
  }

  const stored = await readGettyPrefetchPayload(prefetchToken);
  if (!stored) {
    throw new Error("Getty prefetch payload expired before the backend request started.");
  }

  const prefetchMode =
    typeof stored.prefetch_mode === "string" ? stored.prefetch_mode.trim() : "";
  parsed.getty_prefetched_assets =
    prefetchMode === "discovery" && Array.isArray(stored.discovery_manifest)
      ? stored.discovery_manifest
      : Array.isArray(stored.merged)
        ? stored.merged
        : [];
  parsed.getty_prefetched_events =
    prefetchMode === "discovery" ? [] : Array.isArray(stored.merged_events) ? stored.merged_events : [];
  parsed.getty_prefetched_queries = Array.isArray(stored.query_summaries) ? stored.query_summaries : [];
  parsed.getty_prefetch_auth_mode =
    typeof stored.auth_mode === "string" ? stored.auth_mode : undefined;
  parsed.getty_prefetch_auth_warning =
    typeof stored.auth_warning === "string" ? stored.auth_warning : undefined;
  parsed.getty_prefetch_mode = prefetchMode || undefined;
  parsed.getty_deferred_enrichment = stored.enrichment_status === "pending";
  parsed.getty_deferred_editorial_ids = Array.isArray(stored.deferred_editorial_ids)
    ? stored.deferred_editorial_ids
    : [];
  delete parsed.getty_prefetch_token;
  return JSON.stringify(parsed);
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
    let bodyText = "";
    if (request.headers.get("content-type")?.includes("application/json")) {
      bodyText = await request.text().catch(() => "");
      if (!bodyText.trim()) {
        bodyText = "{}";
      } else {
        bodyText = await hydrateGettyPrefetchPayload(bodyText);
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
      const timeout = setTimeout(() => controller.abort(), BACKEND_REFRESH_TIMEOUT_MS);
      try {
        backendResponse = await fetch(backendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: bodyText || "{}",
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
            detail: "Timed out waiting for backend person refresh response (12m).",
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
