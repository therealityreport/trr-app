#!/usr/bin/env npx tsx
/**
 * CLI script to auto-categorize Reddit community post flairs for a given show.
 *
 * Usage:
 *   npx tsx scripts/auto-categorize-flairs.ts --show <slug> [--community <subreddit>] [--dry-run]
 *
 * Requires env vars: TRR_DB_URL, optional TRR_DB_FALLBACK_URL, or DATABASE_URL for tooling-only flows
 *
 * Environment: Loads .env.local from apps/web/ automatically.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Env loading (load apps/web/.env.local if present)
// ---------------------------------------------------------------------------

const loadEnvFile = (filePath: string): void => {
  try {
    const content = readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing env file
  }
};

loadEnvFile(resolve(__dirname, "../apps/web/.env.local"));
loadEnvFile(resolve(__dirname, "../apps/web/.env"));

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

const getArg = (name: string): string | null => {
  const idx = args.indexOf(`--${name}`);
  if (idx < 0 || idx + 1 >= args.length) return null;
  return args[idx + 1];
};

const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const showSlug = getArg("show");
const communityFilter = getArg("community");
const dryRun = hasFlag("dry-run");

if (!showSlug) {
  console.error("Usage: npx tsx scripts/auto-categorize-flairs.ts --show <slug> [--community <subreddit>] [--dry-run]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const getConnectionString = (): string => {
  const candidates = [process.env.TRR_DB_URL, process.env.TRR_DB_FALLBACK_URL, process.env.DATABASE_URL]
    .map((v) => v?.trim() ?? "")
    .filter((v) => v.length > 0);
  const cs = candidates[0];
  if (!cs) {
    console.error("No database connection string found. Set TRR_DB_URL, optional TRR_DB_FALLBACK_URL, or DATABASE_URL.");
    process.exit(1);
  }
  return cs;
};

const parseSslMode = (cs: string): string | null => {
  try {
    return new URL(cs).searchParams.get("sslmode");
  } catch {
    return null;
  }
};

const parseHostname = (cs: string): string | null => {
  try {
    return new URL(cs).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const connectionString = getConnectionString();
const host = parseHostname(connectionString);
const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
const sslMode = parseSslMode(connectionString);
const useSsl = !isLocal && Boolean(sslMode && sslMode !== "disable");

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

// ---------------------------------------------------------------------------
// Categorization logic
// ---------------------------------------------------------------------------

type FlairCategory = "cast" | "season";

interface CommunityRow {
  id: string;
  subreddit: string;
  trr_show_id: string;
  trr_show_name: string;
  post_flairs: string[];
  post_flair_categories: Record<string, string>;
}

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
};

const toRecord = (value: unknown): Record<string, string> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "string") result[k] = v;
    }
    return result;
  }
  return {};
};

const normalizeFlairKey = (value: string): string => {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
};

const categorizeFlairs = (
  flairs: string[],
  castNames: string[],
  seasonNumbers: number[],
  showName: string,
): Record<string, FlairCategory> => {
  const categories: Record<string, FlairCategory> = {};

  // Build lowercase cast name fragments for matching
  const castFragments = new Set<string>();
  for (const name of castNames) {
    const lower = name.toLowerCase().trim();
    if (!lower) continue;
    castFragments.add(lower);
    // Also add last name for partial matches
    const parts = lower.split(/\s+/);
    if (parts.length > 1) {
      const lastName = parts[parts.length - 1];
      if (lastName.length >= 3) castFragments.add(lastName);
    }
  }

  // Build season patterns
  const seasonPatterns: Array<{ pattern: RegExp; category: FlairCategory }> = [];
  for (const num of seasonNumbers) {
    seasonPatterns.push(
      { pattern: new RegExp(`\\bseason\\s*${num}\\b`, "i"), category: "season" },
      { pattern: new RegExp(`\\bs${num}\\b`, "i"), category: "season" },
      { pattern: new RegExp(`\\bS${String(num).padStart(2, "0")}\\b`), category: "season" },
    );
  }
  // Generic season patterns
  seasonPatterns.push(
    { pattern: /\bseason\s*\d+/i, category: "season" },
    { pattern: /\bS\d{1,2}\b/, category: "season" },
    { pattern: /\bS\d{1,2}E\d{1,3}\b/i, category: "season" },
  );

  for (const flair of flairs) {
    const key = normalizeFlairKey(flair);
    if (!key) continue;

    const flairLower = flair.toLowerCase().trim();

    // Check season patterns first
    let matched = false;
    for (const { pattern, category } of seasonPatterns) {
      if (pattern.test(flair)) {
        categories[key] = category;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check if flair matches a cast member
    for (const fragment of castFragments) {
      if (flairLower.includes(fragment)) {
        categories[key] = "cast";
        matched = true;
        break;
      }
    }
  }

  return categories;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async (): Promise<void> => {
  console.log(`Auto-categorize flairs for show: ${showSlug}${dryRun ? " (DRY RUN)" : ""}`);
  if (communityFilter) {
    console.log(`Filtering to community: ${communityFilter}`);
  }
  console.log();

  // 1. Look up show by slug
  const showSlugNormalized = showSlug
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const showResult = await pool.query<{ id: string; name: string }>(
    `SELECT s.id::text AS id, s.name
     FROM core.shows AS s
     JOIN admin.covered_shows AS cs ON cs.trr_show_id::text = s.id::text
     WHERE lower(
       trim(
         both '-' FROM regexp_replace(
           regexp_replace(COALESCE(s.name, ''), '&', ' and ', 'gi'),
           '[^a-z0-9]+', '-', 'gi'
         )
       )
     ) = $1
     LIMIT 1`,
    [showSlugNormalized],
  );

  if (showResult.rows.length === 0) {
    console.error(`Show not found for slug: "${showSlug}" (normalized: "${showSlugNormalized}")`);
    await pool.end();
    process.exit(1);
  }

  const show = showResult.rows[0];
  console.log(`Found show: ${show.name} (${show.id})`);

  // 2. Get cast names
  const castResult = await pool.query<{ full_name: string | null; cast_member_name: string | null }>(
    `SELECT p.full_name, vsc.cast_member_name
     FROM core.v_show_cast AS vsc
     LEFT JOIN core.people AS p ON p.id = vsc.person_id
     WHERE vsc.show_id = $1::uuid
     ORDER BY vsc.billing_order ASC NULLS LAST
     LIMIT 200`,
    [show.id],
  );

  const castNames: string[] = [];
  const castNameSet = new Set<string>();
  for (const row of castResult.rows) {
    const name = (row.full_name ?? row.cast_member_name ?? "").trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (castNameSet.has(lower)) continue;
    castNameSet.add(lower);
    castNames.push(name);
  }
  console.log(`Found ${castNames.length} cast members`);

  // 3. Get seasons
  const seasonResult = await pool.query<{ season_number: number }>(
    `SELECT season_number FROM core.seasons WHERE show_id = $1::uuid ORDER BY season_number ASC`,
    [show.id],
  );
  const seasonNumbers = seasonResult.rows.map((r) => r.season_number).filter((n) => Number.isFinite(n));
  console.log(`Found ${seasonNumbers.length} seasons: ${seasonNumbers.join(", ")}`);

  // 4. Get communities
  let communityQuery = `
    SELECT
      id::text AS id,
      subreddit,
      trr_show_id::text AS trr_show_id,
      trr_show_name,
      post_flairs,
      post_flair_categories
    FROM admin.reddit_communities
    WHERE trr_show_id = $1::uuid`;
  const communityParams: unknown[] = [show.id];

  if (communityFilter) {
    communityQuery += ` AND lower(subreddit) = lower($2)`;
    communityParams.push(communityFilter.replace(/^r\//, ""));
  }

  const communityResult = await pool.query<{
    id: string;
    subreddit: string;
    trr_show_id: string;
    trr_show_name: string;
    post_flairs: unknown;
    post_flair_categories: unknown;
  }>(communityQuery, communityParams);

  const communities: CommunityRow[] = communityResult.rows.map((row) => ({
    id: row.id,
    subreddit: row.subreddit,
    trr_show_id: row.trr_show_id,
    trr_show_name: row.trr_show_name,
    post_flairs: toStringArray(row.post_flairs),
    post_flair_categories: toRecord(row.post_flair_categories),
  }));

  if (communities.length === 0) {
    console.log("\nNo communities found.");
    await pool.end();
    return;
  }

  console.log(`\nFound ${communities.length} communities\n`);

  // 5. Categorize each community
  let totalMatched = 0;
  let totalFlairs = 0;

  for (const community of communities) {
    const flairs = community.post_flairs;
    if (flairs.length === 0) {
      console.log(`  r/${community.subreddit}: 0 flairs — skipped`);
      continue;
    }

    const newCategories = categorizeFlairs(flairs, castNames, seasonNumbers, show.name);
    const merged = { ...community.post_flair_categories, ...newCategories };

    const matchedCount = Object.keys(newCategories).length;
    totalMatched += matchedCount;
    totalFlairs += flairs.length;

    const castCount = Object.values(merged).filter((v) => v === "cast").length;
    const seasonCount = Object.values(merged).filter((v) => v === "season").length;

    console.log(
      `  r/${community.subreddit}: ${matchedCount}/${flairs.length} categorized (${castCount} cast, ${seasonCount} season)`,
    );

    if (matchedCount > 0) {
      for (const [key, category] of Object.entries(newCategories)) {
        const isNew = !community.post_flair_categories[key];
        if (isNew) {
          console.log(`    + "${key}" -> ${category}`);
        }
      }
    }

    if (!dryRun && matchedCount > 0) {
      await pool.query(
        `UPDATE admin.reddit_communities
         SET post_flair_categories = $2::jsonb
         WHERE id = $1::uuid`,
        [community.id, JSON.stringify(merged)],
      );
      console.log(`    => Saved to database`);
    }
  }

  console.log();
  console.log("=".repeat(50));
  console.log(`Total: ${totalMatched} of ${totalFlairs} flairs categorized across ${communities.length} communities`);
  if (dryRun) {
    console.log("(DRY RUN — no changes written)");
  }

  await pool.end();
};

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
