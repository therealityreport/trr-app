import "server-only";

import {
  AdminReadProxyError,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

export interface CoveredShow {
  id: string;
  trr_show_id: string;
  show_name: string;
  canonical_slug: string | null;
  alternative_names: string[] | null;
  show_total_episodes: number | null;
  poster_url: string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COVERED_SHOW_KEYS = new Set([
  "id",
  "trr_show_id",
  "show_name",
  "canonical_slug",
  "alternative_names",
  "show_total_episodes",
  "poster_url",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const invalidBackendResponse = (): AdminReadProxyError =>
  new AdminReadProxyError("TRR-Backend returned an invalid covered-show response", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

export const parseCoveredShow = (value: unknown): CoveredShow => {
  if (!isRecord(value) || !hasExactKeys(value, COVERED_SHOW_KEYS)) {
    throw invalidBackendResponse();
  }
  const alternativeNames = value.alternative_names;
  const episodeCount = value.show_total_episodes;
  if (
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.trr_show_id !== "string" ||
    !UUID_PATTERN.test(value.trr_show_id) ||
    typeof value.show_name !== "string" ||
    value.show_name.trim().length === 0 ||
    (value.canonical_slug !== null && typeof value.canonical_slug !== "string") ||
    (alternativeNames !== null &&
      (!Array.isArray(alternativeNames) || alternativeNames.some((item) => typeof item !== "string"))) ||
    (episodeCount !== null &&
      (typeof episodeCount !== "number" || !Number.isInteger(episodeCount) || episodeCount < 0)) ||
    (value.poster_url !== null && typeof value.poster_url !== "string")
  ) {
    throw invalidBackendResponse();
  }
  return {
    id: value.id,
    trr_show_id: value.trr_show_id,
    show_name: value.show_name,
    canonical_slug: value.canonical_slug,
    alternative_names: alternativeNames,
    show_total_episodes: episodeCount,
    poster_url: value.poster_url,
  };
};

export const parseCoveredShowsPayload = (value: unknown): CoveredShow[] => {
  if (!isRecord(value) || !hasExactKeys(value, new Set(["shows"])) || !Array.isArray(value.shows)) {
    throw invalidBackendResponse();
  }
  return value.shows.map(parseCoveredShow);
};

export const parseCoveredShowPayload = (value: unknown): CoveredShow => {
  if (!isRecord(value) || !hasExactKeys(value, new Set(["show"]))) {
    throw invalidBackendResponse();
  }
  return parseCoveredShow(value.show);
};

export const parseCoveredShowDeletePayload = (value: unknown): { success: true } => {
  if (!isRecord(value) || !hasExactKeys(value, new Set(["success"])) || value.success !== true) {
    throw invalidBackendResponse();
  }
  return { success: true };
};

export async function getCoveredShows(options?: {
  adminContext?: VerifiedAdminContext;
}): Promise<CoveredShow[]> {
  const upstream = await fetchAdminBackendJson("/admin/covered-shows", {
    apiVersion: "v2",
    adminContext: options?.adminContext,
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: "social-landing:covered-shows",
  });
  if (upstream.status !== 200) {
    throw buildAdminBackendStatusError({
      status: upstream.status,
      data: upstream.data,
      fallbackMessage: "Failed to fetch covered shows",
      routeName: "social-landing:covered-shows",
    });
  }
  return parseCoveredShowsPayload(upstream.data);
}
