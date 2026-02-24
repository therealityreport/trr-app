import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

const SYNC_TIMEOUT_MS = 900_000;

interface SyncRequestBody {
  force?: boolean;
  skip_s3?: boolean;
  dry_run?: boolean;
  unresolved_only?: boolean;
  refresh_external_sources?: boolean;
  batch_size?: number;
  max_runtime_sec?: number;
  resume_run_id?: string;
  limit?: number;
}

const fetchJsonWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response: Response; data: Record<string, unknown> }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
};

const sanitizeBody = (body: unknown): SyncRequestBody => {
  if (!body || typeof body !== "object") return {};

  const source = body as Record<string, unknown>;
  const limitRaw = source.limit;
  const limit =
    typeof limitRaw === "number" && Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(5000, Math.floor(limitRaw)))
      : undefined;
  const batchSizeRaw = source.batch_size;
  const batchSize =
    typeof batchSizeRaw === "number" && Number.isFinite(batchSizeRaw)
      ? Math.max(1, Math.min(500, Math.floor(batchSizeRaw)))
      : undefined;
  const maxRuntimeRaw = source.max_runtime_sec;
  const maxRuntimeSec =
    typeof maxRuntimeRaw === "number" && Number.isFinite(maxRuntimeRaw)
      ? Math.max(60, Math.min(3600, Math.floor(maxRuntimeRaw)))
      : undefined;
  const resumeRunId =
    typeof source.resume_run_id === "string" && source.resume_run_id.trim().length > 0
      ? source.resume_run_id.trim()
      : undefined;

  return {
    ...(typeof source.force === "boolean" ? { force: source.force } : {}),
    ...(typeof source.skip_s3 === "boolean" ? { skip_s3: source.skip_s3 } : {}),
    ...(typeof source.dry_run === "boolean" ? { dry_run: source.dry_run } : {}),
    ...(typeof source.unresolved_only === "boolean" ? { unresolved_only: source.unresolved_only } : {}),
    ...(typeof source.refresh_external_sources === "boolean"
      ? { refresh_external_sources: source.refresh_external_sources }
      : {}),
    ...(batchSize !== undefined ? { batch_size: batchSize } : {}),
    ...(maxRuntimeSec !== undefined ? { max_runtime_sec: maxRuntimeSec } : {}),
    ...(resumeRunId !== undefined ? { resume_run_id: resumeRunId } : {}),
    ...(limit !== undefined ? { limit } : {}),
  };
};

/**
 * POST /api/admin/networks-streaming/sync
 *
 * Proxies manual networks/providers sync to TRR-Backend orchestration endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const backendUrl = getBackendApiUrl("/admin/shows/sync-networks-streaming");
    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 500 },
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Backend auth not configured" },
        { status: 500 },
      );
    }

    const body =
      request.headers.get("content-type")?.includes("application/json")
        ? sanitizeBody(await request.json().catch(() => ({})))
        : {};

    let backendResponse: Response;
    let data: Record<string, unknown> = {};
    try {
      const out = await fetchJsonWithTimeout(
        backendUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(body),
        },
        SYNC_TIMEOUT_MS,
      );
      backendResponse = out.response;
      data = out.data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          {
            error: "Sync/Mirror timed out",
            detail: "Timed out waiting for backend networks/streaming sync response (15m).",
          },
          { status: 504 },
        );
      }

      const detail = error instanceof Error ? error.message : "unknown error";
      return NextResponse.json(
        {
          error: "Backend fetch failed",
          detail: `${detail} (TRR_API_URL=${process.env.TRR_API_URL ?? "unset"})`,
        },
        { status: 502 },
      );
    }

    if (!backendResponse.ok) {
      const errorMessage =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Sync/Mirror failed";
      const detail = typeof data.detail === "string" ? data.detail : undefined;
      return NextResponse.json(
        detail ? { error: errorMessage, detail } : { error: errorMessage },
        { status: backendResponse.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to sync networks/streaming", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
