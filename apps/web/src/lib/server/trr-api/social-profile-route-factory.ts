import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type AuthenticatedUser } from "@/lib/server/auth";
import {
  buildAdminAuthPartition,
  buildAdminSnapshotCacheKey,
  getOrCreateAdminSnapshot,
} from "@/lib/server/admin/admin-snapshot-cache";
import { attachAdminRouteTiming } from "@/lib/server/admin/admin-route-timing";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getStaleRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import { buildAdminReadResponseHeaders } from "@/lib/server/trr-api/admin-read-proxy";
import { adminJsonResponse } from "@/lib/server/trr-api/local-api-document-response";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

export const SOCIAL_PROFILE_READ_TIMEOUT_MS = 30_000;

type SocialProfileParams = {
  platform: string;
  handle: string;
};

export type SocialProfileRouteContext = {
  params: Promise<SocialProfileParams>;
};

type SocialProfileProxyRouteInput = {
  request: NextRequest;
  user: AuthenticatedUser;
  params: SocialProfileParams;
  backendPath: string;
  backendSearchParams: URLSearchParams;
};

type QueryStringMode =
  | "forward"
  | "none"
  | "strip-refresh"
  | ((input: SocialProfileProxyRouteInput) => string | undefined);

type TimeoutMs =
  | number
  | ((input: SocialProfileProxyRouteInput) => number);

type HeadersFactory =
  | HeadersInit
  | ((input: SocialProfileProxyRouteInput) => HeadersInit | undefined);

type RouteResponseCacheConfig = {
  kind: "route-response";
  namespace: string;
  ttlMs: number;
  staleTtlMs?: number;
  scope: string | ((params: SocialProfileParams) => string);
};

type AdminSnapshotCacheConfig = {
  kind: "admin-snapshot";
  pageFamily: string;
  scope: string | ((params: SocialProfileParams) => string);
  ttlMs: number;
  staleIfErrorTtlMs: number;
  cacheKeyQuery?: "backend" | "request" | "none";
  forceRefreshParam?: string;
};

type SocialProfileProxyRouteConfig = {
  endpoint: string;
  fallbackError: string;
  logLabel: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  retries?: number;
  timeoutMs?: TimeoutMs;
  queryString?: QueryStringMode;
  headers?: HeadersFactory;
  forwardBody?: boolean;
  bodyFallback?: string;
  forwardAdminContext?: boolean;
  cache?: RouteResponseCacheConfig | AdminSnapshotCacheConfig;
  routeTimingHeaders?: boolean;
  invalidateCache?: (input: SocialProfileProxyRouteInput & { data: Record<string, unknown> }) => void | Promise<void>;
};

type SocialProfileReadRouteConfig = Omit<SocialProfileProxyRouteConfig, "method" | "forwardBody">;

const resolveRouteScope = (
  scope: string | ((params: SocialProfileParams) => string),
  params: SocialProfileParams,
): string => (typeof scope === "function" ? scope(params) : scope);

const toVerifiedAdminContext = (user: Pick<AuthenticatedUser, "uid" | "email">): VerifiedAdminContext => ({
  uid: user.uid,
  email: typeof user.email === "string" && user.email.trim() ? user.email.trim() : null,
  verifiedAt: Date.now(),
});

const cloneSearchParams = (request: NextRequest): URLSearchParams =>
  new URLSearchParams(request.nextUrl.searchParams);

const stripRefreshParam = (searchParams: URLSearchParams, refreshParam = "refresh"): URLSearchParams => {
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.delete(refreshParam);
  return nextSearchParams;
};

const readForceRefresh = (searchParams: URLSearchParams, refreshParam = "refresh"): boolean =>
  (searchParams.get(refreshParam) ?? "").trim().length > 0;

const normalizeEndpoint = (endpoint: string): string => endpoint.replace(/^\/+|\/+$/g, "");

export const buildSocialProfileBackendPath = (params: SocialProfileParams, endpoint: string): string => {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  return [
    "/profiles",
    encodeURIComponent(params.platform),
    encodeURIComponent(params.handle),
    normalizedEndpoint,
  ]
    .filter(Boolean)
    .join("/");
};

const resolveBackendSearchParams = (
  request: NextRequest,
  queryString: QueryStringMode | undefined,
): URLSearchParams => {
  const requestSearchParams = cloneSearchParams(request);
  if (queryString === "strip-refresh") {
    return stripRefreshParam(requestSearchParams);
  }
  return requestSearchParams;
};

const resolveQueryString = (
  input: SocialProfileProxyRouteInput,
  queryString: QueryStringMode | undefined,
): string | undefined => {
  if (typeof queryString === "function") {
    return queryString(input);
  }
  if (queryString === "none") {
    return undefined;
  }
  return input.backendSearchParams.toString();
};

const resolveTimeoutMs = (
  input: SocialProfileProxyRouteInput,
  timeoutMs: TimeoutMs | undefined,
): number => {
  if (typeof timeoutMs === "function") {
    return timeoutMs(input);
  }
  return timeoutMs ?? SOCIAL_PROFILE_READ_TIMEOUT_MS;
};

const resolveHeaders = (
  input: SocialProfileProxyRouteInput,
  headers: HeadersFactory | undefined,
): HeadersInit | undefined => (typeof headers === "function" ? headers(input) : headers);

const routeTimingHeaders = (
  config: SocialProfileProxyRouteConfig,
  startedAt: number,
): Record<string, string> => {
  if (!config.routeTimingHeaders) {
    return {};
  }
  return {
    "x-trr-admin-proxy-route-ms": String(Math.max(0, Math.round(performance.now() - startedAt))),
    "x-trr-admin-proxy-endpoint": config.endpoint,
  };
};

const socialProfileJsonResponse = (
  input: SocialProfileProxyRouteInput,
  config: SocialProfileProxyRouteConfig,
  data: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextResponse => {
  return adminJsonResponse(input.request, data, { headers, title: `TRR API ${config.endpoint}` });
};

const socialProfileTimedJsonResponse = (
  input: SocialProfileProxyRouteInput,
  config: SocialProfileProxyRouteConfig,
  data: Record<string, unknown>,
  startedAt: number,
  cacheStatus: string | null,
  headers: Record<string, string> = {},
): NextResponse => {
  const response = socialProfileJsonResponse(input, config, data, {
    ...headers,
    ...routeTimingHeaders(config, startedAt),
  });
  if (!config.routeTimingHeaders) {
    return response;
  }
  return attachAdminRouteTiming(response, {
    routeFamily: "admin-social-profile",
    routeName: config.endpoint,
    cacheStatus,
    startedAt,
  });
};

const readBody = async (
  request: NextRequest,
  method: string,
  forwardBody: boolean | undefined,
  bodyFallback: string | undefined,
): Promise<string | undefined> => {
  const shouldForwardBody = forwardBody ?? !["GET", "HEAD"].includes(method);
  if (!shouldForwardBody) {
    return undefined;
  }
  const body = await request.text();
  return bodyFallback !== undefined && !body.trim() ? bodyFallback : body;
};

const fetchProfilePayload = async (
  input: SocialProfileProxyRouteInput,
  config: SocialProfileProxyRouteConfig,
): Promise<Record<string, unknown>> => {
  const method = config.method ?? "GET";
  const body = await readBody(input.request, method, config.forwardBody, config.bodyFallback);
  const headers = resolveHeaders(input, config.headers);
  const queryString = resolveQueryString(input, config.queryString);
  const data = await fetchSocialBackendJson(input.backendPath, {
    method,
    ...(body !== undefined ? { body } : {}),
    ...(config.forwardAdminContext ? { adminContext: toVerifiedAdminContext(input.user) } : {}),
    ...(headers ? { headers } : {}),
    ...(queryString !== undefined ? { queryString } : {}),
    fallbackError: config.fallbackError,
    retries: config.retries ?? 0,
    timeoutMs: resolveTimeoutMs(input, config.timeoutMs),
  });
  await config.invalidateCache?.({ ...input, data });
  return data;
};

const respondWithRouteResponseCache = async (
  input: SocialProfileProxyRouteInput,
  config: SocialProfileProxyRouteConfig,
  cache: RouteResponseCacheConfig,
  startedAt: number,
): Promise<NextResponse> => {
  const cacheKey = buildUserScopedRouteCacheKey(
    input.user.uid,
    resolveRouteScope(cache.scope, input.params),
    input.request.nextUrl.searchParams,
  );
  const cachedPayload = getRouteResponseCache<Record<string, unknown>>(cache.namespace, cacheKey);
  if (cachedPayload) {
    return socialProfileTimedJsonResponse(input, config, cachedPayload, startedAt, "hit", {
      "x-trr-cache": "hit",
    });
  }
  const stalePayload = getStaleRouteResponseCache<Record<string, unknown>>(cache.namespace, cacheKey);
  try {
    const data = await getOrCreateRouteResponsePromise(cache.namespace, cacheKey, async () => {
      const payload = await fetchProfilePayload(input, config);
      setRouteResponseCache(cache.namespace, cacheKey, payload, cache.ttlMs, cache.staleTtlMs);
      return payload;
    });
    return socialProfileTimedJsonResponse(input, config, data, startedAt, "miss", {
      "x-trr-cache": "miss",
    });
  } catch (error) {
    if (stalePayload) {
      return socialProfileTimedJsonResponse(input, config, stalePayload, startedAt, "stale", {
        "x-trr-cache": "stale",
        "x-trr-cacheable": "0",
      });
    }
    throw error;
  }
};

const buildSnapshotCacheQuery = (
  input: SocialProfileProxyRouteInput,
  cache: AdminSnapshotCacheConfig,
): URLSearchParams | undefined => {
  if (cache.cacheKeyQuery === "request") {
    return input.request.nextUrl.searchParams;
  }
  if (cache.cacheKeyQuery === "backend") {
    return input.backendSearchParams;
  }
  return undefined;
};

const respondWithAdminSnapshotCache = async (
  input: SocialProfileProxyRouteInput,
  config: SocialProfileProxyRouteConfig,
  cache: AdminSnapshotCacheConfig,
  startedAt: number,
): Promise<NextResponse> => {
  const snapshot = await getOrCreateAdminSnapshot({
    cacheKey: buildAdminSnapshotCacheKey({
      authPartition: buildAdminAuthPartition(input.user),
      pageFamily: cache.pageFamily,
      scope: resolveRouteScope(cache.scope, input.params),
      query: buildSnapshotCacheQuery(input, cache),
    }),
    ttlMs: cache.ttlMs,
    staleIfErrorTtlMs: cache.staleIfErrorTtlMs,
    forceRefresh: readForceRefresh(input.request.nextUrl.searchParams, cache.forceRefreshParam),
    fetcher: () => fetchProfilePayload(input, config),
  });
  return socialProfileTimedJsonResponse(input, config, snapshot.data, startedAt, snapshot.meta.cacheStatus, {
      ...buildAdminReadResponseHeaders({ cacheStatus: snapshot.meta.cacheStatus }),
  });
};

export const createSocialProfileProxyRoute = (config: SocialProfileProxyRouteConfig) => {
  return async (request: NextRequest, context: SocialProfileRouteContext): Promise<NextResponse> => {
    const routeStartedAt = performance.now();
    try {
      const user = await requireAdmin(request);
      const params = await context.params;
      const backendSearchParams = resolveBackendSearchParams(request, config.queryString);
      const input: SocialProfileProxyRouteInput = {
        request,
        user,
        params,
        backendPath: buildSocialProfileBackendPath(params, config.endpoint),
        backendSearchParams,
      };

      if (config.cache?.kind === "route-response") {
        return await respondWithRouteResponseCache(input, config, config.cache, routeStartedAt);
      }
      if (config.cache?.kind === "admin-snapshot") {
        return await respondWithAdminSnapshotCache(input, config, config.cache, routeStartedAt);
      }

      const startedAt = routeStartedAt;
      return socialProfileTimedJsonResponse(
        input,
        config,
        await fetchProfilePayload(input, config),
        startedAt,
        "miss",
      );
    } catch (error) {
      const response = socialProxyErrorResponse(error, config.logLabel);
      if (!config.routeTimingHeaders) {
        return response;
      }
      return attachAdminRouteTiming(response, {
        routeFamily: "admin-social-profile",
        routeName: config.endpoint,
        cacheStatus: "error",
        startedAt: routeStartedAt,
      });
    }
  };
};

export const createSocialProfileReadRoute = (config: SocialProfileReadRouteConfig) =>
  createSocialProfileProxyRoute({ ...config, method: "GET", forwardBody: false });
