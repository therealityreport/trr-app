import "server-only";

import type { NetworkStreamingEntityType } from "@/lib/admin/networks-streaming-entity";
import { normalizeEntityKey, toEntitySlug } from "@/lib/admin/networks-streaming-entity";
import { query } from "@/lib/server/postgres";

export interface NetworkStreamingSummaryRow {
  type: "network" | "streaming" | "production";
  name: string;
  available_show_count: number;
  added_show_count: number;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  wikidata_id: string | null;
  wikipedia_url: string | null;
  tmdb_entity_id: string | null;
  homepage_url: string | null;
  resolution_status: "resolved" | "manual_required" | "failed" | null;
  resolution_reason: string | null;
  last_attempt_at: string | null;
  has_logo: boolean;
  has_bw_variants: boolean;
  has_links: boolean;
}

export interface NetworkStreamingSummaryTotals {
  total_available_shows: number;
  total_added_shows: number;
}

export interface NetworkStreamingSummary {
  totals: NetworkStreamingSummaryTotals;
  rows: NetworkStreamingSummaryRow[];
  generated_at: string;
}

type TotalsRow = {
  total_available_shows: number;
  total_added_shows: number;
};

type SummaryRow = {
  type: "network" | "streaming" | "production";
  name: string;
  available_show_count: number;
  added_show_count: number;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  wikidata_id: string | null;
  wikipedia_url: string | null;
  tmdb_entity_id: string | null;
  homepage_url: string | null;
  resolution_status: "resolved" | "manual_required" | "failed" | null;
  resolution_reason: string | null;
  last_attempt_at: string | null;
};

export interface NetworkStreamingDetailInput {
  entity_type: NetworkStreamingEntityType;
  entity_key?: string | null;
  entity_slug?: string | null;
  show_scope: "added";
}

export interface NetworkStreamingDetailShowRow {
  trr_show_id: string;
  show_name: string;
  canonical_slug: string | null;
  poster_url: string | null;
}

export interface NetworkStreamingDetailLogoAsset {
  id: string;
  source: string;
  source_url: string;
  source_rank: number;
  hosted_logo_url: string | null;
  hosted_logo_content_type: string | null;
  base_logo_format: string;
  pixel_width: number | null;
  pixel_height: number | null;
  mirror_status: "mirrored" | "skipped" | "failed";
  failure_reason: string | null;
  is_primary: boolean;
  updated_at: string | null;
}

export interface NetworkStreamingSuggestion {
  entity_type: NetworkStreamingEntityType;
  name: string;
  entity_slug: string;
  available_show_count: number;
  added_show_count: number;
}

export interface NetworkStreamingDetail {
  entity_type: NetworkStreamingEntityType;
  entity_key: string;
  entity_slug: string;
  display_name: string;
  available_show_count: number;
  added_show_count: number;
  core: {
    entity_id: string | null;
    origin_country: string | null;
    display_priority: number | null;
    tmdb_logo_path: string | null;
    logo_path: string | null;
    hosted_logo_key: string | null;
    hosted_logo_url: string | null;
    hosted_logo_black_url: string | null;
    hosted_logo_white_url: string | null;
    wikidata_id: string | null;
    wikipedia_url: string | null;
    wikimedia_logo_file: string | null;
    link_enriched_at: string | null;
    link_enrichment_source: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
    tiktok_id: string | null;
  };
  override: {
    id: string | null;
    display_name_override: string | null;
    wikidata_id_override: string | null;
    wikipedia_url_override: string | null;
    logo_source_urls_override: string[];
    source_priority_override: string[];
    aliases_override: string[];
    notes: string | null;
    is_active: boolean;
    updated_by: string | null;
    updated_at: string | null;
  };
  completion: {
    resolution_status: "resolved" | "manual_required" | "failed" | null;
    resolution_reason: string | null;
    last_attempt_at: string | null;
  };
  logo_assets: NetworkStreamingDetailLogoAsset[];
  shows: NetworkStreamingDetailShowRow[];
}

type DetailEntityRow = {
  entity_type: NetworkStreamingEntityType;
  name_key: string;
  display_name: string;
  entity_slug: string;
  available_show_count: number;
  added_show_count: number;
  core_entity_id: string | null;
  core_origin_country: string | null;
  core_display_priority: number | null;
  core_tmdb_logo_path: string | null;
  core_logo_path: string | null;
  core_hosted_logo_key: string | null;
  core_hosted_logo_url: string | null;
  core_hosted_logo_black_url: string | null;
  core_hosted_logo_white_url: string | null;
  core_wikidata_id: string | null;
  core_wikipedia_url: string | null;
  core_wikimedia_logo_file: string | null;
  core_link_enriched_at: string | null;
  core_link_enrichment_source: string | null;
  core_facebook_id: string | null;
  core_instagram_id: string | null;
  core_twitter_id: string | null;
  core_tiktok_id: string | null;
  override_id: string | null;
  override_display_name_override: string | null;
  override_wikidata_id_override: string | null;
  override_wikipedia_url_override: string | null;
  override_logo_source_urls_override: unknown;
  override_source_priority_override: unknown;
  override_aliases_override: unknown;
  override_notes: string | null;
  override_is_active: boolean | null;
  override_updated_by: string | null;
  override_updated_at: string | null;
  completion_resolution_status: "resolved" | "manual_required" | "failed" | null;
  completion_resolution_reason: string | null;
  completion_last_attempt_at: string | null;
};

type DetailShowRow = {
  trr_show_id: string;
  show_name: string | null;
  canonical_slug: string | null;
  poster_url: string | null;
};

type DetailLogoAssetRow = {
  id: string | null;
  source: string | null;
  source_url: string | null;
  source_rank: number | null;
  hosted_logo_url: string | null;
  hosted_logo_content_type: string | null;
  base_logo_format: string | null;
  pixel_width: number | null;
  pixel_height: number | null;
  mirror_status: "mirrored" | "skipped" | "failed" | null;
  failure_reason: string | null;
  is_primary: boolean | null;
  updated_at: string | null;
};

type TableExistsRow = {
  exists: boolean | null;
};

type SuggestionRow = {
  entity_type: NetworkStreamingEntityType;
  name: string;
  entity_slug: string;
  available_show_count: number;
  added_show_count: number;
};

const SHOW_SLUG_SQL = `
  lower(
    trim(
      both '-' FROM regexp_replace(
        regexp_replace(COALESCE(s.name, ''), '&', ' and ', 'gi'),
        '[^a-z0-9]+',
        '-',
        'gi'
      )
    )
  )
`;

const NETWORK_STREAMING_ENTITY_REGISTRY_CTE_SQL = `
  WITH added AS (
    SELECT DISTINCT btrim(cs.trr_show_id::text) AS show_id
    FROM admin.covered_shows cs
    WHERE btrim(cs.trr_show_id::text) <> ''
  ),
  network_source AS (
    SELECT
      s.id AS show_id,
      btrim(network_name) AS display_name,
      lower(btrim(network_name)) AS name_key
    FROM core.shows s
    CROSS JOIN LATERAL unnest(COALESCE(s.networks, ARRAY[]::text[])) AS network_name
    WHERE btrim(network_name) <> ''
  ),
  network_grouped AS (
    SELECT
      ns.name_key,
      MIN(ns.display_name) AS name,
      COUNT(DISTINCT ns.show_id)::int AS available_show_count,
      COUNT(DISTINCT CASE WHEN a.show_id IS NOT NULL THEN ns.show_id END)::int AS added_show_count
    FROM network_source ns
    LEFT JOIN added a ON a.show_id = ns.show_id::text
    GROUP BY ns.name_key
  ),
  provider_primary AS (
    SELECT
      swp.show_id::uuid AS show_id,
      btrim(wp.provider_name) AS display_name,
      lower(btrim(wp.provider_name)) AS name_key
    FROM core.show_watch_providers swp
    JOIN core.watch_providers wp ON wp.provider_id = swp.provider_id
    WHERE btrim(COALESCE(wp.provider_name, '')) <> ''
  ),
  provider_primary_grouped AS (
    SELECT
      pp.name_key,
      MIN(pp.display_name) AS name,
      COUNT(DISTINCT pp.show_id)::int AS available_show_count,
      COUNT(DISTINCT CASE WHEN a.show_id IS NOT NULL THEN pp.show_id END)::int AS added_show_count
    FROM provider_primary pp
    LEFT JOIN added a ON a.show_id = pp.show_id::text
    GROUP BY pp.name_key
  ),
  provider_fallback AS (
    SELECT
      s.id::uuid AS show_id,
      btrim(provider_name) AS display_name,
      lower(btrim(provider_name)) AS name_key
    FROM core.shows s
    CROSS JOIN LATERAL unnest(COALESCE(s.streaming_providers, ARRAY[]::text[])) AS provider_name
    WHERE btrim(provider_name) <> ''
  ),
  provider_fallback_grouped AS (
    SELECT
      pf.name_key,
      MIN(pf.display_name) AS name,
      COUNT(DISTINCT pf.show_id)::int AS available_show_count,
      COUNT(DISTINCT CASE WHEN a.show_id IS NOT NULL THEN pf.show_id END)::int AS added_show_count
    FROM provider_fallback pf
    LEFT JOIN added a ON a.show_id = pf.show_id::text
    LEFT JOIN provider_primary_grouped ppg ON ppg.name_key = pf.name_key
    WHERE ppg.name_key IS NULL
    GROUP BY pf.name_key
  ),
  provider_grouped AS (
    SELECT * FROM provider_primary_grouped
    UNION ALL
    SELECT * FROM provider_fallback_grouped
  ),
  production_source AS (
    SELECT
      s.id AS show_id,
      btrim(pc.name) AS display_name,
      lower(btrim(pc.name)) AS name_key
    FROM core.shows s
    CROSS JOIN LATERAL unnest(COALESCE(s.tmdb_production_company_ids, ARRAY[]::int[])) AS pc_id
    JOIN core.production_companies pc ON pc.id = pc_id
    WHERE btrim(pc.name) <> ''
  ),
  production_grouped AS (
    SELECT
      ps.name_key,
      MIN(ps.display_name) AS name,
      COUNT(DISTINCT ps.show_id)::int AS available_show_count,
      COUNT(DISTINCT CASE WHEN a.show_id IS NOT NULL THEN ps.show_id END)::int AS added_show_count
    FROM production_source ps
    LEFT JOIN added a ON a.show_id = ps.show_id::text
    GROUP BY ps.name_key
  ),
  entity_registry AS (
    SELECT
      'network'::text AS type,
      ng.name_key,
      ng.name,
      ng.available_show_count,
      ng.added_show_count,
      lower(
        trim(
          both '-' FROM regexp_replace(
            regexp_replace(ng.name, '&', ' and ', 'gi'),
            '[^a-z0-9]+',
            '-',
            'gi'
          )
        )
      ) AS entity_slug
    FROM network_grouped ng
    UNION ALL
    SELECT
      'streaming'::text AS type,
      pg.name_key,
      pg.name,
      pg.available_show_count,
      pg.added_show_count,
      lower(
        trim(
          both '-' FROM regexp_replace(
            regexp_replace(pg.name, '&', ' and ', 'gi'),
            '[^a-z0-9]+',
            '-',
            'gi'
          )
        )
      ) AS entity_slug
    FROM provider_grouped pg
    UNION ALL
    SELECT
      'production'::text AS type,
      pcg.name_key,
      pcg.name,
      pcg.available_show_count,
      pcg.added_show_count,
      lower(
        trim(
          both '-' FROM regexp_replace(
            regexp_replace(pcg.name, '&', ' and ', 'gi'),
            '[^a-z0-9]+',
            '-',
            'gi'
          )
        )
      ) AS entity_slug
    FROM production_grouped pcg
  )
`;

const toInt = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toStringOrNull = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

const toNullableInt = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const toOverrideLogoUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const urls: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim().length > 0) {
      urls.push(entry.trim());
      continue;
    }
    if (entry && typeof entry === "object") {
      const maybeUrl = (entry as { url?: unknown }).url;
      if (typeof maybeUrl === "string" && maybeUrl.trim().length > 0) {
        urls.push(maybeUrl.trim());
      }
    }
  }
  return urls;
};

const isMissingRelationError = (error: unknown): boolean => {
  const code = (error as { code?: string } | null)?.code;
  if (code === "3F000" || code === "42P01") return true;
  const message = (error as { message?: string } | null)?.message;
  return typeof message === "string" && /relation .* does not exist/i.test(message);
};

const tableExists = async (qualifiedName: string): Promise<boolean> => {
  const result = await query<TableExistsRow>("SELECT to_regclass($1) IS NOT NULL AS exists", [qualifiedName]);
  return Boolean(result.rows[0]?.exists);
};

export async function getNetworksStreamingSummary(): Promise<NetworkStreamingSummary> {
  const totalsResult = await query<TotalsRow>(
    `
      WITH added AS (
        SELECT DISTINCT btrim(cs.trr_show_id::text) AS show_id
        FROM admin.covered_shows cs
        WHERE btrim(cs.trr_show_id::text) <> ''
      )
      SELECT
        (SELECT COUNT(*)::int FROM core.shows) AS total_available_shows,
        (
          SELECT COUNT(DISTINCT s.id)::int
          FROM core.shows s
          JOIN added a ON a.show_id = s.id::text
        ) AS total_added_shows
    `,
  );

  const rowsResult = await query<SummaryRow>(
    `
      WITH added AS (
        SELECT DISTINCT btrim(cs.trr_show_id::text) AS show_id
        FROM admin.covered_shows cs
        WHERE btrim(cs.trr_show_id::text) <> ''
      ),
      network_source AS (
        SELECT
          s.id AS show_id,
          btrim(network_name) AS display_name,
          lower(btrim(network_name)) AS name_key
        FROM core.shows s
        CROSS JOIN LATERAL unnest(COALESCE(s.networks, ARRAY[]::text[])) AS network_name
        WHERE btrim(network_name) <> ''
      ),
      network_grouped AS (
        SELECT
          ns.name_key,
          MIN(ns.display_name) AS name,
          COUNT(DISTINCT ns.show_id)::int AS available_show_count,
          COUNT(DISTINCT CASE WHEN a.show_id IS NOT NULL THEN ns.show_id END)::int AS added_show_count
        FROM network_source ns
        LEFT JOIN added a ON a.show_id = ns.show_id::text
        GROUP BY ns.name_key
      ),
      network_rows AS (
        SELECT
          'network'::text AS type,
          ng.name,
          ng.available_show_count,
          ng.added_show_count,
          meta.hosted_logo_url,
          meta.hosted_logo_black_url,
          meta.hosted_logo_white_url,
          meta.wikidata_id,
          meta.wikipedia_url,
          meta.tmdb_entity_id,
          meta.homepage_url,
          comp.resolution_status,
          comp.resolution_reason,
          comp.last_attempt_at
        FROM network_grouped ng
        LEFT JOIN LATERAL (
          SELECT
            n.hosted_logo_url AS hosted_logo_url,
            n.hosted_logo_black_url AS hosted_logo_black_url,
            n.hosted_logo_white_url AS hosted_logo_white_url,
            n.wikidata_id AS wikidata_id,
            n.wikipedia_url AS wikipedia_url,
            n.id::text AS tmdb_entity_id,
            (n.tmdb_meta->>'homepage')::text AS homepage_url
          FROM core.networks n
          WHERE lower(btrim(n.name)) = ng.name_key
          ORDER BY n.id ASC
          LIMIT 1
        ) meta ON true
        LEFT JOIN LATERAL (
          SELECT
            c.resolution_status AS resolution_status,
            c.resolution_reason AS resolution_reason,
            c.last_attempt_at AS last_attempt_at
          FROM admin.network_streaming_completion c
          WHERE c.entity_type = 'network'
            AND c.entity_key = ng.name_key
          ORDER BY c.updated_at DESC
          LIMIT 1
        ) comp ON true
      ),
      provider_primary AS (
        SELECT
          swp.show_id::uuid AS show_id,
          btrim(wp.provider_name) AS display_name,
          lower(btrim(wp.provider_name)) AS name_key
        FROM core.show_watch_providers swp
        JOIN core.watch_providers wp ON wp.provider_id = swp.provider_id
        WHERE btrim(COALESCE(wp.provider_name, '')) <> ''
      ),
      provider_primary_grouped AS (
        SELECT
          pp.name_key,
          MIN(pp.display_name) AS name,
          COUNT(DISTINCT pp.show_id)::int AS available_show_count,
          COUNT(DISTINCT CASE WHEN a.show_id IS NOT NULL THEN pp.show_id END)::int AS added_show_count
        FROM provider_primary pp
        LEFT JOIN added a ON a.show_id = pp.show_id::text
        GROUP BY pp.name_key
      ),
      provider_fallback AS (
        SELECT
          s.id::uuid AS show_id,
          btrim(provider_name) AS display_name,
          lower(btrim(provider_name)) AS name_key
        FROM core.shows s
        CROSS JOIN LATERAL unnest(COALESCE(s.streaming_providers, ARRAY[]::text[])) AS provider_name
        WHERE btrim(provider_name) <> ''
      ),
      provider_fallback_grouped AS (
        SELECT
          pf.name_key,
          MIN(pf.display_name) AS name,
          COUNT(DISTINCT pf.show_id)::int AS available_show_count,
          COUNT(DISTINCT CASE WHEN a.show_id IS NOT NULL THEN pf.show_id END)::int AS added_show_count
        FROM provider_fallback pf
        LEFT JOIN added a ON a.show_id = pf.show_id::text
        LEFT JOIN provider_primary_grouped ppg ON ppg.name_key = pf.name_key
        WHERE ppg.name_key IS NULL
        GROUP BY pf.name_key
      ),
      provider_grouped AS (
        SELECT * FROM provider_primary_grouped
        UNION ALL
        SELECT * FROM provider_fallback_grouped
      ),
      provider_rows AS (
        SELECT
          'streaming'::text AS type,
          pg.name,
          pg.available_show_count,
          pg.added_show_count,
          meta.hosted_logo_url,
          meta.hosted_logo_black_url,
          meta.hosted_logo_white_url,
          meta.wikidata_id,
          meta.wikipedia_url,
          meta.tmdb_entity_id,
          meta.homepage_url,
          comp.resolution_status,
          comp.resolution_reason,
          comp.last_attempt_at
        FROM provider_grouped pg
        LEFT JOIN LATERAL (
          SELECT
            wp.hosted_logo_url AS hosted_logo_url,
            wp.hosted_logo_black_url AS hosted_logo_black_url,
            wp.hosted_logo_white_url AS hosted_logo_white_url,
            wp.wikidata_id AS wikidata_id,
            wp.wikipedia_url AS wikipedia_url,
            wp.provider_id::text AS tmdb_entity_id,
            (wp.tmdb_meta->>'homepage')::text AS homepage_url
          FROM core.watch_providers wp
          WHERE lower(btrim(wp.provider_name)) = pg.name_key
          ORDER BY wp.provider_id ASC
          LIMIT 1
        ) meta ON true
        LEFT JOIN LATERAL (
          SELECT
            c.resolution_status AS resolution_status,
            c.resolution_reason AS resolution_reason,
            c.last_attempt_at AS last_attempt_at
          FROM admin.network_streaming_completion c
          WHERE c.entity_type = 'streaming'
            AND c.entity_key = pg.name_key
          ORDER BY c.updated_at DESC
          LIMIT 1
        ) comp ON true
      ),
      production_source AS (
        SELECT
          s.id AS show_id,
          btrim(pc.name) AS display_name,
          lower(btrim(pc.name)) AS name_key
        FROM core.shows s
        CROSS JOIN LATERAL unnest(COALESCE(s.tmdb_production_company_ids, ARRAY[]::int[])) AS pc_id
        JOIN core.production_companies pc ON pc.id = pc_id
        WHERE btrim(pc.name) <> ''
      ),
      production_grouped AS (
        SELECT
          ps.name_key,
          MIN(ps.display_name) AS name,
          COUNT(DISTINCT ps.show_id)::int AS available_show_count,
          COUNT(DISTINCT CASE WHEN a.show_id IS NOT NULL THEN ps.show_id END)::int AS added_show_count
        FROM production_source ps
        LEFT JOIN added a ON a.show_id = ps.show_id::text
        GROUP BY ps.name_key
      ),
      production_rows AS (
        SELECT
          'production'::text AS type,
          pcg.name,
          pcg.available_show_count,
          pcg.added_show_count,
          meta.hosted_logo_url,
          meta.hosted_logo_black_url,
          meta.hosted_logo_white_url,
          meta.wikidata_id,
          meta.wikipedia_url,
          meta.tmdb_entity_id,
          meta.homepage_url,
          comp.resolution_status,
          comp.resolution_reason,
          comp.last_attempt_at
        FROM production_grouped pcg
        LEFT JOIN LATERAL (
          SELECT
            pc.hosted_logo_url AS hosted_logo_url,
            pc.hosted_logo_black_url AS hosted_logo_black_url,
            pc.hosted_logo_white_url AS hosted_logo_white_url,
            pc.wikidata_id AS wikidata_id,
            pc.wikipedia_url AS wikipedia_url,
            pc.id::text AS tmdb_entity_id,
            (pc.tmdb_meta->>'homepage')::text AS homepage_url
          FROM core.production_companies pc
          WHERE lower(btrim(pc.name)) = pcg.name_key
          ORDER BY pc.id ASC
          LIMIT 1
        ) meta ON true
        LEFT JOIN LATERAL (
          SELECT
            c.resolution_status AS resolution_status,
            c.resolution_reason AS resolution_reason,
            c.last_attempt_at AS last_attempt_at
          FROM admin.network_streaming_completion c
          WHERE c.entity_type = 'production'
            AND c.entity_key = pcg.name_key
          ORDER BY c.updated_at DESC
          LIMIT 1
        ) comp ON true
      )
      SELECT *
      FROM (
        SELECT * FROM network_rows
        UNION ALL
        SELECT * FROM provider_rows
        UNION ALL
        SELECT * FROM production_rows
      ) all_rows
      ORDER BY type ASC, added_show_count DESC, available_show_count DESC, name ASC
    `,
  );

  const totalsRow = totalsResult.rows[0] ?? { total_available_shows: 0, total_added_shows: 0 };
  const rows: NetworkStreamingSummaryRow[] = rowsResult.rows.map((row) => {
    const hostedLogoUrl = typeof row.hosted_logo_url === "string" ? row.hosted_logo_url : null;
    const hostedLogoBlackUrl = typeof row.hosted_logo_black_url === "string" ? row.hosted_logo_black_url : null;
    const hostedLogoWhiteUrl = typeof row.hosted_logo_white_url === "string" ? row.hosted_logo_white_url : null;
    const wikidataId = typeof row.wikidata_id === "string" ? row.wikidata_id : null;
    const wikipediaUrl = typeof row.wikipedia_url === "string" ? row.wikipedia_url : null;
    const tmdbEntityId = typeof row.tmdb_entity_id === "string" ? row.tmdb_entity_id : null;
    const homepageUrl = typeof row.homepage_url === "string" && row.homepage_url.trim().length > 0 ? row.homepage_url.trim() : null;
    const resolutionStatus =
      row.resolution_status === "resolved" || row.resolution_status === "manual_required" || row.resolution_status === "failed"
        ? row.resolution_status
        : null;
    const resolutionReason = typeof row.resolution_reason === "string" ? row.resolution_reason : null;
    const lastAttemptAt = typeof row.last_attempt_at === "string" ? row.last_attempt_at : null;
    return {
      type: row.type,
      name: row.name,
      available_show_count: toInt(row.available_show_count),
      added_show_count: toInt(row.added_show_count),
      hosted_logo_url: hostedLogoUrl,
      hosted_logo_black_url: hostedLogoBlackUrl,
      hosted_logo_white_url: hostedLogoWhiteUrl,
      wikidata_id: wikidataId,
      wikipedia_url: wikipediaUrl,
      tmdb_entity_id: tmdbEntityId,
      homepage_url: homepageUrl,
      resolution_status: resolutionStatus,
      resolution_reason: resolutionReason,
      last_attempt_at: lastAttemptAt,
      has_logo: Boolean(hostedLogoUrl),
      has_bw_variants: Boolean(hostedLogoBlackUrl && hostedLogoWhiteUrl),
      has_links: Boolean(wikidataId && wikipediaUrl),
    };
  });

  return {
    totals: {
      total_available_shows: toInt(totalsRow.total_available_shows),
      total_added_shows: toInt(totalsRow.total_added_shows),
    },
    rows,
    generated_at: new Date().toISOString(),
  };
}

export async function getNetworkStreamingDetail(
  input: NetworkStreamingDetailInput,
): Promise<NetworkStreamingDetail | null> {
  if (input.show_scope !== "added") {
    throw new Error("Unsupported show scope");
  }

  const normalizedEntityKey = normalizeEntityKey(input.entity_key ?? "");
  const normalizedEntitySlug = toEntitySlug(input.entity_slug ?? "");

  const entityResult = await query<DetailEntityRow>(
    `
      ${NETWORK_STREAMING_ENTITY_REGISTRY_CTE_SQL},
      target_entity AS (
        SELECT *
        FROM entity_registry er
        WHERE er.type = $1
          AND (
            ($2 <> '' AND er.name_key = $2)
            OR ($2 = '' AND $3 <> '' AND er.entity_slug = $3)
          )
        ORDER BY er.added_show_count DESC, er.available_show_count DESC, er.name ASC
        LIMIT 1
      )
      SELECT
        t.type AS entity_type,
        t.name_key,
        t.name AS display_name,
        t.entity_slug,
        t.available_show_count,
        t.added_show_count,
        CASE
          WHEN t.type = 'network' THEN n.id::text
          WHEN t.type = 'streaming' THEN wp.provider_id::text
          WHEN t.type = 'production' THEN pc.id::text
        END AS core_entity_id,
        COALESCE(n.origin_country, pc.origin_country) AS core_origin_country,
        wp.display_priority AS core_display_priority,
        COALESCE(n.tmdb_logo_path, wp.tmdb_logo_path, pc.tmdb_logo_path) AS core_tmdb_logo_path,
        COALESCE(n.logo_path, wp.logo_path, pc.logo_path) AS core_logo_path,
        COALESCE(n.hosted_logo_key, wp.hosted_logo_key, pc.hosted_logo_key) AS core_hosted_logo_key,
        COALESCE(n.hosted_logo_url, wp.hosted_logo_url, pc.hosted_logo_url) AS core_hosted_logo_url,
        COALESCE(n.hosted_logo_black_url, wp.hosted_logo_black_url, pc.hosted_logo_black_url) AS core_hosted_logo_black_url,
        COALESCE(n.hosted_logo_white_url, wp.hosted_logo_white_url, pc.hosted_logo_white_url) AS core_hosted_logo_white_url,
        COALESCE(n.wikidata_id, wp.wikidata_id, pc.wikidata_id) AS core_wikidata_id,
        COALESCE(n.wikipedia_url, wp.wikipedia_url, pc.wikipedia_url) AS core_wikipedia_url,
        COALESCE(n.wikimedia_logo_file, wp.wikimedia_logo_file, pc.wikimedia_logo_file) AS core_wikimedia_logo_file,
        COALESCE(n.link_enriched_at::text, wp.link_enriched_at::text, pc.link_enriched_at::text) AS core_link_enriched_at,
        COALESCE(n.link_enrichment_source, wp.link_enrichment_source, pc.link_enrichment_source) AS core_link_enrichment_source,
        COALESCE(n.facebook_id, wp.facebook_id) AS core_facebook_id,
        COALESCE(n.instagram_id, wp.instagram_id) AS core_instagram_id,
        COALESCE(n.twitter_id, wp.twitter_id) AS core_twitter_id,
        COALESCE(n.tiktok_id, wp.tiktok_id) AS core_tiktok_id,
        ov.id::text AS override_id,
        ov.display_name_override AS override_display_name_override,
        ov.wikidata_id_override AS override_wikidata_id_override,
        ov.wikipedia_url_override AS override_wikipedia_url_override,
        ov.logo_source_urls_override AS override_logo_source_urls_override,
        ov.source_priority_override AS override_source_priority_override,
        ov.aliases_override AS override_aliases_override,
        ov.notes AS override_notes,
        ov.is_active AS override_is_active,
        ov.updated_by AS override_updated_by,
        ov.updated_at::text AS override_updated_at,
        comp.resolution_status AS completion_resolution_status,
        comp.resolution_reason AS completion_resolution_reason,
        comp.last_attempt_at::text AS completion_last_attempt_at
      FROM target_entity t
      LEFT JOIN LATERAL (
        SELECT *
        FROM core.networks n
        WHERE t.type = 'network'
          AND lower(btrim(n.name)) = t.name_key
        ORDER BY n.id ASC
        LIMIT 1
      ) n ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM core.watch_providers wp
        WHERE t.type = 'streaming'
          AND lower(btrim(wp.provider_name)) = t.name_key
        ORDER BY wp.provider_id ASC
        LIMIT 1
      ) wp ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM core.production_companies pc
        WHERE t.type = 'production'
          AND lower(btrim(pc.name)) = t.name_key
        ORDER BY pc.id ASC
        LIMIT 1
      ) pc ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM admin.network_streaming_overrides ov
        WHERE ov.entity_type = t.type
          AND ov.entity_key = t.name_key
          AND ov.is_active = true
        ORDER BY ov.updated_at DESC
        LIMIT 1
      ) ov ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM admin.network_streaming_completion c
        WHERE c.entity_type = t.type
          AND c.entity_key = t.name_key
        ORDER BY c.updated_at DESC
        LIMIT 1
      ) comp ON true
    `,
    [input.entity_type, normalizedEntityKey, normalizedEntitySlug],
  );

  const entity = entityResult.rows[0];
  if (!entity) {
    return null;
  }

  const showsResult = await query<DetailShowRow>(
    `
      WITH added AS (
        SELECT DISTINCT btrim(cs.trr_show_id::text) AS show_id
        FROM admin.covered_shows cs
        WHERE btrim(cs.trr_show_id::text) <> ''
      ),
      provider_primary_names AS (
        SELECT DISTINCT lower(btrim(wp.provider_name)) AS name_key
        FROM core.show_watch_providers swp
        JOIN core.watch_providers wp ON wp.provider_id = swp.provider_id
        WHERE btrim(COALESCE(wp.provider_name, '')) <> ''
      ),
      network_show_source AS (
        SELECT DISTINCT s.id AS show_id
        FROM core.shows s
        WHERE $1 = 'network'
          AND EXISTS (
            SELECT 1
            FROM unnest(COALESCE(s.networks, ARRAY[]::text[])) AS network_name
            WHERE btrim(network_name) <> ''
              AND lower(btrim(network_name)) = $2
          )
      ),
      streaming_show_source AS (
        SELECT DISTINCT swp.show_id AS show_id
        FROM core.show_watch_providers swp
        JOIN core.watch_providers wp ON wp.provider_id = swp.provider_id
        WHERE $1 = 'streaming'
          AND lower(btrim(wp.provider_name)) = $2
      ),
      streaming_fallback_show_source AS (
        SELECT DISTINCT s.id AS show_id
        FROM core.shows s
        LEFT JOIN provider_primary_names pp ON pp.name_key = $2
        WHERE $1 = 'streaming'
          AND pp.name_key IS NULL
          AND EXISTS (
            SELECT 1
            FROM unnest(COALESCE(s.streaming_providers, ARRAY[]::text[])) AS provider_name
            WHERE btrim(provider_name) <> ''
              AND lower(btrim(provider_name)) = $2
          )
      ),
      production_show_source AS (
        SELECT DISTINCT s.id AS show_id
        FROM core.shows s
        WHERE $1 = 'production'
          AND EXISTS (
            SELECT 1
            FROM unnest(COALESCE(s.tmdb_production_company_ids, ARRAY[]::int[])) AS pc_id
            JOIN core.production_companies pc ON pc.id = pc_id
            WHERE lower(btrim(pc.name)) = $2
          )
      ),
      entity_show_source AS (
        SELECT show_id FROM network_show_source
        UNION
        SELECT show_id FROM streaming_show_source
        UNION
        SELECT show_id FROM streaming_fallback_show_source
        UNION
        SELECT show_id FROM production_show_source
      ),
      shows_with_slug AS (
        SELECT
          s.*,
          ${SHOW_SLUG_SQL} AS slug,
          COUNT(*) OVER (PARTITION BY ${SHOW_SLUG_SQL}) AS slug_collision_count
        FROM core.shows AS s
      )
      SELECT DISTINCT
        es.show_id::text AS trr_show_id,
        COALESCE(
          NULLIF(btrim(cs.show_name), ''),
          NULLIF(btrim(s.name), ''),
          es.show_id::text
        ) AS show_name,
        CASE
          WHEN s.slug_collision_count > 1
            THEN s.slug || '--' || lower(left(s.id::text, 8))
          ELSE s.slug
        END AS canonical_slug,
        si.hosted_url AS poster_url
      FROM entity_show_source es
      JOIN added a ON a.show_id = es.show_id::text
      LEFT JOIN admin.covered_shows cs ON cs.trr_show_id::text = es.show_id::text
      LEFT JOIN shows_with_slug s ON s.id = es.show_id
      LEFT JOIN core.show_images si ON si.id = s.primary_poster_image_id
      ORDER BY show_name ASC
    `,
    [entity.entity_type, entity.name_key],
  );

  let logoAssets: NetworkStreamingDetailLogoAsset[] = [];
  const logoAssetsTableName = "admin.network_streaming_logo_assets";
  const hasLogoAssetsTable = await tableExists(logoAssetsTableName);
  if (!hasLogoAssetsTable) {
    console.warn(
      `[networks-streaming-repository] missing_relation table=${logoAssetsTableName} entity_type=${entity.entity_type} entity_key=${entity.name_key}`,
    );
  } else {
    try {
      const logoAssetsResult = await query<DetailLogoAssetRow>(
        `
          SELECT
            la.id::text AS id,
            la.source,
            la.source_url,
            la.source_rank,
            la.hosted_logo_url,
            la.hosted_logo_content_type,
            la.base_logo_format,
            la.pixel_width,
            la.pixel_height,
            la.mirror_status,
            la.failure_reason,
            la.is_primary,
            la.updated_at::text AS updated_at
          FROM admin.network_streaming_logo_assets la
          WHERE la.entity_type = $1
            AND la.entity_key = $2
          ORDER BY
            la.is_primary DESC,
            CASE la.source
              WHEN 'override' THEN 1
              WHEN 'tmdb' THEN 2
              WHEN 'wikimedia' THEN 3
              WHEN 'official' THEN 4
              WHEN 'catalog' THEN 5
              WHEN 'imdb' THEN 6
              ELSE 99
            END ASC,
            la.source_rank ASC,
            la.updated_at DESC
        `,
        [entity.entity_type, entity.name_key],
      );
      logoAssets = logoAssetsResult.rows
        .filter((row) => toStringOrNull(row.id))
        .map((row) => ({
          id: toStringOrNull(row.id) ?? "",
          source: toStringOrNull(row.source) ?? "catalog",
          source_url: toStringOrNull(row.source_url) ?? "",
          source_rank: toInt(row.source_rank),
          hosted_logo_url: toStringOrNull(row.hosted_logo_url),
          hosted_logo_content_type: toStringOrNull(row.hosted_logo_content_type),
          base_logo_format: toStringOrNull(row.base_logo_format) ?? "unknown",
          pixel_width: toNullableInt(row.pixel_width),
          pixel_height: toNullableInt(row.pixel_height),
          mirror_status:
            row.mirror_status === "mirrored" || row.mirror_status === "skipped" || row.mirror_status === "failed"
              ? row.mirror_status
              : "failed",
          failure_reason: toStringOrNull(row.failure_reason),
          is_primary: Boolean(row.is_primary),
          updated_at: toStringOrNull(row.updated_at),
        }));
    } catch (error) {
      if (isMissingRelationError(error)) {
        console.warn(
          `[networks-streaming-repository] missing_relation table=${logoAssetsTableName} entity_type=${entity.entity_type} entity_key=${entity.name_key}`,
        );
      } else {
        throw error;
      }
    }
  }

  return {
    entity_type: entity.entity_type,
    entity_key: entity.name_key,
    entity_slug: toEntitySlug(entity.entity_slug || entity.display_name),
    display_name: entity.display_name,
    available_show_count: toInt(entity.available_show_count),
    added_show_count: toInt(entity.added_show_count),
    core: {
      entity_id: toStringOrNull(entity.core_entity_id),
      origin_country: toStringOrNull(entity.core_origin_country),
      display_priority: toNullableInt(entity.core_display_priority),
      tmdb_logo_path: toStringOrNull(entity.core_tmdb_logo_path),
      logo_path: toStringOrNull(entity.core_logo_path),
      hosted_logo_key: toStringOrNull(entity.core_hosted_logo_key),
      hosted_logo_url: toStringOrNull(entity.core_hosted_logo_url),
      hosted_logo_black_url: toStringOrNull(entity.core_hosted_logo_black_url),
      hosted_logo_white_url: toStringOrNull(entity.core_hosted_logo_white_url),
      wikidata_id: toStringOrNull(entity.core_wikidata_id),
      wikipedia_url: toStringOrNull(entity.core_wikipedia_url),
      wikimedia_logo_file: toStringOrNull(entity.core_wikimedia_logo_file),
      link_enriched_at: toStringOrNull(entity.core_link_enriched_at),
      link_enrichment_source: toStringOrNull(entity.core_link_enrichment_source),
      facebook_id: toStringOrNull(entity.core_facebook_id),
      instagram_id: toStringOrNull(entity.core_instagram_id),
      twitter_id: toStringOrNull(entity.core_twitter_id),
      tiktok_id: toStringOrNull(entity.core_tiktok_id),
    },
    override: {
      id: toStringOrNull(entity.override_id),
      display_name_override: toStringOrNull(entity.override_display_name_override),
      wikidata_id_override: toStringOrNull(entity.override_wikidata_id_override),
      wikipedia_url_override: toStringOrNull(entity.override_wikipedia_url_override),
      logo_source_urls_override: toOverrideLogoUrls(entity.override_logo_source_urls_override),
      source_priority_override: toStringArray(entity.override_source_priority_override),
      aliases_override: toStringArray(entity.override_aliases_override),
      notes: toStringOrNull(entity.override_notes),
      is_active: Boolean(entity.override_is_active),
      updated_by: toStringOrNull(entity.override_updated_by),
      updated_at: toStringOrNull(entity.override_updated_at),
    },
    completion: {
      resolution_status:
        entity.completion_resolution_status === "resolved" ||
        entity.completion_resolution_status === "manual_required" ||
        entity.completion_resolution_status === "failed"
          ? entity.completion_resolution_status
          : null,
      resolution_reason: toStringOrNull(entity.completion_resolution_reason),
      last_attempt_at: toStringOrNull(entity.completion_last_attempt_at),
    },
    logo_assets: logoAssets,
    shows: showsResult.rows.map((row) => ({
      trr_show_id: row.trr_show_id,
      show_name: toStringOrNull(row.show_name) ?? row.trr_show_id,
      canonical_slug: toStringOrNull(row.canonical_slug),
      poster_url: toStringOrNull(row.poster_url),
    })),
  };
}

export async function getNetworkStreamingSuggestions(
  input: Pick<NetworkStreamingDetailInput, "entity_type" | "entity_key" | "entity_slug">,
): Promise<NetworkStreamingSuggestion[]> {
  const normalizedEntityKey = normalizeEntityKey(input.entity_key ?? "");
  const normalizedEntitySlug = toEntitySlug(input.entity_slug ?? "");

  const rows = await query<SuggestionRow>(
    `
      ${NETWORK_STREAMING_ENTITY_REGISTRY_CTE_SQL},
      ranked AS (
        SELECT
          er.type AS entity_type,
          er.name,
          er.entity_slug,
          er.available_show_count,
          er.added_show_count,
          CASE
            WHEN $2 <> '' AND er.entity_slug = $2 THEN 120
            WHEN $2 <> '' AND er.entity_slug LIKE ('%' || $2 || '%') THEN 100
            WHEN $2 <> '' AND $2 LIKE ('%' || er.entity_slug || '%') THEN 90
            WHEN $3 <> '' AND er.name_key = $3 THEN 120
            WHEN $3 <> '' AND er.name_key LIKE ('%' || $3 || '%') THEN 95
            WHEN $3 <> '' AND $3 LIKE ('%' || er.name_key || '%') THEN 85
            ELSE 0
          END AS score
        FROM entity_registry er
        WHERE er.type = $1
      )
      SELECT
        r.entity_type,
        r.name,
        r.entity_slug,
        r.available_show_count,
        r.added_show_count
      FROM ranked r
      ORDER BY
        r.score DESC,
        r.added_show_count DESC,
        r.available_show_count DESC,
        r.name ASC
      LIMIT 8
    `,
    [input.entity_type, normalizedEntitySlug, normalizedEntityKey],
  );

  return rows.rows.map((row) => ({
    entity_type: row.entity_type,
    name: row.name,
    entity_slug: toEntitySlug(row.entity_slug || row.name),
    available_show_count: toInt(row.available_show_count),
    added_show_count: toInt(row.added_show_count),
  }));
}
