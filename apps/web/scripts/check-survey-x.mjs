#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const connectionString = process.env.DATABASE_URL;

// Configure SSL
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
    SELECT created_at, app_user_id, view_live_tv_household,
           view_platforms_subscriptions, view_reality_cowatch,
           view_live_chats_social, view_devices_reality
    FROM survey_x_responses
    ORDER BY created_at DESC
    LIMIT 5
  `);

  console.log(`Survey X Responses: ${result.rowCount} rows\n`);

  if (result.rowCount === 0) {
    console.log("(0 rows) - No Survey X responses have been submitted yet.\n");
  } else {
    result.rows.forEach((row, i) => {
      console.log(`Row ${i + 1}:`);
      console.log(JSON.stringify(row, null, 2));
      console.log("---");
    });
  }
} catch (error) {
  console.error("Error querying database:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
