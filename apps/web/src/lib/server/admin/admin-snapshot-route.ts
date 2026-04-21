import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { buildAdminReadResponseHeaders } from "@/lib/server/trr-api/admin-read-proxy";
import { SocialProxyError, type ProxyErrorCode } from "@/lib/server/trr-api/social-admin-proxy";

export type AdminSnapshotEnvelope<T extends Record<string, unknown>> = {
  data: T;
  generated_at: string;
  cache_age_ms: number;
  stale: boolean;
};

export const buildSnapshotSubrequest = (
  request: NextRequest,
  pathname: string,
  searchParams?: URLSearchParams,
): NextRequest => {
  const url = new URL(pathname, request.url);
  if (searchParams && Array.from(searchParams.keys()).length > 0) {
    url.search = searchParams.toString();
  }
  return new NextRequest(url, {
    method: "GET",
    headers: request.headers,
  });
};

export const readRouteJsonOrThrow = async <T,>(response: Response, fallbackMessage: string): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const payloadCode = typeof payload.code === "string" ? payload.code.trim() : "";
    const code: ProxyErrorCode =
      payloadCode === "UNAUTHORIZED" ||
      payloadCode === "FORBIDDEN" ||
      payloadCode === "BAD_REQUEST" ||
      payloadCode === "SEASON_NOT_FOUND" ||
      payloadCode === "BACKEND_SATURATED" ||
      payloadCode === "BACKEND_UNREACHABLE" ||
      payloadCode === "UPSTREAM_TIMEOUT" ||
      payloadCode === "UPSTREAM_ERROR" ||
      payloadCode === "BACKEND_REQUEST_TIMEOUT" ||
      payloadCode === "INTERNAL_ERROR"
        ? payloadCode
        : response.status === 401
          ? "UNAUTHORIZED"
          : response.status === 403
            ? "FORBIDDEN"
            : response.status === 400
              ? "BAD_REQUEST"
              : response.status === 404
                ? "UPSTREAM_ERROR"
                : response.status === 504
                  ? "UPSTREAM_TIMEOUT"
                  : "INTERNAL_ERROR";
    throw new SocialProxyError(
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.detail === "string"
          ? payload.detail
          : fallbackMessage,
      {
        status: response.status,
        code,
        retryable: Boolean(payload.retryable),
        retryAfterSeconds:
          typeof payload.retry_after_seconds === "number" && Number.isFinite(payload.retry_after_seconds)
            ? payload.retry_after_seconds
            : undefined,
        traceId: typeof payload.trace_id === "string" ? payload.trace_id : undefined,
        upstreamStatus:
          typeof payload.upstream_status === "number" && Number.isFinite(payload.upstream_status)
            ? payload.upstream_status
            : response.status,
        upstreamDetail: "upstream_detail" in payload ? payload.upstream_detail : payload.detail,
        upstreamDetailCode: typeof payload.upstream_detail_code === "string" ? payload.upstream_detail_code : undefined,
      },
    );
  }
  return payload as T;
};

export const buildSnapshotResponse = <T extends Record<string, unknown>>(input: {
  data: T;
  cacheStatus: "hit" | "miss" | "refresh";
  generatedAt: string;
  cacheAgeMs: number;
  stale: boolean;
}): NextResponse => {
  return NextResponse.json(
    {
      data: input.data,
      generated_at: input.generatedAt,
      cache_age_ms: input.cacheAgeMs,
      stale: input.stale,
    } satisfies AdminSnapshotEnvelope<T>,
    {
      headers: {
        ...buildAdminReadResponseHeaders({ cacheStatus: input.cacheStatus }),
        "x-trr-generated-at": input.generatedAt,
        "x-trr-cache-age-ms": String(input.cacheAgeMs),
        "x-trr-cache-stale": input.stale ? "1" : "0",
      },
    },
  );
};
