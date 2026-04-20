#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "../db/migrations");
const TRANSITIONAL_SHARED_SCHEMA_FLAG = "--include-transitional-shared-schema";

const migrationManifest = new Map([
  ["000_create_surveys_table.sql", { lane: "app-local", note: "Legacy survey registry in public schema." }],
  ["000_seed_surveys.sql", { lane: "app-local", note: "Legacy survey registry seed data." }],
  ["001_create_global_profile_responses.sql", { lane: "app-local", note: "Legacy survey response table." }],
  ["002_create_rhoslc_s6_responses.sql", { lane: "app-local", note: "Legacy survey response table." }],
  ["003_create_survey_x_responses.sql", { lane: "app-local", note: "Legacy survey response table." }],
  ["004_add_app_username_column.sql", { lane: "app-local", note: "Legacy survey response metadata." }],
  ["005_make_survey_x_show_fields_nullable.sql", { lane: "app-local", note: "Legacy survey response compatibility change." }],
  ["006_create_rhop_s10_responses.sql", { lane: "app-local", note: "Legacy survey response table." }],
  ["007_expand_surveys_table.sql", { lane: "app-local", note: "Legacy survey registry metadata." }],
  ["008_create_survey_cast.sql", { lane: "app-local", note: "Legacy survey editor support table." }],
  ["009_create_survey_episodes.sql", { lane: "app-local", note: "Legacy survey editor support table." }],
  ["010_create_shows.sql", { lane: "app-local", note: "App-local survey show metadata table." }],
  ["011_create_show_seasons.sql", { lane: "app-local", note: "App-local survey show seasons table." }],
  ["012_create_survey_shows_tables.sql", { lane: "app-local", note: "Idempotent survey show bootstrap replay." }],
  [
    "013_create_surveys_schema.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned normalized survey schema bootstrap." },
  ],
  [
    "014_create_normalized_survey_tables.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned normalized survey tables." },
  ],
  ["015_enable_rls.sql", { lane: "transitional-shared-schema", note: "Backend-owned RLS policy setup." }],
  ["016_create_rls_policies.sql", { lane: "transitional-shared-schema", note: "Backend-owned RLS policies." }],
  ["017_create_rls_role_grants.sql", { lane: "transitional-shared-schema", note: "Backend-owned grants." }],
  [
    "018_rename_normalized_surveys_schema.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned normalized survey schema rename." },
  ],
  [
    "019_survey_trr_links_and_social_posts.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned firebase_surveys/admin shared tables." },
  ],
  ["020_create_covered_shows.sql", { lane: "transitional-shared-schema", note: "Backend-owned admin table." }],
  ["021_add_rhoslc_s6_season_rating.sql", { lane: "app-local", note: "Legacy survey response column add." }],
  [
    "022_create_admin_season_cast_survey_roles.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table." },
  ],
  ["022_link_brand_shows_to_trr.sql", { lane: "app-local", note: "App-local survey show link metadata." }],
  ["023_create_admin_reddit_sources.sql", { lane: "transitional-shared-schema", note: "Backend-owned admin tables." }],
  [
    "024_add_post_flares_to_admin_reddit_communities.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table change." },
  ],
  [
    "025_add_analysis_flares_to_admin_reddit_communities.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table change." },
  ],
  [
    "026_add_analysis_all_flares_to_admin_reddit_communities.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table change." },
  ],
  [
    "027_add_focus_fields_to_admin_reddit_communities.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table change." },
  ],
  [
    "028_add_episode_discussion_rules_to_admin_reddit_communities.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table change." },
  ],
  [
    "029_add_source_kind_to_admin_reddit_threads.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table change." },
  ],
  ["030_create_show_palette_library.sql", { lane: "app-local", note: "App-local brand palette library table." }],
  [
    "031_create_admin_reddit_discovery_posts_cache.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table." },
  ],
  [
    "032_create_admin_recent_people_views.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table with core schema dependency." },
  ],
  [
    "033_add_post_flair_categories_to_admin_reddit_communities.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table change." },
  ],
  [
    "034_rename_flare_columns_to_flair.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table rename." },
  ],
  [
    "035_add_post_flair_assignments_to_admin_reddit_communities.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin table change." },
  ],
  [
    "036_backfill_admin_reddit_community_display_names.sql",
    { lane: "transitional-shared-schema", note: "Backend-owned admin data backfill." },
  ],
]);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, "../.env.local") });

function parseArgs(argv) {
  return {
    includeTransitionalSharedSchema: argv.includes(TRANSITIONAL_SHARED_SCHEMA_FLAG),
    dryRun: argv.includes("--dry-run"),
  };
}

const args = parseArgs(process.argv.slice(2));

const candidateSources = [
  ["TRR_DB_URL", process.env.TRR_DB_URL],
  ["TRR_DB_FALLBACK_URL", process.env.TRR_DB_FALLBACK_URL],
  ["DATABASE_URL", process.env.DATABASE_URL],
];
const resolvedCandidate = candidateSources.find(([, value]) => value?.trim());
const connectionString = resolvedCandidate?.[1]?.trim();
if (!connectionString && !args.dryRun) {
  console.error(
    "[migrations] No database URL is set. Configure TRR_DB_URL or optional TRR_DB_FALLBACK_URL. DATABASE_URL is compatibility-only for older tooling flows.",
  );
  process.exit(1);
}
const connectionSource = resolvedCandidate?.[0] ?? (args.dryRun ? "not-required" : "unknown");
if (connectionSource === "DATABASE_URL") {
  console.warn(
    "[migrations] Using DATABASE_URL compatibility input. Prefer TRR_DB_URL and optional TRR_DB_FALLBACK_URL for app runtime and migration tooling.",
  );
}

// Configure SSL if enabled
let ssl = undefined;
if (process.env.DATABASE_SSL === "true") {
  // Supabase poolers sometimes present cert chains that fail strict verification.
  // Align this script with the app's default: only reject unauthorized certs when
  // explicitly requested via DATABASE_SSL_REJECT_UNAUTHORIZED.
  const rejectEnv = (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? "").toLowerCase().trim();
  const rejectUnauthorized = rejectEnv.length
    ? !["false", "0", "no", "off"].includes(rejectEnv)
    : false;

  const inlineCa = process.env.DATABASE_SSL_CA;
  const caPath = process.env.DATABASE_SSL_CA_PATH;

  if (inlineCa) {
    console.log("[migrations] Using inline SSL CA certificate");
    ssl = { rejectUnauthorized, ca: inlineCa };
  } else if (caPath) {
    const resolved = path.resolve(path.join(__dirname, ".."), caPath);
    console.log(`[migrations] Loading SSL CA from file: ${resolved}`);
    const ca = readFileSync(resolved, "utf8");
    console.log(`[migrations] Successfully loaded SSL CA (${ca.length} bytes)`);
    ssl = { rejectUnauthorized, ca };
  } else {
    console.log("[migrations] DATABASE_SSL=true but no CA provided, using default SSL");
    ssl = { rejectUnauthorized };
  }
}

const pool = connectionString ? new Pool({ connectionString, ssl }) : null;

function classifyMigrations(files) {
  const unknown = files.filter((file) => !migrationManifest.has(file));
  if (unknown.length > 0) {
    throw new Error(
      `[migrations] Unclassified migration files detected: ${unknown.join(", ")}. Add them to the manifest before running this tool.`,
    );
  }

  return files.map((file) => ({
    file,
    ...migrationManifest.get(file),
  }));
}

function getPool() {
  if (!pool) {
    throw new Error("[migrations] No database connection is available for this operation.");
  }
  return pool;
}

async function ensureMigrationsTable() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function hasRun(name) {
  const result = await getPool().query("SELECT 1 FROM __migrations WHERE name = $1", [name]);
  return result.rowCount > 0;
}

async function recordMigration(name) {
  await getPool().query("INSERT INTO __migrations (name) VALUES ($1)", [name]);
}

async function applyMigration(fileName) {
  const fullPath = path.join(migrationsDir, fileName);
  const sql = await readFile(fullPath, "utf8");
  console.log(`[migrations] Applying ${fileName}`);
  await getPool().query(sql);
  await recordMigration(fileName);
}

async function run() {
  try {
    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
    const classifiedFiles = classifyMigrations(files);
    const filesToApply = classifiedFiles.filter((entry) => {
      if (entry.lane === "app-local") return true;
      return args.includeTransitionalSharedSchema;
    });
    const skippedFiles = classifiedFiles.filter((entry) => !filesToApply.includes(entry));

    console.log(`[migrations] Connection source: ${connectionSource}`);
    console.log(
      `[migrations] Mode: ${
        args.includeTransitionalSharedSchema
          ? "app-local + transitional shared-schema"
          : "app-local only"
      }${args.dryRun ? " (dry-run)" : ""}`,
    );

    if (skippedFiles.length > 0) {
      console.warn("[migrations] Skipping backend-owned transitional shared-schema files by default:");
      for (const entry of skippedFiles) {
        console.warn(`  - ${entry.file}: ${entry.note}`);
      }
      console.warn(
        `[migrations] Use ${TRANSITIONAL_SHARED_SCHEMA_FLAG} only when you intentionally need the legacy app bootstrap path while parity is still being ported to TRR-Backend.`,
      );
    }

    if (args.includeTransitionalSharedSchema) {
      console.warn(
        "[migrations] Transitional shared-schema mode is enabled. This is a temporary compatibility path; backend-owned shared schema should migrate via TRR-Backend.",
      );
    }

    if (args.dryRun) {
      for (const entry of filesToApply) {
        console.log(`[migrations] Would apply ${entry.file} (${entry.lane})`);
      }
      console.log("[migrations] Complete (dry-run)");
      return;
    }

    await ensureMigrationsTable();
    for (const entry of filesToApply) {
      const file = entry.file;
      const alreadyApplied = await hasRun(file);
      if (alreadyApplied) {
        console.log(`[migrations] Skipping ${file} (already applied)`);
        continue;
      }
      await applyMigration(file);
    }
    console.log("[migrations] Complete");
  } catch (error) {
    console.error("[migrations] Failed", error);
    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

run();
