import "server-only";

import { normalizePersonExternalIdValue } from "@/lib/admin/person-external-ids";
import type {
  SharedAccountSourceSetScope,
  SharedAccountSourceSummary,
  SocialLandingPlatform,
} from "@/lib/admin/social-landing";
import { normalizeSocialAccountProfileHandle } from "@/lib/admin/show-admin-routes";
import { query } from "@/lib/server/postgres";

export type SharedAccountSourceLoadSource = "backend" | "local_db_fallback";

export type SharedAccountSourceLoadStatus = {
  source_scope: SharedAccountSourceSetScope;
  load_source: SharedAccountSourceLoadSource;
  warning: string | null;
  error_code?: string | null;
  error_message?: string | null;
};

type SharedAccountSourceRow = {
  id?: string | null;
  platform?: string | null;
  source_scope?: string | null;
  account_handle?: string | null;
  is_active?: boolean | null;
  scrape_priority?: number | string | null;
  metadata?: Record<string, unknown> | null;
  last_scrape_status?: string | null;
  last_scrape_at?: string | Date | null;
  last_classified_at?: string | Date | null;
};

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

const timestampToIsoString = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
};

const mapSharedSourceRow = (
  row: SharedAccountSourceRow,
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
    last_scrape_at: timestampToIsoString(row.last_scrape_at),
    last_classified_at: timestampToIsoString(row.last_classified_at),
  };
};

export const loadSharedAccountSourcesFromLocalDb = async (options: {
  sourceScope: SharedAccountSourceSetScope;
  includeInactive?: boolean;
  platforms?: readonly SocialLandingPlatform[] | null;
}): Promise<SharedAccountSourceSummary[]> => {
  const params: unknown[] = [options.sourceScope];
  const filters = ["source_scope = $1"];
  if (options.includeInactive === false) {
    filters.push("is_active = true");
  }
  if (options.platforms?.length) {
    params.push([...options.platforms]);
    filters.push(`platform = any($${params.length}::text[])`);
  }

  const result = await query(
    `
      select
        id::text as id,
        platform,
        source_scope,
        account_handle,
        is_active,
        scrape_priority,
        metadata,
        last_scrape_status,
        last_scrape_at,
        last_classified_at
      from social.shared_account_sources
      where ${filters.join(" and ")}
      order by scrape_priority asc, platform asc, account_handle asc
    `,
    params,
  );
  return (result.rows as SharedAccountSourceRow[])
    .map((row) => mapSharedSourceRow(row))
    .filter((source): source is SharedAccountSourceSummary => source !== null);
};
