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

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[migrations] DATABASE_URL is not set. Export it before running migrations.");
  process.exit(1);
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

const pool = new Pool({ connectionString, ssl });

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function hasRun(name) {
  const result = await pool.query("SELECT 1 FROM __migrations WHERE name = $1", [name]);
  return result.rowCount > 0;
}

async function recordMigration(name) {
  await pool.query("INSERT INTO __migrations (name) VALUES ($1)", [name]);
}

async function applyMigration(fileName) {
  const fullPath = path.join(migrationsDir, fileName);
  const sql = await readFile(fullPath, "utf8");
  console.log(`[migrations] Applying ${fileName}`);
  await pool.query(sql);
  await recordMigration(fileName);
}

async function run() {
  try {
    await ensureMigrationsTable();
    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
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
    await pool.end();
  }
}

run();
