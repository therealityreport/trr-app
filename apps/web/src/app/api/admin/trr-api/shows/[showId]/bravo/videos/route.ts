import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  isTimeoutSafeFetchTimeoutError,
  timeoutSafeFetch,
} from "@/lib/server/timeout-safe-fetch";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

type BackendJsonResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
};

const inFlightBackendJson = new Map<string, Promise<BackendJsonResult>>();
const BRAVO_VIDEOS_READ_TIMEOUT_MS = 8_000;

const fetchBravoVideosBackendJson = async (backendUrl: string, token: string): Promise<BackendJsonResult> => {
  const requestKey = `${backendUrl}|${token}`;
  const existing = inFlightBackendJson.get(requestKey);
  if (existing) return existing;

  const request = timeoutSafeFetch(backendUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    timeoutMs: BRAVO_VIDEOS_READ_TIMEOUT_MS,
    timeoutName: "bravo-videos-read",
  })
    .then(async (response) => ({
      ok: response.ok,
      status: response.status,
      data: (await response.json().catch(() => ({}))) as Record<string, unknown>,
    }))
    .catch((error) => {
      if (isTimeoutSafeFetchTimeoutError(error)) {
        return {
          ok: false,
          status: 504,
          data: { detail: { code: "REQUEST_TIMEOUT", retryable: true } },
        };
      }
      throw error;
    })
    .finally(() => {
      if (inFlightBackendJson.get(requestKey) === request) {
        inFlightBackendJson.delete(requestKey);
      }
    });
  inFlightBackendJson.set(requestKey, request);
  return request;
};

const shouldRetryWithoutPersonMerge = (
  response: Pick<BackendJsonResult, "status">,
  searchParams: URLSearchParams,
  data: Record<string, unknown>,
): boolean => {
  if (response.status !== 504) return false;
  if (searchParams.get("merge_person_sources") === "false") return false;
  if (searchParams.has("person_id")) return false;

  const detail = data.detail && typeof data.detail === "object" ? data.detail as Record<string, unknown> : null;
  const code = typeof data.code === "string" ? data.code : typeof detail?.code === "string" ? detail.code : "";
  const retryable = data.retryable === true || detail?.retryable === true;
  return retryable || code === "REQUEST_TIMEOUT" || code === "BACKEND_TIMEOUT" || code === "BACKEND_REQUEST_TIMEOUT";
};

const shouldDegradeUnavailableVideos = (
  response: Pick<BackendJsonResult, "status">,
  searchParams: URLSearchParams,
): boolean => {
  if (response.status !== 404 && response.status !== 504) return false;
  if (searchParams.has("person_id")) return false;
  return true;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const backendBase = getBackendApiUrl(`/admin/shows/${showId}/bravo/videos`);
    if (!backendBase) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const query = searchParams.toString();
    const backendUrl = query ? `${backendBase}?${query}` : backendBase;

    let response = await fetchBravoVideosBackendJson(backendUrl, serviceRoleKey);
    let usedFallback = false;

    let data = response.data;
    if (shouldRetryWithoutPersonMerge(response, searchParams, data)) {
      searchParams.set("merge_person_sources", "false");
      const fallbackQuery = searchParams.toString();
      const fallbackUrl = fallbackQuery ? `${backendBase}?${fallbackQuery}` : backendBase;
      response = await fetchBravoVideosBackendJson(fallbackUrl, serviceRoleKey);
      data = response.data;
      usedFallback = response.ok;
    }
    if (!response.ok && shouldDegradeUnavailableVideos(response, searchParams)) {
      return NextResponse.json(
        {
          videos: [],
          items: [],
          degraded: true,
          degraded_reason: response.status === 504 ? "backend_timeout" : "backend_unavailable",
        },
        {
          headers: {
            "x-trr-bravo-videos-source":
              response.status === 504 ? "backend-timeout-degraded" : "backend-unavailable-degraded",
          },
        },
      );
    }
    if (!response.ok) {
      const error =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Failed to fetch bravo videos";
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(data, {
      headers: usedFallback
        ? {
            "x-trr-bravo-videos-source": "backend-no-person-merge-fallback",
          }
        : undefined,
    });
  } catch (error) {
    console.error("[api] Failed to fetch bravo videos", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
