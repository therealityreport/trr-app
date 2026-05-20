import "server-only";

import {
  AdminReadProxyError,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";

export type StableRedditReadResult<T> = {
  payload: T;
  source: "backend" | "local";
  upstreamStatus?: number;
  backendLatencyMs?: number;
};

type StableRedditReadOptions<T> = {
  backendPath: string;
  routeName: string;
  queryString?: string;
  timeoutMs?: number;
  fallback: () => Promise<T>;
  allowFallbackStatusCodes?: number[];
};

const DEFAULT_FALLBACK_STATUS_CODES = new Set([404, 501, 502, 503, 504]);

const normalizeStatusCodes = (codes?: number[]): Set<number> => {
  if (!codes || codes.length === 0) return DEFAULT_FALLBACK_STATUS_CODES;
  return new Set(codes.filter((code) => Number.isFinite(code)));
};

export async function loadStableRedditRead<T>(
  options: StableRedditReadOptions<T>,
): Promise<StableRedditReadResult<T>> {
  const fallbackStatusCodes = normalizeStatusCodes(options.allowFallbackStatusCodes);

  let upstream;
  try {
    upstream = await fetchAdminBackendJson(options.backendPath, {
      queryString: options.queryString,
      timeoutMs: options.timeoutMs,
      routeName: options.routeName,
    });
  } catch (error) {
    if (error instanceof AdminReadProxyError && fallbackStatusCodes.has(error.status)) {
      const payload = await options.fallback();
      return {
        payload,
        source: "local",
        upstreamStatus: error.status,
      };
    }
    throw error;
  }

  if (upstream.status === 200) {
    return {
      payload: upstream.data as T,
      source: "backend",
      upstreamStatus: upstream.status,
      backendLatencyMs: upstream.durationMs,
    };
  }

  if (!fallbackStatusCodes.has(upstream.status)) {
    const message =
      typeof upstream.data.error === "string"
        ? upstream.data.error
        : typeof upstream.data.detail === "string"
          ? upstream.data.detail
          : `Failed to load ${options.routeName}`;
    throw new Error(message);
  }

  const payload = await options.fallback();
  return {
    payload,
    source: "local",
    upstreamStatus: upstream.status,
    backendLatencyMs: upstream.durationMs,
  };
}
