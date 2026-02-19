import "server-only";

import { query } from "@/lib/server/postgres";

export interface NetworkStreamingSummaryRow {
  type: "network" | "streaming";
  name: string;
  available_show_count: number;
  added_show_count: number;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  wikidata_id: string | null;
  wikipedia_url: string | null;
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
  type: "network" | "streaming";
  name: string;
  available_show_count: number;
  added_show_count: number;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  wikidata_id: string | null;
  wikipedia_url: string | null;
  resolution_status: "resolved" | "manual_required" | "failed" | null;
  resolution_reason: string | null;
  last_attempt_at: string | null;
};

const toInt = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
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
            n.wikipedia_url AS wikipedia_url
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
            wp.wikipedia_url AS wikipedia_url
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
      )
      SELECT *
      FROM (
        SELECT * FROM network_rows
        UNION ALL
        SELECT * FROM provider_rows
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
