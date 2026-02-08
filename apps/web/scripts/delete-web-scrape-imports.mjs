#!/usr/bin/env node
/**
 * Delete web-scrape imports for a given show season, filtered by source + source page URL.
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

import { Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env.local is the common local setup for apps/web scripts)
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const readArg = (key, fallback) => {
  const idx = args.indexOf(key);
  if (idx === -1) return fallback;
  const val = args[idx + 1];
  return val !== undefined ? val : fallback;
};

const APPLY = hasFlag("--apply");
const SHOW_NAME = readArg("--show", "The Real Housewives of Salt Lake City");
const SEASON_NUMBER = Number.parseInt(readArg("--season", "3"), 10);
const SOURCE = readArg("--source", "web_scrape:eonline.com").toLowerCase();
const PAGE_URL = readArg(
  "--page-url",
  "https://www.eonline.com/photos/34966/the-real-housewives-of-salt-lake-citys-season-3-cast-photos"
);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[delete-web-scrape-imports] DATABASE_URL is not set");
  process.exit(1);
}

if (!Number.isFinite(SEASON_NUMBER)) {
  console.error("[delete-web-scrape-imports] --season must be a number");
  process.exit(1);
}

// Configure SSL (best-effort; DATABASE_URL often includes sslmode=require)
let ssl = undefined;
let sslMode = null;
try {
  sslMode = new URL(connectionString).searchParams.get("sslmode");
} catch {
  sslMode = null;
}
const shouldUseSsl =
  process.env.DATABASE_SSL === "true" ||
  (typeof sslMode === "string" && sslMode.toLowerCase() !== "disable");

if (shouldUseSsl) {
  const strict = process.env.DATABASE_SSL_STRICT === "true";
  if (!strict) {
    ssl = { rejectUnauthorized: false };
  } else {
    const inlineCa = process.env.DATABASE_SSL_CA;
    const caPath = process.env.DATABASE_SSL_CA_PATH;
    if (inlineCa) {
      ssl = { rejectUnauthorized: true, ca: inlineCa };
    } else if (caPath) {
    const resolved = path.resolve(path.join(__dirname, ".."), caPath);
    const ca = readFileSync(resolved, "utf8");
    ssl = { rejectUnauthorized: true, ca };
  } else {
    // Many hosted DBs (and some local tunnels) present an intermediate cert chain that pg
    // treats as self-signed unless a CA is explicitly provided. For admin scripts, prefer
    // usability: fall back to insecure SSL in that case.
    console.warn(
      "[delete-web-scrape-imports] DATABASE_SSL=true but no CA configured; falling back to rejectUnauthorized=false"
    );
    ssl = { rejectUnauthorized: false };
  }
  }
}

const pool = new Pool({ connectionString, ssl });

async function main() {
  const client = await pool.connect();
  try {
    const showRes = await client.query(
      `select id, name from core.shows where name = $1 limit 1`,
      [SHOW_NAME]
    );
    if (showRes.rowCount === 0) {
      console.error(`[delete-web-scrape-imports] Show not found: ${SHOW_NAME}`);
      process.exit(1);
    }
    const show = showRes.rows[0];

    const seasonRes = await client.query(
      `select id, season_number from core.seasons where show_id = $1 and season_number = $2 limit 1`,
      [show.id, SEASON_NUMBER]
    );
    if (seasonRes.rowCount === 0) {
      console.error(
        `[delete-web-scrape-imports] Season not found: show=${SHOW_NAME} season=${SEASON_NUMBER}`
      );
      process.exit(1);
    }
    const season = seasonRes.rows[0];

    const assetsRes = await client.query(
      `
        select distinct
          ma.id,
          ma.hosted_url,
          ml.kind,
          ma.source,
          ma.metadata->>'page_url' as page_url,
          ma.metadata->>'source_page_url' as source_page_url
        from core.media_links ml
        join core.media_assets ma on ma.id = ml.media_asset_id
        where ml.entity_type = 'season'
          and ml.entity_id = $1
          and lower(ma.source) = $2
          and (
            ma.metadata->>'page_url' = $3
            or ma.metadata->>'source_page_url' = $3
          )
        order by ml.kind nulls last, ma.id
      `,
      [season.id, SOURCE, PAGE_URL]
    );

    const rows = assetsRes.rows ?? [];
    const uniqueAssetIds = [...new Set(rows.map((r) => r.id))];
    console.log(
      `[delete-web-scrape-imports] Found ${rows.length} matching links across ${uniqueAssetIds.length} assets for show="${show.name}" season=${season.season_number}`
    );
    for (const row of rows.slice(0, 25)) {
      console.log(`- ${row.id} kind=${row.kind ?? "?"} hosted_url=${row.hosted_url ?? "?"}`);
    }
    if (rows.length > 25) {
      console.log(`...and ${rows.length - 25} more`);
    }

    if (!APPLY) {
      console.log("[delete-web-scrape-imports] Dry run only. Re-run with --apply to delete.");
      return;
    }

    if (rows.length === 0) {
      console.log("[delete-web-scrape-imports] Nothing to delete.");
      return;
    }

    const assetIds = uniqueAssetIds;

    await client.query("begin");
    await client.query(
      `delete from core.media_links where media_asset_id = any($1::uuid[])`,
      [assetIds]
    );
    await client.query(`delete from core.media_assets where id = any($1::uuid[])`, [assetIds]);
    await client.query("commit");

    console.log(`[delete-web-scrape-imports] Deleted ${assetIds.length} assets.`);
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {}
    console.error("[delete-web-scrape-imports] Failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error("[delete-web-scrape-imports] Unhandled:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
