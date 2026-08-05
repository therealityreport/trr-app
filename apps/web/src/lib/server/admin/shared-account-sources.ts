import "server-only";

import { normalizePersonExternalIdValue } from "@/lib/admin/person-external-ids";
import type {
  SharedAccountSourceSetScope,
  SharedAccountSourceSummary,
  SocialLandingPlatform,
} from "@/lib/admin/social-landing";
import { normalizeSocialAccountProfileHandle } from "@/lib/admin/show-admin-routes";
import {
  AdminReadProxyError,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

export type SharedAccountSourceLoadSource = "backend" | "local_db_fallback";

export type SharedAccountSourceLoadStatus = {
  source_scope: SharedAccountSourceSetScope;
  load_source: SharedAccountSourceLoadSource;
  warning: string | null;
  error_code?: string | null;
  error_message?: string | null;
};

type SharedAccountSourcePayload = {
  id?: string | null;
  platform?: string | null;
  source_scope?: string | null;
  account_handle?: string | null;
  is_active?: boolean | null;
  scrape_priority?: number | string | null;
  metadata?: Record<string, unknown> | null;
  last_scrape_status?: string | null;
  last_scrape_at?: string | null;
  last_classified_at?: string | null;
};

export type SharedAccountSourcesPayload = {
  source_scope: SharedAccountSourceSetScope;
  sources: SharedAccountSourceSummary[];
  using_defaults: boolean;
};

const SHARED_ACCOUNT_SOURCES_BACKEND_PATH = "/admin/socials/shared-account-sources";

export const normalizeSharedAccountSourceScope = (
  value: string | null | undefined,
): SharedAccountSourceSetScope => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "creator" || normalized === "news") return normalized;
  return "network";
};

export const parseSharedAccountSourcePlatforms = (
  value: string | null | undefined,
): SocialLandingPlatform[] | null => {
  const platforms = String(value ?? "")
    .split(",")
    .map((entry) => normalizePlatform(entry))
    .filter((entry): entry is SocialLandingPlatform => entry !== null);
  return platforms.length > 0 ? Array.from(new Set(platforms)) : null;
};

export const normalizePlatform = (
  value: string | null | undefined,
): SocialLandingPlatform | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "instagram" ||
    normalized === "tiktok" ||
    normalized === "twitter" ||
    normalized === "youtube" ||
    normalized === "facebook" ||
    normalized === "threads"
  ) {
    return normalized;
  }
  return null;
};

export const toCanonicalInternalHandle = (
  platform: SocialLandingPlatform,
  value: string,
): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (platform === "youtube") {
    const normalizedYoutube = normalizePersonExternalIdValue("youtube", trimmed);
    if (!normalizedYoutube) return null;
    if (
      normalizedYoutube.startsWith("channel/") ||
      normalizedYoutube.startsWith("user/") ||
      normalizedYoutube.startsWith("c/")
    ) {
      return null;
    }
    return normalizeSocialAccountProfileHandle(normalizedYoutube);
  }

  if (
    platform === "facebook" ||
    platform === "instagram" ||
    platform === "twitter" ||
    platform === "tiktok"
  ) {
    return normalizeSocialAccountProfileHandle(
      normalizePersonExternalIdValue(platform, trimmed),
    );
  }

  return normalizeSocialAccountProfileHandle(trimmed);
};

const mapSharedSourceRow = (
  row: SharedAccountSourcePayload,
): SharedAccountSourceSummary | null => {
  const platform = normalizePlatform(row.platform);
  if (!platform || typeof row.account_handle !== "string") return null;
  const accountHandle =
    toCanonicalInternalHandle(platform, row.account_handle) ??
    row.account_handle.trim().replace(/^@+/, "");
  if (!accountHandle) return null;
  const scrapePriority = Number(row.scrape_priority ?? 0);
  return {
    id: typeof row.id === "string" ? row.id : "",
    platform,
    source_scope:
      typeof row.source_scope === "string" && row.source_scope.trim()
        ? row.source_scope.trim()
        : "network",
    account_handle: accountHandle,
    is_active: row.is_active !== false,
    scrape_priority: Number.isFinite(scrapePriority) ? scrapePriority : 0,
    metadata: row.metadata ?? null,
    last_scrape_status: row.last_scrape_status ?? null,
    last_scrape_at: row.last_scrape_at ?? null,
    last_classified_at: row.last_classified_at ?? null,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const invalidBackendResponse = (message: string): never => {
  throw new AdminReadProxyError(message, 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });
};

const parseSharedAccountSourcesPayload = (value: unknown): SharedAccountSourcesPayload => {
  if (!isRecord(value) || !Array.isArray(value.sources)) {
    return invalidBackendResponse("Invalid shared account sources response from backend");
  }
  const sourceScope = normalizeSharedAccountSourceScope(
    typeof value.source_scope === "string" ? value.source_scope : null,
  );
  const sources = value.sources
    .map((source) => (isRecord(source) ? mapSharedSourceRow(source as SharedAccountSourcePayload) : null))
    .filter((source): source is SharedAccountSourceSummary => source !== null);
  return {
    source_scope: sourceScope,
    sources,
    using_defaults: value.using_defaults === true,
  };
};

const requireSuccess = (
  result: Awaited<ReturnType<typeof fetchAdminBackendJson>>,
  routeName: string,
): Record<string, unknown> => {
  if (result.status !== 200) {
    throw buildAdminBackendStatusError({
      status: result.status,
      data: result.data,
      fallbackMessage: "Shared account source request failed",
      routeName,
      requestRole: "primary",
    });
  }
  return result.data;
};

export const loadSharedAccountSourcesFromBackend = async (
  adminContext: VerifiedAdminContext,
  options: {
  sourceScope: SharedAccountSourceSetScope;
  includeInactive?: boolean;
  platforms?: readonly SocialLandingPlatform[] | null;
  },
): Promise<SharedAccountSourcesPayload> => {
  const query = new URLSearchParams({
    source_scope: options.sourceScope,
    include_inactive: String(options.includeInactive !== false),
  });
  if (options.platforms?.length) {
    query.set("platforms", options.platforms.join(","));
  }
  const routeName = "shared-account-sources:get";
  const result = await fetchAdminBackendJson(SHARED_ACCOUNT_SOURCES_BACKEND_PATH, {
    apiVersion: "v2",
    adminContext,
    queryString: query.toString(),
    routeName,
    requestRole: "primary",
  });
  return parseSharedAccountSourcesPayload(requireSuccess(result, routeName));
};

export const updateSharedAccountSourcesInBackend = async (
  adminContext: VerifiedAdminContext,
  body: string,
): Promise<SharedAccountSourcesPayload> => {
  const routeName = "shared-account-sources:put";
  const result = await fetchAdminBackendJson(SHARED_ACCOUNT_SOURCES_BACKEND_PATH, {
    apiVersion: "v2",
    adminContext,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
    routeName,
    requestRole: "primary",
  });
  return parseSharedAccountSourcesPayload(requireSuccess(result, routeName));
};
