import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  invalidateRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  AdminReadProxyError,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminBackendStatusError,
  buildAdminProxyErrorResponse,
  buildAdminReadResponseHeaders,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  TRR_RECENT_PEOPLE_CACHE_NAMESPACE,
  TRR_RECENT_PEOPLE_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const RECENT_PERSON_KEYS = new Set([
  "person_id",
  "full_name",
  "known_for",
  "photo_url",
  "show_context",
  "view_count",
  "first_viewed_at",
  "last_viewed_at",
]);
const RECENT_PEOPLE_PAYLOAD_KEYS = new Set(["people", "pagination"]);
const RECENT_PEOPLE_PAGINATION_KEYS = new Set(["limit", "count"]);
const RECENT_PEOPLE_MUTATION_KEYS = new Set(["ok"]);

const parseLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? String(DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const invalidBackendResponse = (): AdminReadProxyError =>
  new AdminReadProxyError("TRR-Backend returned an invalid recent-people response", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

const parseRecentPerson = (value: unknown) => {
  if (!isRecord(value) || !hasExactKeys(value, RECENT_PERSON_KEYS)) {
    throw invalidBackendResponse();
  }
  if (
    typeof value.person_id !== "string" ||
    !UUID_RE.test(value.person_id) ||
    (value.full_name !== null && typeof value.full_name !== "string") ||
    (value.known_for !== null && typeof value.known_for !== "string") ||
    (value.photo_url !== null && typeof value.photo_url !== "string") ||
    (value.show_context !== null && typeof value.show_context !== "string") ||
    typeof value.view_count !== "number" ||
    !Number.isInteger(value.view_count) ||
    value.view_count < 0 ||
    typeof value.first_viewed_at !== "string" ||
    typeof value.last_viewed_at !== "string"
  ) {
    throw invalidBackendResponse();
  }
  return value;
};

const parseRecentPeoplePayload = (value: unknown) => {
  if (!isRecord(value) || !hasExactKeys(value, RECENT_PEOPLE_PAYLOAD_KEYS) || !Array.isArray(value.people)) {
    throw invalidBackendResponse();
  }
  if (!isRecord(value.pagination) || !hasExactKeys(value.pagination, RECENT_PEOPLE_PAGINATION_KEYS)) {
    throw invalidBackendResponse();
  }
  const pagination = value.pagination;
  if (
    typeof pagination.limit !== "number" ||
    !Number.isInteger(pagination.limit) ||
    pagination.limit < 1 ||
    pagination.limit > MAX_LIMIT ||
    typeof pagination.count !== "number" ||
    !Number.isInteger(pagination.count) ||
    pagination.count < 0
  ) {
    throw invalidBackendResponse();
  }
  return {
    people: value.people.map(parseRecentPerson),
    pagination: {
      limit: pagination.limit,
      count: pagination.count,
    },
  };
};

const parseRecentPeopleMutationPayload = (value: unknown): { ok: true } => {
  if (!isRecord(value) || !hasExactKeys(value, RECENT_PEOPLE_MUTATION_KEYS) || value.ok !== true) {
    throw invalidBackendResponse();
  }
  return { ok: true };
};

export async function GET(request: NextRequest) {
  try {
    const startedAt = performance.now();
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
    const searchParams = new URLSearchParams({ limit: String(limit) });
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "recent-people", searchParams);
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_RECENT_PEOPLE_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: buildAdminReadResponseHeaders({ cacheStatus: "hit" }),
      });
    }

    let responseHeaders: Record<string, string> | undefined;
    const payload = await getOrCreateRouteResponsePromise(
      TRR_RECENT_PEOPLE_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson("/admin/recent-people", {
          apiVersion: "v2",
          adminContext,
          timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
          routeName: "recent-people:list",
          queryString: searchParams.toString(),
        });
        if (upstream.status !== 200) {
          throw buildAdminBackendStatusError({
            status: upstream.status,
            data: upstream.data,
            fallbackMessage: "Failed to read recent people",
            routeName: "recent-people:list",
          });
        }
        const payload = parseRecentPeoplePayload(upstream.data);
        responseHeaders = buildAdminReadResponseHeaders({
          cacheStatus: "miss",
          upstreamMs: upstream.durationMs,
          totalMs: performance.now() - startedAt,
        });
        setRouteResponseCache(
          TRR_RECENT_PEOPLE_CACHE_NAMESPACE,
          cacheKey,
          payload,
          TRR_RECENT_PEOPLE_CACHE_TTL_MS,
        );
        return payload;
      },
    );

    return NextResponse.json(payload, {
      headers: responseHeaders ?? buildAdminReadResponseHeaders({ cacheStatus: "miss" }),
    });
  } catch (error) {
    console.error("[api] Failed to read recent people", error);
    return buildAdminProxyErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const body = (await request.json().catch(() => ({}))) as {
      personId?: string;
      showId?: string | null;
    };

    const personId = typeof body.personId === "string" ? body.personId.trim() : "";
    if (!UUID_RE.test(personId)) {
      return NextResponse.json({ error: "personId must be a valid UUID" }, { status: 400 });
    }

    const upstream = await fetchAdminBackendJson("/admin/recent-people", {
      apiVersion: "v2",
      method: "POST",
      adminContext,
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "recent-people:record",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personId,
        showId: typeof body.showId === "string" ? body.showId.trim() : null,
      }),
    });
    if (upstream.status !== 200) {
      throw buildAdminBackendStatusError({
        status: upstream.status,
        data: upstream.data,
        fallbackMessage: "Failed to record recent person",
        routeName: "recent-people:record",
      });
    }

    const payload = parseRecentPeopleMutationPayload(upstream.data);
    invalidateRouteResponseCache(TRR_RECENT_PEOPLE_CACHE_NAMESPACE, `${user.uid}:recent-people:`);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to record recent person", error);
    return buildAdminProxyErrorResponse(error);
  }
}
