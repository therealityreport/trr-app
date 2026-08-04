import "server-only";

import {
  AdminReadProxyError,
  ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
  type AdminBackendJsonResult,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  invalidNetworksStreamingDetailResponse,
  normalizeLegacyDetailDateTimes,
  parseNetworksStreamingDetail,
  parseNetworksStreamingSuggestion,
  parseNetworksStreamingSummary,
  shouldFallbackNetworksStreamingError,
  shouldFallbackNetworksStreamingResponse,
  type NetworkStreamingDetail,
  type NetworkStreamingDetailInput,
  type NetworkStreamingSuggestion,
  type NetworkStreamingSummary,
} from "@/lib/server/trr-api/admin-networks-streaming-contracts";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";
import {
  normalizeEntityKey,
  toEntitySlug,
} from "@/lib/admin/networks-streaming-entity";

export * from "@/lib/server/trr-api/admin-networks-streaming-contracts";

type NetworkStreamingReadOptions = {
  adminContext: VerifiedAdminContext;
};

const PROBLEM_RESPONSE_KEYS = new Set(["detail"]);
const DETAIL_NOT_FOUND_PROBLEM_KEYS = new Set([
  "code",
  "status",
  "message",
  "trace_id",
  "request_id",
  "retryable",
  "suggestions",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const isNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const loadLegacySummary = async (
  options: NetworkStreamingReadOptions,
): Promise<NetworkStreamingSummary> => {
  const upstream = await fetchAdminBackendJson("/admin/shows/networks-streaming/summary", {
    apiVersion: "v1",
    adminContext: options.adminContext,
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: "networks-streaming-summary-legacy",
  });
  if (upstream.status !== 200) {
    throw buildAdminBackendStatusError({
      status: upstream.status,
      data: upstream.data,
      fallbackMessage: "Failed to load the legacy networks/streaming summary",
      routeName: "networks-streaming-summary-legacy",
    });
  }
  return parseNetworksStreamingSummary(upstream.data);
};

export async function getNetworksStreamingSummary(
  options: NetworkStreamingReadOptions,
): Promise<NetworkStreamingSummary> {
  let upstream: AdminBackendJsonResult;
  try {
    upstream = await fetchAdminBackendJson("/admin/networks-streaming/summary", {
      apiVersion: "v2",
      adminContext: options.adminContext,
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "networks-streaming-summary",
    });
  } catch (error) {
    if (shouldFallbackNetworksStreamingError(error)) return loadLegacySummary(options);
    throw error;
  }

  if (upstream.status === 200) return parseNetworksStreamingSummary(upstream.data);
  if (shouldFallbackNetworksStreamingResponse(upstream)) return loadLegacySummary(options);
  throw buildAdminBackendStatusError({
    status: upstream.status,
    data: upstream.data,
    fallbackMessage: "Failed to load the networks/streaming summary",
    routeName: "networks-streaming-summary",
  });
}

const buildDetailQueryString = (input: NetworkStreamingDetailInput): string => {
  if (input.show_scope !== "added") throw new Error("Unsupported show scope");
  const entityKey = normalizeEntityKey(input.entity_key ?? "");
  const entitySlug = toEntitySlug(input.entity_slug ?? "");
  if (!entityKey && !entitySlug) {
    throw new Error("entity_key or entity_slug is required");
  }
  const query = new URLSearchParams({ entity_type: input.entity_type });
  if (entityKey) query.set("entity_key", entityKey);
  if (entitySlug) query.set("entity_slug", entitySlug);
  return query.toString();
};

const detailNotFoundError = (
  suggestions: NetworkStreamingSuggestion[],
  message = "Networks/streaming entity not found.",
): AdminReadProxyError =>
  new AdminReadProxyError(message, 404, {
    code: "NETWORKS_STREAMING_ENTITY_NOT_FOUND",
    retryable: false,
    detail: { suggestions },
  });

const parseV2DetailNotFound = (data: Record<string, unknown>): AdminReadProxyError | null => {
  const detail = isRecord(data.detail) ? data.detail : null;
  if (detail?.code !== "NETWORKS_STREAMING_ENTITY_NOT_FOUND") return null;
  if (
    !hasExactKeys(data, PROBLEM_RESPONSE_KEYS) ||
    !hasExactKeys(detail, DETAIL_NOT_FOUND_PROBLEM_KEYS) ||
    detail.status !== 404 ||
    !isNonemptyString(detail.message) ||
    !isNonemptyString(detail.trace_id) ||
    !isNonemptyString(detail.request_id) ||
    detail.retryable !== false ||
    !Array.isArray(detail.suggestions)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return detailNotFoundError(
    detail.suggestions.map(parseNetworksStreamingSuggestion),
    detail.message,
  );
};

const parseLegacyDetailNotFound = (data: Record<string, unknown>): AdminReadProxyError | null => {
  if (data.error !== "not_found") return null;
  if (!Array.isArray(data.suggestions)) throw invalidNetworksStreamingDetailResponse();
  return detailNotFoundError(data.suggestions.map(parseNetworksStreamingSuggestion));
};

const loadLegacyDetail = async (
  input: NetworkStreamingDetailInput,
  options: NetworkStreamingReadOptions,
  queryString: string,
): Promise<NetworkStreamingDetail> => {
  const upstream = await fetchAdminBackendJson("/admin/shows/networks-streaming/detail", {
    apiVersion: "v1",
    adminContext: options.adminContext,
    queryString,
    timeoutMs: ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS,
    routeName: "networks-streaming-detail-legacy",
  });
  if (upstream.status === 200) {
    return parseNetworksStreamingDetail(normalizeLegacyDetailDateTimes(upstream.data));
  }
  if (upstream.status === 404) {
    const notFound = parseLegacyDetailNotFound(upstream.data);
    if (notFound) throw notFound;
  }
  throw buildAdminBackendStatusError({
    status: upstream.status,
    data: upstream.data,
    fallbackMessage: `Failed to load the legacy ${input.entity_type} detail`,
    routeName: "networks-streaming-detail-legacy",
  });
};

export async function getNetworkStreamingDetail(
  input: NetworkStreamingDetailInput,
  options: NetworkStreamingReadOptions,
): Promise<NetworkStreamingDetail> {
  const queryString = buildDetailQueryString(input);
  let upstream: AdminBackendJsonResult;
  try {
    upstream = await fetchAdminBackendJson("/admin/networks-streaming/detail", {
      apiVersion: "v2",
      adminContext: options.adminContext,
      queryString,
      timeoutMs: ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS,
      routeName: "networks-streaming-detail",
    });
  } catch (error) {
    if (shouldFallbackNetworksStreamingError(error)) {
      return loadLegacyDetail(input, options, queryString);
    }
    throw error;
  }

  if (upstream.status === 200) return parseNetworksStreamingDetail(upstream.data);
  if (upstream.status === 404) {
    const notFound = parseV2DetailNotFound(upstream.data);
    if (notFound) throw notFound;
  }
  if (shouldFallbackNetworksStreamingResponse(upstream)) {
    return loadLegacyDetail(input, options, queryString);
  }
  throw buildAdminBackendStatusError({
    status: upstream.status,
    data: upstream.data,
    fallbackMessage: `Failed to load the ${input.entity_type} detail`,
    routeName: "networks-streaming-detail",
  });
}
