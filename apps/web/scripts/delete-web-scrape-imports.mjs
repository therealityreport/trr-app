#!/usr/bin/env node
/**
 * Remove web-scrape links for one season, filtered by source + source page URL.
 * Media assets are retained: other seasons and non-link consumers can share them.
 *
 * Defaults are set up for the RHOSLC S3 E! Online cast photos page referenced in TASK1.
 *
 * Usage (dry-run):
 *   node scripts/delete-web-scrape-imports.mjs
 *
 * Usage (apply):
 *   node scripts/delete-web-scrape-imports.mjs --apply
 *
 * Custom:
 *   node scripts/delete-web-scrape-imports.mjs \\
 *     --show "The Real Housewives of Salt Lake City" \\
 *     --season 3 \\
 *     --source "web_scrape:eonline.com" \\
 *     --page-url "https://www.eonline.com/photos/34966/the-real-housewives-of-salt-lake-citys-season-3-cast-photos" \\
 *     --apply
 */

import { Client, Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve TLS once. pg URL parameters otherwise replace the explicit ssl object.
export function resolveDatabaseConfig(connectionString, env = process.env) {
  const url = new URL(connectionString);
  // Parsing a Client does not connect. Reuse the installed pg URL semantics,
  // including certificate files, explicit opt-outs and PGSSLMODE defaults.
  const parsed = new Client({
    connectionString,
    ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  }).connectionParameters;
  // pg hides the client key with a non-enumerable descriptor. Preserve it and
  // its logging protection, without mutating a possible pg defaults object.
  let ssl = parsed.ssl && typeof parsed.ssl === "object"
    ? Object.defineProperties({}, Object.getOwnPropertyDescriptors(parsed.ssl))
    : parsed.ssl;
  if (env.DATABASE_SSL_STRICT === "true") {
    if (!ssl || typeof ssl !== "object") ssl = {};
    ssl.rejectUnauthorized = true;
    // libpq-compatible verify-ca can install a hostname-check bypass.
    delete ssl.checkServerIdentity;
  }
  if (ssl) {
    const inlineCa = env.DATABASE_SSL_CA;
    const caPath = env.DATABASE_SSL_CA_PATH;
    if (inlineCa || caPath) {
      if (typeof ssl !== "object") ssl = {};
      if (inlineCa) ssl.ca = inlineCa.replace(/\\n/g, "\n");
      else ssl.ca = readFileSync(path.resolve(__dirname, "..", caPath), "utf8");
    }
  }
  for (const key of ["ssl", "sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat", "sslnegotiation"]) {
    url.searchParams.delete(key);
  }
  return { connectionString: url.toString(), ssl, sslnegotiation: parsed.sslnegotiation };
}

// Unlink only the selected season associations. Retain assets for separate,
// reference-aware garbage collection; media_links is not their only consumer.
export async function removeSeasonImports(client, { seasonId, source, pageUrl, apply = false }) {
  if (apply) await client.query("begin");
  try {
    const result = await client.query(
      `select ml.id as link_id, ma.id, ma.hosted_url, ml.kind
       from core.media_links ml
       join core.media_assets ma on ma.id = ml.media_asset_id
       where ml.entity_type = 'season' and ml.entity_id = $1
         and lower(ma.source) = $2
         and (ma.metadata->>'page_url' = $3 or ma.metadata->>'source_page_url' = $3)
       order by ml.kind nulls last, ma.id
       ${apply ? "for update of ml" : ""}`,
      [seasonId, source, pageUrl],
    );
    const rows = result.rows ?? [];
    let removed = 0;
    if (apply) {
      if (rows.length) {
        const deleted = await client.query(
          `delete from core.media_links
           where id = any($1::uuid[]) and entity_type = 'season' and entity_id = $2`,
          [rows.map((row) => row.link_id), seasonId],
        );
        removed = deleted.rowCount;
      }
      await client.query("commit");
    }
    return { rows, removed };
  } catch (error) {
    if (apply) await client.query("rollback");
    throw error;
  }
}

async function main() {
  dotenv.config({ path: path.join(__dirname, "../.env.local"), quiet: true });
  const args = process.argv.slice(2);
  const readArg = (key, fallback) => {
    const index = args.indexOf(key);
    return index === -1 ? fallback : args[index + 1];
  };
  const apply = args.includes("--apply");
  const showName = readArg("--show", "The Real Housewives of Salt Lake City");
  const rawSeason = readArg("--season", "3");
  if (!/^\d+$/.test(rawSeason ?? "") || !Number.isSafeInteger(Number(rawSeason)) || Number(rawSeason) < 1) {
    throw new Error("--season must be a positive integer");
  }
  const seasonNumber = Number(rawSeason);
  const source = readArg("--source", "web_scrape:eonline.com")?.toLowerCase();
  const pageUrl = readArg("--page-url", "https://www.eonline.com/photos/34966/the-real-housewives-of-salt-lake-citys-season-3-cast-photos");
  if (!showName || !source || !pageUrl) throw new Error("A value is required for each filter");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const pool = new Pool(resolveDatabaseConfig(process.env.DATABASE_URL));
  let client;
  try {
    client = await pool.connect();
    const show = (await client.query("select id, name from core.shows where name = $1 limit 1", [showName])).rows[0];
    if (!show) throw new Error("Show not found");
    const season = (await client.query(
      "select id, season_number from core.seasons where show_id = $1 and season_number = $2 limit 1",
      [show.id, seasonNumber],
    )).rows[0];
    if (!season) throw new Error("Season not found");
    const { rows, removed } = await removeSeasonImports(client, { seasonId: season.id, source, pageUrl, apply });
    const assets = new Set(rows.map((row) => row.id));
    console.log(`[delete-web-scrape-imports] ${rows.length} matching season links across ${assets.size} assets.`);
    for (const row of rows.slice(0, 25)) console.log(`- ${row.id} kind=${row.kind ?? "?"}`);
    if (apply) console.log(`[delete-web-scrape-imports] Removed ${removed} season links; media assets retained.`);
    else console.log("[delete-web-scrape-imports] Dry run only. Re-run with --apply to remove these season links. Media assets will be retained.");
  } finally {
    client?.release();
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(() => {
    // Driver errors can contain the connection URL or certificate details.
    console.error("[delete-web-scrape-imports] Failed; no successful cleanup was reported. Check filters, database access and TLS configuration.");
    process.exitCode = 1;
  });
}
