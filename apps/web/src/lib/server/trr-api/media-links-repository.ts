import "server-only";

import type { ThumbnailCrop } from "@/lib/thumbnail-crop";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  AdminReadProxyError,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
  type AdminBackendJsonResult,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

export interface MediaLinkRow {
  id: string;
  entity_type: string;
  entity_id: string;
  media_asset_id: string;
  kind: string;
  position: number | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateMediaLinkParams {
  media_asset_id: string;
  entity_type: "person" | "season" | "show" | "episode";
  entity_id: string;
  kind?: string;
  context?: Record<string, unknown>;
}

export interface CreateMediaLinkResult {
  link: MediaLinkRow;
  already_exists: boolean;
  message: string;
}

export interface MediaLinkContextPatch {
  people_count?: number | null;
  people_count_source?: "auto" | "manual" | null;
  thumbnail_crop?: ThumbnailCrop | null;
}

export interface MediaLinkContextResponse {
  link_id: string;
  people_count: number | null;
  people_count_source: "auto" | "manual" | null;
  thumbnail_crop: ThumbnailCrop | null;
}

type AdminOptions = { adminContext: VerifiedAdminContext };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_LINK_KEYS = new Set([
  "id",
  "entity_type",
  "entity_id",
  "media_asset_id",
  "kind",
  "position",
  "context",
  "created_at",
]);
const CREATE_MEDIA_LINK_RESPONSE_KEYS = new Set(["link", "already_exists", "message"]);
const MEDIA_LINK_LIST_RESPONSE_KEYS = new Set(["links"]);
const MEDIA_LINK_CONTEXT_RESPONSE_KEYS = new Set([
  "link_id",
  "people_count",
  "people_count_source",
  "thumbnail_crop",
]);
const THUMBNAIL_CROP_KEYS = new Set(["x", "y", "zoom", "mode"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const isJsonValue = (value: unknown): boolean => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (isRecord(value)) return Object.values(value).every(isJsonValue);
  return false;
};

const throwMediaLinkStatusError = (
  upstream: AdminBackendJsonResult,
  routeName: string,
  fallbackMessage: string,
): never => {
  throw buildAdminBackendStatusError({
    status: upstream.status,
    data: upstream.data,
    fallbackMessage,
    routeName,
    requestRole: "primary",
  });
};

const invalidResponse = (routeName: string): never => {
  throw new AdminReadProxyError("Invalid media-link response from backend", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: true,
    detail: { route: routeName },
  });
};

const parseMediaLinkRow = (value: unknown, routeName: string): MediaLinkRow => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, MEDIA_LINK_KEYS) ||
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.entity_type !== "string" ||
    value.entity_type.length === 0 ||
    typeof value.entity_id !== "string" ||
    !UUID_PATTERN.test(value.entity_id) ||
    typeof value.media_asset_id !== "string" ||
    !UUID_PATTERN.test(value.media_asset_id) ||
    typeof value.kind !== "string" ||
    value.kind.length === 0 ||
    (value.position !== null &&
      (typeof value.position !== "number" || !Number.isSafeInteger(value.position))) ||
    (value.context !== null && (!isRecord(value.context) || !isJsonValue(value.context))) ||
    typeof value.created_at !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value.created_at) ||
    !Number.isFinite(Date.parse(value.created_at))
  ) {
    return invalidResponse(routeName);
  }

  return {
    id: value.id,
    entity_type: value.entity_type,
    entity_id: value.entity_id,
    media_asset_id: value.media_asset_id,
    kind: value.kind,
    position: value.position,
    context: value.context,
    created_at: value.created_at,
  };
};

const parseThumbnailCrop = (value: unknown, routeName: string): ThumbnailCrop | null => {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, THUMBNAIL_CROP_KEYS) ||
    typeof value.x !== "number" ||
    !Number.isFinite(value.x) ||
    value.x < 0 ||
    value.x > 100 ||
    typeof value.y !== "number" ||
    !Number.isFinite(value.y) ||
    value.y < 0 ||
    value.y > 100 ||
    typeof value.zoom !== "number" ||
    !Number.isFinite(value.zoom) ||
    value.zoom < 1 ||
    value.zoom > 4 ||
    (value.mode !== "auto" && value.mode !== "manual")
  ) {
    return invalidResponse(routeName);
  }
  return { x: value.x, y: value.y, zoom: value.zoom, mode: value.mode };
};

const parseMediaLinkContextResponse = (
  value: unknown,
  routeName: string,
): MediaLinkContextResponse => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, MEDIA_LINK_CONTEXT_RESPONSE_KEYS) ||
    typeof value.link_id !== "string" ||
    !UUID_PATTERN.test(value.link_id) ||
    (value.people_count !== null &&
      (typeof value.people_count !== "number" ||
        !Number.isSafeInteger(value.people_count) ||
        value.people_count < 0)) ||
    (value.people_count_source !== null &&
      value.people_count_source !== "auto" &&
      value.people_count_source !== "manual")
  ) {
    return invalidResponse(routeName);
  }

  return {
    link_id: value.link_id,
    people_count: value.people_count,
    people_count_source: value.people_count_source,
    thumbnail_crop: parseThumbnailCrop(value.thumbnail_crop, routeName),
  };
};

export async function createMediaLink(
  params: CreateMediaLinkParams,
  options: AdminOptions,
): Promise<CreateMediaLinkResult> {
  const routeName = "admin-media-links-create";
  const upstream = await fetchAdminBackendJson("/admin/media-links", {
    adminContext: options.adminContext,
    apiVersion: "v2",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName,
    requestRole: "primary",
  });
  if (upstream.status !== 200) {
    throwMediaLinkStatusError(upstream, routeName, "Failed to create media link.");
  }
  if (
    !hasExactKeys(upstream.data, CREATE_MEDIA_LINK_RESPONSE_KEYS) ||
    typeof upstream.data.already_exists !== "boolean" ||
    typeof upstream.data.message !== "string"
  ) {
    return invalidResponse(routeName);
  }
  return {
    link: parseMediaLinkRow(upstream.data.link, routeName),
    already_exists: upstream.data.already_exists,
    message: upstream.data.message,
  };
}

export async function getAllLinksForAsset(
  mediaAssetId: string,
  options: AdminOptions,
): Promise<MediaLinkRow[]> {
  const routeName = "admin-media-links-list";
  const upstream = await fetchAdminBackendJson("/admin/media-links", {
    adminContext: options.adminContext,
    apiVersion: "v2",
    queryString: new URLSearchParams({ media_asset_id: mediaAssetId }).toString(),
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName,
    requestRole: "primary",
  });
  if (upstream.status !== 200) {
    throwMediaLinkStatusError(upstream, routeName, "Failed to load media links.");
  }
  if (!hasExactKeys(upstream.data, MEDIA_LINK_LIST_RESPONSE_KEYS) || !Array.isArray(upstream.data.links)) {
    return invalidResponse(routeName);
  }
  return upstream.data.links.map((link) => parseMediaLinkRow(link, routeName));
}

export async function updateMediaLinkContextById(
  linkId: string,
  patch: MediaLinkContextPatch,
  options: AdminOptions,
): Promise<MediaLinkContextResponse | null> {
  const routeName = "admin-media-link-context-update";
  const upstream = await fetchAdminBackendJson(
    `/admin/media-links/${encodeURIComponent(linkId)}/context`,
    {
      adminContext: options.adminContext,
      apiVersion: "v2",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName,
      requestRole: "primary",
    },
  );
  if (upstream.status === 404) return null;
  if (upstream.status !== 200) {
    throwMediaLinkStatusError(upstream, routeName, "Failed to update media-link context.");
  }
  return parseMediaLinkContextResponse(upstream.data, routeName);
}
