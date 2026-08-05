import "server-only";

import { slugifyToken } from "@/lib/slugify";
import {
  AdminReadProxyError,
  ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
  type AdminBackendJsonResult,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHOW_ENVELOPE_KEYS = new Set(["show"]);
const EXACT_SHOW_KEYS = new Set(["id", "name", "slug"]);
const LEGACY_RESOLVED_ENVELOPE_KEYS = new Set(["resolved"]);
const LEGACY_RESOLVED_SHOW_KEYS = new Set([
  "show_id",
  "slug",
  "canonical_slug",
  "show_name",
]);
const LEGACY_FALLBACK_RESPONSE_STATUSES = new Set([405, 502, 503, 504]);
const LEGACY_FALLBACK_ERROR_CODES = new Set([
  "BACKEND_NOT_CONFIGURED",
  "BACKEND_UNREACHABLE",
  "BACKEND_TIMEOUT",
  "BACKEND_REQUEST_TIMEOUT",
]);

export type ExactShowSlugOwner = {
  id: string;
  name: string;
  slug: string;
};

type ExactShowSlugReadOptions = {
  adminContext: VerifiedAdminContext;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const invalidBackendResponse = (): AdminReadProxyError =>
  new AdminReadProxyError("TRR-Backend returned an invalid exact show-slug response", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

const readProblemCode = (data: Record<string, unknown>): string | null => {
  const detail = isRecord(data.detail) ? data.detail : null;
  return typeof detail?.code === "string" ? detail.code : null;
};

const isMissingV2Route = (upstream: AdminBackendJsonResult): boolean =>
  upstream.status === 404 && upstream.data.detail === "Not Found";

const shouldUseLegacyFallbackResponse = (upstream: AdminBackendJsonResult): boolean =>
  isMissingV2Route(upstream) || LEGACY_FALLBACK_RESPONSE_STATUSES.has(upstream.status);

const shouldUseLegacyFallbackError = (error: unknown): boolean =>
  error instanceof AdminReadProxyError &&
  typeof error.code === "string" &&
  LEGACY_FALLBACK_ERROR_CODES.has(error.code);

const parseExactShow = (
  value: unknown,
  options: { strict: boolean },
): ExactShowSlugOwner => {
  if (
    !isRecord(value) ||
    (options.strict && !hasExactKeys(value, EXACT_SHOW_KEYS)) ||
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    typeof value.slug !== "string" ||
    value.slug.trim().length === 0
  ) {
    throw invalidBackendResponse();
  }
  return {
    id: value.id,
    name: value.name,
    slug: value.slug,
  };
};

const parseV2Payload = (
  data: Record<string, unknown>,
  normalizedSlug: string,
): ExactShowSlugOwner => {
  if (!hasExactKeys(data, SHOW_ENVELOPE_KEYS)) throw invalidBackendResponse();
  const show = parseExactShow(data.show, { strict: true });
  if (show.slug.trim().toLowerCase() !== normalizedSlug) throw invalidBackendResponse();
  return show;
};

const parseLegacyResolvedShowId = (data: Record<string, unknown>): string => {
  if (
    !hasExactKeys(data, LEGACY_RESOLVED_ENVELOPE_KEYS) ||
    !isRecord(data.resolved) ||
    !hasExactKeys(data.resolved, LEGACY_RESOLVED_SHOW_KEYS) ||
    typeof data.resolved.show_id !== "string" ||
    !UUID_PATTERN.test(data.resolved.show_id)
  ) {
    throw invalidBackendResponse();
  }
  return data.resolved.show_id;
};

const loadLegacyExactShow = async (
  normalizedSlug: string,
  options: ExactShowSlugReadOptions,
): Promise<ExactShowSlugOwner | null> => {
  const resolved = await fetchAdminBackendJson("/admin/trr-api/shows/resolve-slug", {
    apiVersion: "v1",
    adminContext: options.adminContext,
    queryString: new URLSearchParams({ slug: normalizedSlug }).toString(),
    timeoutMs: ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS,
    routeName: "exact-show-slug-legacy-resolve",
  });
  if (resolved.status === 404) return null;
  if (resolved.status !== 200) {
    throw buildAdminBackendStatusError({
      status: resolved.status,
      data: resolved.data,
      fallbackMessage: "Failed to resolve the legacy show slug",
      routeName: "exact-show-slug-legacy-resolve",
    });
  }

  const showId = parseLegacyResolvedShowId(resolved.data);
  const detail = await fetchAdminBackendJson(`/admin/trr-api/shows/${encodeURIComponent(showId)}`, {
    apiVersion: "v1",
    adminContext: options.adminContext,
    timeoutMs: ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS,
    routeName: "exact-show-slug-legacy-detail",
  });
  if (detail.status === 404) return null;
  if (detail.status !== 200) {
    throw buildAdminBackendStatusError({
      status: detail.status,
      data: detail.data,
      fallbackMessage: "Failed to load the legacy show detail",
      routeName: "exact-show-slug-legacy-detail",
    });
  }
  if (!hasExactKeys(detail.data, SHOW_ENVELOPE_KEYS)) throw invalidBackendResponse();

  const show = parseExactShow(detail.data.show, { strict: false });
  return show.slug.trim().toLowerCase() === normalizedSlug ? show : null;
};

/**
 * Reads the exact stored slug owner from API v2. The two-call v1 path is a
 * bounded rollback for an absent/unavailable v2 endpoint and rejects aliases.
 */
export async function getAdminShowByExactSlug(
  slug: string,
  options: ExactShowSlugReadOptions,
): Promise<ExactShowSlugOwner | null> {
  const normalizedSlug = slugifyToken(slug);
  if (!normalizedSlug) return null;

  let upstream: AdminBackendJsonResult;
  try {
    upstream = await fetchAdminBackendJson(
      `/admin/shows/exact-slug/${encodeURIComponent(normalizedSlug)}`,
      {
        apiVersion: "v2",
        adminContext: options.adminContext,
        timeoutMs: ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS,
        routeName: "exact-show-slug",
      },
    );
  } catch (error) {
    if (shouldUseLegacyFallbackError(error)) {
      return loadLegacyExactShow(normalizedSlug, options);
    }
    throw error;
  }

  if (upstream.status === 200) return parseV2Payload(upstream.data, normalizedSlug);
  if (upstream.status === 404 && readProblemCode(upstream.data) === "SHOW_NOT_FOUND") {
    return null;
  }
  if (shouldUseLegacyFallbackResponse(upstream)) {
    return loadLegacyExactShow(normalizedSlug, options);
  }
  throw buildAdminBackendStatusError({
    status: upstream.status,
    data: upstream.data,
    fallbackMessage: "Failed to find the exact show slug owner",
    routeName: "exact-show-slug",
  });
}
