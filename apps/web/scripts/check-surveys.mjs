#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const connectionString = process.env.DATABASE_URL;

let ssl = undefined;
if (process.env.DATABASE_SSL === "true") {
  const caPath = process.env.DATABASE_SSL_CA_PATH;
  if (caPath) {
    const resolved = path.resolve(path.join(__dirname, ".."), caPath);
    const ca = readFileSync(resolved, "utf8");
    ssl = { rejectUnauthorized: true, ca };
  }
}

const pool = new Pool({ connectionString, ssl });

try {
  const result = await pool.query(`
    SELECT key, title, description, response_table_name, is_active
    FROM surveys
    ORDER BY created_at ASC
  `);

  console.log(`Surveys Registry: ${result.rowCount} surveys\n`);

  result.rows.forEach((row, i) => {
    console.log(`${i + 1}. ${row.key}`);
    console.log(`   Title: ${row.title}`);
    console.log(`   Table: ${row.response_table_name}`);
    console.log(`   Active: ${row.is_active}`);
    console.log(`   Description: ${row.description || '(none)'}`);
    console.log();
  });
} catch (error) {
  console.error("Error querying database:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
