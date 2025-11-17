#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "../db/migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[migrations] DATABASE_URL is not set. Export it before running migrations.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

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
