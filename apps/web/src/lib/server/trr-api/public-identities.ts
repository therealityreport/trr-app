import "server-only";

import { cache } from "react";

import { slugifyToken } from "@/lib/slugify";
import { isTimeoutSafeFetchTimeoutError, timeoutSafeFetch } from "@/lib/server/timeout-safe-fetch";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import { getBackendRootUrl } from "@/lib/server/trr-api/backend";

export type PublicIdentityMatchKind = "canonical" | "alias";

export type PublicShowIdentityResponse = {
  resource_type: "show";
  show_id: string;
  show_name: string;
  requested_slug: string;
  canonical_slug: string;
  match_kind: PublicIdentityMatchKind;
  canonical_path: string;
};

export type PublicSeasonIdentityResponse = {
  resource_type: "season";
  season_id: string;
  show_id: string;
  show_name: string;
  season_number: number;
  season_title: string | null;
  requested_show_slug: string;
  canonical_show_slug: string;
  show_match_kind: PublicIdentityMatchKind;
  canonical_path: string;
};

export type PublicPersonShowContext = {
  show_id: string;
  show_name: string;
  canonical_slug: string;
};

export type PublicPersonIdentityResponse = {
  resource_type: "person";
  person_id: string;
  full_name: string;
  requested_slug: string;
  canonical_slug: string;
  match_kind: PublicIdentityMatchKind;
  canonical_path: string;
  show_context: PublicPersonShowContext | null;
};

export type PublicIdentityProblemDetail = {
  code: string;
  status: number;
  message: string;
  trace_id: string;
  request_id: string;
  retryable?: boolean | null;
  detail?: Record<string, unknown> | null;
  reason?: string | null;
  retry_after_ms?: number | null;
};

export type PublicIdentityProblemResponse = {
  detail: PublicIdentityProblemDetail;
};

export type PublicPersonIdentityContext =
  | { showId: string; showSlug?: never }
  | { showId?: never; showSlug: string };

export type ResolvedShowSlug = {
  show_id: string;
  slug: string;
  canonical_slug: string;
  show_name: string;
};

export class PublicIdentityApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean | null | undefined;
  readonly problem: PublicIdentityProblemDetail | null;

  constructor(
    message: string,
    options: {
      status: number;
      code: string;
      retryable?: boolean | null;
      problem?: PublicIdentityProblemDetail;
    },
  ) {
    super(message);
    this.name = "PublicIdentityApiError";
    this.status = options.status;
    this.code = options.code;
    this.retryable = options.retryable;
    this.problem = options.problem ?? null;
  }
}

const PUBLIC_IDENTITY_TIMEOUT_MS = 5_000;
const PRESERVED_PROBLEM_STATUSES = new Set([400, 404, 409, 500, 503]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-+[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 160;
const MAX_SEASON_NUMBER = 2_147_483_647;
const LEGACY_SHOW_RESOLVE_TIMEOUT_MS = Math.max(15_000, ADMIN_READ_PROXY_SHORT_TIMEOUT_MS);
const SHOW_IDENTITY_KEYS = new Set([
  "resource_type",
  "show_id",
  "show_name",
  "requested_slug",
  "canonical_slug",
  "match_kind",
  "canonical_path",
]);
const SEASON_IDENTITY_KEYS = new Set([
  "resource_type",
  "season_id",
  "show_id",
  "show_name",
  "season_number",
  "season_title",
  "requested_show_slug",
  "canonical_show_slug",
  "show_match_kind",
  "canonical_path",
]);
const PERSON_SHOW_CONTEXT_KEYS = new Set(["show_id", "show_name", "canonical_slug"]);
const PERSON_IDENTITY_REQUIRED_KEYS = new Set([
  "resource_type",
  "person_id",
  "full_name",
  "requested_slug",
  "canonical_slug",
  "match_kind",
  "canonical_path",
]);
const PERSON_IDENTITY_ALLOWED_KEYS = new Set([
  ...PERSON_IDENTITY_REQUIRED_KEYS,
  "show_context",
]);
const PROBLEM_RESPONSE_KEYS = new Set(["detail"]);
const PROBLEM_DETAIL_KEYS = new Set([
  "code",
  "status",
  "message",
  "trace_id",
  "request_id",
  "retryable",
  "detail",
  "reason",
  "retry_after_ms",
]);
const LEGACY_RESOLVED_SHOW_KEYS = new Set([
  "show_id",
  "slug",
  "canonical_slug",
  "show_name",
]);
const LEGACY_SHOW_RESOLVE_ENVELOPE_KEYS = new Set(["resolved"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, allowedKeys: ReadonlySet<string>): boolean => {
  const keys = Object.keys(value);
  return keys.length === allowedKeys.size && keys.every((key) => allowedKeys.has(key));
};

const hasOnlyAllowedKeys = (value: Record<string, unknown>, allowedKeys: ReadonlySet<string>): boolean =>
  Object.keys(value).every((key) => allowedKeys.has(key));

const hasRequiredAndAllowedKeys = (
  value: Record<string, unknown>,
  requiredKeys: ReadonlySet<string>,
  allowedKeys: ReadonlySet<string>,
): boolean =>
  hasOnlyAllowedKeys(value, allowedKeys) &&
  [...requiredKeys].every((key) => Object.prototype.hasOwnProperty.call(value, key));

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

const isSlug = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= MAX_SLUG_LENGTH &&
  SLUG_RE.test(value);

const isMatchKind = (value: unknown): value is PublicIdentityMatchKind =>
  value === "canonical" || value === "alias";

const invalidBackendResponse = (): PublicIdentityApiError =>
  new PublicIdentityApiError("TRR-Backend returned an invalid public identity response.", {
    status: 502,
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

const parseProblemResponse = (
  value: unknown,
  responseStatus: number,
): PublicIdentityProblemDetail | null => {
  if (!isRecord(value) || !hasExactKeys(value, PROBLEM_RESPONSE_KEYS) || !isRecord(value.detail)) return null;
  const detail = value.detail;
  if (!hasOnlyAllowedKeys(detail, PROBLEM_DETAIL_KEYS)) return null;
  if (
    typeof detail.code !== "string" ||
    detail.code.length === 0 ||
    detail.status !== responseStatus ||
    typeof detail.message !== "string" ||
    typeof detail.trace_id !== "string" ||
    detail.trace_id.length === 0 ||
    typeof detail.request_id !== "string" ||
    detail.request_id.length === 0
  ) {
    return null;
  }
  if (detail.retryable !== undefined && detail.retryable !== null && typeof detail.retryable !== "boolean") {
    return null;
  }
  if (detail.detail !== undefined && detail.detail !== null && !isRecord(detail.detail)) return null;
  if (detail.reason !== undefined && detail.reason !== null && typeof detail.reason !== "string") return null;
  if (
    detail.retry_after_ms !== undefined &&
    detail.retry_after_ms !== null &&
      (!Number.isInteger(detail.retry_after_ms) || typeof detail.retry_after_ms !== "number")
  ) {
    return null;
  }
  return {
    code: detail.code,
    status: detail.status,
    message: detail.message,
    trace_id: detail.trace_id,
    request_id: detail.request_id,
    retryable: detail.retryable,
    detail: detail.detail,
    reason: detail.reason,
    retry_after_ms: detail.retry_after_ms,
  };
};

const parseResponseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw invalidBackendResponse();
  }
};

const loadPublicIdentityJson = cache(async (backendUrl: string): Promise<unknown> => {
  let response: Response;
  try {
    response = await timeoutSafeFetch(backendUrl, {
      timeoutMs: PUBLIC_IDENTITY_TIMEOUT_MS,
      timeoutName: "public-identity-v2",
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
    });
  } catch (error) {
    if (isTimeoutSafeFetchTimeoutError(error)) {
      throw new PublicIdentityApiError("TRR-Backend public identity request timed out.", {
        status: 504,
        code: "BACKEND_TIMEOUT",
        retryable: true,
      });
    }
    throw new PublicIdentityApiError("Could not reach TRR-Backend.", {
      status: 502,
      code: "BACKEND_UNREACHABLE",
      retryable: true,
    });
  }

  const payload = await parseResponseJson(response);
  if (response.status === 200) return payload;

  if (PRESERVED_PROBLEM_STATUSES.has(response.status)) {
    const problem = parseProblemResponse(payload, response.status);
    if (problem) {
      throw new PublicIdentityApiError(problem.message, {
        status: problem.status,
        code: problem.code,
        retryable: problem.retryable,
        problem,
      });
    }
  }
  throw invalidBackendResponse();
});

const requireBackendUrl = (path: string): string => {
  const backendUrl = getBackendRootUrl(path);
  if (backendUrl) return backendUrl;
  throw new PublicIdentityApiError("TRR-Backend is not configured.", {
    status: 500,
    code: "BACKEND_NOT_CONFIGURED",
    retryable: false,
  });
};

const normalizeCompatibilityShowSlug = (value: string): string => {
  const trimmed = value.trim();
  const suffix = trimmed.match(/--([0-9a-f]{8})$/i);
  const base = slugifyToken(suffix ? trimmed.slice(0, -suffix[0].length) : trimmed);
  if (!base) return "";
  return suffix ? `${base}--${suffix[1].toLowerCase()}` : base;
};

const parseLegacyResolvedShowSlug = (value: unknown): ResolvedShowSlug => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, LEGACY_RESOLVED_SHOW_KEYS) ||
    !isUuid(value.show_id) ||
    !isSlug(value.slug) ||
    !isSlug(value.canonical_slug) ||
    typeof value.show_name !== "string" ||
    value.show_name.length === 0
  ) {
    throw invalidBackendResponse();
  }
  return {
    show_id: value.show_id,
    slug: value.slug,
    canonical_slug: value.canonical_slug,
    show_name: value.show_name,
  };
};

const resolveLegacyShowSlug = async (slug: string): Promise<ResolvedShowSlug | null> => {
  const upstream = await fetchAdminBackendJson(
    `/admin/trr-api/shows/resolve-slug?${new URLSearchParams({ slug }).toString()}`,
    {
      apiVersion: "v1",
      timeoutMs: LEGACY_SHOW_RESOLVE_TIMEOUT_MS,
      routeName: "show-resolve-slug-compatibility",
    },
  );
  if (upstream.status === 404) return null;
  if (upstream.status !== 200) {
    throw new PublicIdentityApiError("The legacy show identity resolver failed.", {
      status: upstream.status,
      code: "LEGACY_SHOW_IDENTITY_FAILED",
      retryable: upstream.status >= 500,
    });
  }
  if (
    !isRecord(upstream.data) ||
    !hasExactKeys(upstream.data, LEGACY_SHOW_RESOLVE_ENVELOPE_KEYS)
  ) {
    throw invalidBackendResponse();
  }
  return parseLegacyResolvedShowSlug(upstream.data.resolved);
};

const parseShowIdentity = (value: unknown): PublicShowIdentityResponse => {
  if (!isRecord(value)) throw invalidBackendResponse();
  const canonicalSlug = value.canonical_slug;
  if (
    !hasExactKeys(value, SHOW_IDENTITY_KEYS) ||
    value.resource_type !== "show" ||
    !isUuid(value.show_id) ||
    typeof value.show_name !== "string" ||
    !isSlug(value.requested_slug) ||
    !isSlug(canonicalSlug) ||
    !isMatchKind(value.match_kind) ||
    value.canonical_path !== `/shows/${canonicalSlug}`
  ) {
    throw invalidBackendResponse();
  }
  return {
    resource_type: "show",
    show_id: value.show_id,
    show_name: value.show_name,
    requested_slug: value.requested_slug,
    canonical_slug: canonicalSlug,
    match_kind: value.match_kind,
    canonical_path: value.canonical_path,
  };
};

const parseSeasonIdentity = (value: unknown): PublicSeasonIdentityResponse => {
  if (!isRecord(value)) throw invalidBackendResponse();
  const canonicalShowSlug = value.canonical_show_slug;
  const seasonNumber = value.season_number;
  if (
    !hasExactKeys(value, SEASON_IDENTITY_KEYS) ||
    value.resource_type !== "season" ||
    !isUuid(value.season_id) ||
    !isUuid(value.show_id) ||
    typeof value.show_name !== "string" ||
    typeof seasonNumber !== "number" ||
    !Number.isInteger(seasonNumber) ||
    seasonNumber < 0 ||
    seasonNumber > MAX_SEASON_NUMBER ||
    (value.season_title !== null && typeof value.season_title !== "string") ||
    !isSlug(value.requested_show_slug) ||
    !isSlug(canonicalShowSlug) ||
    !isMatchKind(value.show_match_kind) ||
    value.canonical_path !== `/shows/${canonicalShowSlug}/seasons/${seasonNumber}`
  ) {
    throw invalidBackendResponse();
  }
  return {
    resource_type: "season",
    season_id: value.season_id,
    show_id: value.show_id,
    show_name: value.show_name,
    season_number: seasonNumber,
    season_title: value.season_title,
    requested_show_slug: value.requested_show_slug,
    canonical_show_slug: canonicalShowSlug,
    show_match_kind: value.show_match_kind,
    canonical_path: value.canonical_path,
  };
};

const parsePersonShowContext = (value: unknown): PublicPersonShowContext | null => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, PERSON_SHOW_CONTEXT_KEYS) ||
    !isUuid(value.show_id) ||
    typeof value.show_name !== "string" ||
    !isSlug(value.canonical_slug)
  ) {
    return null;
  }
  return {
    show_id: value.show_id,
    show_name: value.show_name,
    canonical_slug: value.canonical_slug,
  };
};

const parsePersonIdentity = (value: unknown): PublicPersonIdentityResponse => {
  if (!isRecord(value)) throw invalidBackendResponse();
  const canonicalSlug = value.canonical_slug;
  const rawShowContext = value.show_context;
  const showContext =
    rawShowContext === undefined || rawShowContext === null
      ? null
      : parsePersonShowContext(rawShowContext);
  if (
    !hasRequiredAndAllowedKeys(
      value,
      PERSON_IDENTITY_REQUIRED_KEYS,
      PERSON_IDENTITY_ALLOWED_KEYS,
    ) ||
    value.resource_type !== "person" ||
    !isUuid(value.person_id) ||
    typeof value.full_name !== "string" ||
    !isSlug(value.requested_slug) ||
    !isSlug(canonicalSlug) ||
    !isMatchKind(value.match_kind) ||
    value.canonical_path !== `/people/${canonicalSlug}` ||
    (rawShowContext !== undefined && rawShowContext !== null && showContext === null)
  ) {
    throw invalidBackendResponse();
  }
  return {
    resource_type: "person",
    person_id: value.person_id,
    full_name: value.full_name,
    requested_slug: value.requested_slug,
    canonical_slug: canonicalSlug,
    match_kind: value.match_kind,
    canonical_path: value.canonical_path,
    show_context: showContext,
  };
};

export async function resolvePublicShowIdentity(slug: string): Promise<PublicShowIdentityResponse> {
  const path = `/api/v2/identities/shows/${encodeURIComponent(slug)}`;
  return parseShowIdentity(await loadPublicIdentityJson(requireBackendUrl(path)));
}

/**
 * Compatibility adapter for admin callers that historically resolved slugs
 * through app-local SQL. The public v2 identity contract is authoritative;
 * the v1 backend route remains a bounded N/N+1 rollback path.
 */
export async function resolveShowSlug(slug: string): Promise<ResolvedShowSlug | null> {
  const normalizedSlug = normalizeCompatibilityShowSlug(slug);
  if (!normalizedSlug) return null;
  try {
    const identity = await resolvePublicShowIdentity(normalizedSlug);
    return {
      show_id: identity.show_id,
      slug: identity.canonical_slug,
      canonical_slug: identity.canonical_slug,
      show_name: identity.show_name,
    };
  } catch (error) {
    if (!(error instanceof PublicIdentityApiError)) throw error;
    if (error.status === 400 || error.status === 409) return null;
    return resolveLegacyShowSlug(normalizedSlug);
  }
}

export async function resolvePublicSeasonIdentity(
  showSlug: string,
  seasonNumber: number,
): Promise<PublicSeasonIdentityResponse> {
  const path = `/api/v2/identities/shows/${encodeURIComponent(showSlug)}/seasons/${encodeURIComponent(String(seasonNumber))}`;
  return parseSeasonIdentity(await loadPublicIdentityJson(requireBackendUrl(path)));
}

export async function resolvePublicPersonIdentity(
  slug: string,
  context?: PublicPersonIdentityContext,
): Promise<PublicPersonIdentityResponse> {
  const path = `/api/v2/identities/people/${encodeURIComponent(slug)}`;
  const backendUrl = requireBackendUrl(path);
  const query = new URLSearchParams();
  if (context && "showId" in context && typeof context.showId === "string") {
    query.set("show_id", context.showId);
  } else if (context && "showSlug" in context && typeof context.showSlug === "string") {
    query.set("show_slug", context.showSlug);
  }
  const queryString = query.toString();
  return parsePersonIdentity(
    await loadPublicIdentityJson(queryString ? `${backendUrl}?${queryString}` : backendUrl),
  );
}
