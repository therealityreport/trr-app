import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { buildInternalAdminHeaders } from "@/lib/server/trr-api/internal-admin-auth";

export type AdminBackendProxyMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AdminBackendProxyResponseMode = "json" | "passthrough";
export type AdminBackendProxyTimeoutTier = "short" | "default" | "long";

export type AdminBackendProxyTimeout =
  | AdminBackendProxyTimeoutTier
  | {
      name: string;
      ms: number;
    };

export type AdminBackendProxyBodyResult<TBodyValue = unknown> = {
  body?: BodyInit | null;
  contentType?: string | null;
  value?: TBodyValue;
};

export type AdminBackendProxyContext<TParams, TBodyValue = unknown> = {
  request: NextRequest;
  params: TParams;
  bodyValue: TBodyValue | undefined;
};

export type AdminBackendProxyBodyFactory<TParams, TBodyValue = unknown> = (
  context: Omit<AdminBackendProxyContext<TParams, TBodyValue>, "bodyValue">,
) => Promise<AdminBackendProxyBodyResult<TBodyValue>> | AdminBackendProxyBodyResult<TBodyValue>;

export type AdminBackendProxyQueryValue =
  | string
  | URLSearchParams
  | Record<string, string | number | boolean | null | undefined>
  | null
  | undefined;

export type AdminBackendProxyQueryFactory<TParams, TBodyValue = unknown> = (
  context: AdminBackendProxyContext<TParams, TBodyValue>,
) => AdminBackendProxyQueryValue | Promise<AdminBackendProxyQueryValue>;

export type AdminBackendProxyHeadersFactory<TParams, TBodyValue = unknown> = (
  context: AdminBackendProxyContext<TParams, TBodyValue>,
) => HeadersInit | Promise<HeadersInit>;

export type AdminBackendProxyRouteConfig<TParams extends Record<string, string | undefined>, TBodyValue = unknown> = {
  routeName: string;
  method: AdminBackendProxyMethod;
  backendPath: (
    context: Omit<AdminBackendProxyContext<TParams, TBodyValue>, "bodyValue">,
  ) => string | Promise<string>;
  requiredParams?: Array<{
    key: keyof TParams;
    message: string;
  }>;
  body?: AdminBackendProxyBodyFactory<TParams, TBodyValue>;
  query?: "forward" | AdminBackendProxyQueryFactory<TParams, TBodyValue>;
  headers?: HeadersInit | AdminBackendProxyHeadersFactory<TParams, TBodyValue>;
  timeout: AdminBackendProxyTimeout;
  responseMode?: AdminBackendProxyResponseMode;
  backendCache?: RequestCache;
  responseHeaders?: HeadersInit | AdminBackendProxyHeadersFactory<TParams, TBodyValue>;
  jsonErrorFallback: string | ((context: AdminBackendProxyContext<TParams, TBodyValue>) => string);
  timeoutError: string | ((context: AdminBackendProxyContext<TParams, TBodyValue>) => string);
  timeoutDetail: (
    context: AdminBackendProxyContext<TParams, TBodyValue> & { timeoutMs: number; timeoutTier: string },
  ) => string;
  logMessage: string;
  preserveBackendSuccessStatus?: boolean;
};

type RouteHandlerContext<TParams extends Record<string, string | undefined>> = {
  params: Promise<TParams>;
};

const DEFAULT_TIMEOUT_TIERS: Record<AdminBackendProxyTimeoutTier, number> = {
  short: 10_000,
  default: 30_000,
  long: 60_000,
};

const resolveTimeout = (timeout: AdminBackendProxyTimeout): { name: string; ms: number } => {
  if (typeof timeout === "string") {
    return { name: timeout, ms: DEFAULT_TIMEOUT_TIERS[timeout] };
  }
  const ms = Number.isFinite(timeout.ms) && timeout.ms > 0 ? timeout.ms : DEFAULT_TIMEOUT_TIERS.default;
  return { name: timeout.name || "custom", ms };
};

const readJsonRecord = async (response: Response): Promise<Record<string, unknown>> => {
  const data = (await response.json().catch(() => ({}))) as unknown;
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
};

const normalizeQueryValue = (query: AdminBackendProxyQueryValue): string => {
  if (!query) return "";
  if (typeof query === "string") return query.replace(/^\?/, "");
  if (query instanceof URLSearchParams) return query.toString();

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || typeof value === "undefined") continue;
    params.set(key, String(value));
  }
  return params.toString();
};

const appendQuery = (url: string, query: string): string => {
  if (!query) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
};

const resolveHeaders = async <TParams extends Record<string, string | undefined>, TBodyValue>(
  headers: HeadersInit | AdminBackendProxyHeadersFactory<TParams, TBodyValue> | undefined,
  context: AdminBackendProxyContext<TParams, TBodyValue>,
): Promise<HeadersInit | undefined> => {
  if (!headers) return undefined;
  if (typeof headers === "function") {
    return headers(context);
  }
  return headers;
};

const readErrorMessage = <TParams extends Record<string, string | undefined>, TBodyValue>(
  fallback: string | ((context: AdminBackendProxyContext<TParams, TBodyValue>) => string),
  context: AdminBackendProxyContext<TParams, TBodyValue>,
): string => (typeof fallback === "function" ? fallback(context) : fallback);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readStringField = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const problemMetadataKeys = ["code", "status", "retryable", "reason", "trace_id", "request_id"] as const;

const buildBackendErrorPayload = <TParams extends Record<string, string | undefined>, TBodyValue>(
  data: Record<string, unknown>,
  context: AdminBackendProxyContext<TParams, TBodyValue>,
  fallback: string | ((context: AdminBackendProxyContext<TParams, TBodyValue>) => string),
): Record<string, unknown> => {
  const detail = data.detail;
  const detailRecord = isRecord(detail) ? detail : null;
  const payload: Record<string, unknown> = {
    error:
      readStringField(data.error) ??
      readStringField(detail) ??
      readStringField(detailRecord?.message) ??
      readErrorMessage(fallback, context),
  };

  if (typeof detail === "string" && detail.trim().length > 0) {
    payload.detail = detail.trim();
  } else if (detailRecord) {
    payload.detail = detailRecord;
  }

  for (const key of problemMetadataKeys) {
    const value = data[key] ?? detailRecord?.[key];
    if (typeof value !== "undefined") {
      payload[key] = value;
    }
  }

  return payload;
};

const buildBackendFetchFailedPayload = (error: unknown): { error: string; detail: string } => {
  const baseDetail = error instanceof Error ? error.message : "unknown error";
  const causeDetail =
    error instanceof Error && error.cause ? `; cause=${String(error.cause)}` : "";
  return {
    error: "Backend fetch failed",
    detail: `${baseDetail}${causeDetail} (TRR_API_URL=${process.env.TRR_API_URL ?? "unset"})`,
  };
};

export const readJsonRequestBody = async (
  request: NextRequest,
  options?: {
    onlyWhenJsonContentType?: boolean;
    defaultValue?: unknown;
  },
): Promise<unknown> => {
  const defaultValue = options?.defaultValue ?? {};
  const isJson = request.headers.get("content-type")?.includes("application/json") ?? false;
  if (options?.onlyWhenJsonContentType && !isJson) {
    return defaultValue;
  }
  return request.json().catch(() => defaultValue);
};

export const forwardJsonRequestBody = async (
  request: NextRequest,
  options?: {
    onlyWhenJsonContentType?: boolean;
    defaultValue?: unknown;
  },
): Promise<AdminBackendProxyBodyResult<unknown>> => {
  const value = await readJsonRequestBody(request, options);
  return {
    body: JSON.stringify(value ?? options?.defaultValue ?? {}),
    contentType: "application/json",
    value,
  };
};

export async function executeAdminBackendProxy<TParams extends Record<string, string | undefined>, TBodyValue>(
  request: NextRequest,
  params: TParams,
  config: AdminBackendProxyRouteConfig<TParams, TBodyValue>,
): Promise<NextResponse> {
  for (const requiredParam of config.requiredParams ?? []) {
    if (!params[requiredParam.key]) {
      return NextResponse.json({ error: requiredParam.message }, { status: 400 });
    }
  }

  const bodyResult = config.body
    ? await config.body({ request, params })
    : ({} as AdminBackendProxyBodyResult<TBodyValue>);
  const context: AdminBackendProxyContext<TParams, TBodyValue> = {
    request,
    params,
    bodyValue: bodyResult.value,
  };
  const backendPath = await config.backendPath({ request, params });
  const backendBaseUrl = getBackendApiUrl(backendPath);
  if (!backendBaseUrl) {
    return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
  }

  const queryValue =
    config.query === "forward"
      ? request.nextUrl.searchParams
      : config.query
        ? await config.query(context)
        : "";
  const backendUrl = appendQuery(backendBaseUrl, normalizeQueryValue(queryValue));
  const timeout = resolveTimeout(config.timeout);
  const extraHeaders = await resolveHeaders(config.headers, context);
  const requestHeaders = new Headers(extraHeaders);
  if (bodyResult.contentType && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", bodyResult.contentType);
  }
  const headers = buildInternalAdminHeaders(requestHeaders);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout.ms);

  try {
    const response = await fetch(backendUrl, {
      method: config.method,
      headers,
      body: bodyResult.body,
      ...(config.backendCache ? { cache: config.backendCache } : {}),
      signal: controller.signal,
    });
    const responseHeaders = await resolveHeaders(config.responseHeaders, context);

    if (config.responseMode === "passthrough") {
      const headersOut = new Headers(response.headers);
      for (const [key, value] of new Headers(responseHeaders).entries()) {
        headersOut.set(key, value);
      }
      return new NextResponse(response.body, {
        status: response.status,
        headers: headersOut,
      });
    }

    const data = await readJsonRecord(response);
    if (!response.ok) {
      return NextResponse.json(buildBackendErrorPayload(data, context, config.jsonErrorFallback), {
        status: response.status,
        headers: responseHeaders,
      });
    }

    return NextResponse.json(data, {
      ...(config.preserveBackendSuccessStatus ? { status: response.status } : {}),
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          error: readErrorMessage(config.timeoutError, context),
          detail: config.timeoutDetail({
            ...context,
            timeoutMs: timeout.ms,
            timeoutTier: timeout.name,
          }),
        },
        { status: 504 },
      );
    }
    return NextResponse.json(buildBackendFetchFailedPayload(error), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export function createAdminBackendProxyRoute<
  TParams extends Record<string, string | undefined>,
  TBodyValue = unknown,
>(config: AdminBackendProxyRouteConfig<TParams, TBodyValue>) {
  return async function adminBackendProxyRoute(
    request: NextRequest,
    { params }: RouteHandlerContext<TParams>,
  ): Promise<NextResponse> {
    try {
      await requireAdmin(request);
      return executeAdminBackendProxy(request, await params, config);
    } catch (error) {
      console.error(config.logMessage, error);
      const message = error instanceof Error ? error.message : "failed";
      const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  };
}
