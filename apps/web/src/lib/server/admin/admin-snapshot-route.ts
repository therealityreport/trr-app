import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { buildAdminReadResponseHeaders } from "@/lib/server/trr-api/admin-read-proxy";

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
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.detail === "string"
          ? payload.detail
          : fallbackMessage,
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
