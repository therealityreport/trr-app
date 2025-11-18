import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

type SslConfig = {
  rejectUnauthorized: boolean;
  ca?: string;
};

const parseSslMode = (): string | null => {
  try {
    const url = new URL(connectionString);
    return url.searchParams.get("sslmode");
  } catch {
    return null;
  }
};

const sslMode = parseSslMode();
const envSsl = (process.env.DATABASE_SSL ?? "").toLowerCase();
const forceDisableSsl = ["false", "disable", "0"].includes(envSsl);
const forceEnableSsl = ["true", "1", "require"].includes(envSsl);
const shouldUseSsl = forceEnableSsl || (!forceDisableSsl && Boolean(sslMode && sslMode !== "disable"));

const rejectEnv = (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? "").toLowerCase();
const defaultReject = sslMode === "verify-full" || sslMode === "verify-ca";
const shouldRejectUnauthorized = rejectEnv.length
  ? !["false", "0"].includes(rejectEnv)
  : defaultReject;

const resolveCaBundle = (): string | undefined => {
  const inline = process.env.DATABASE_SSL_CA;
  if (inline && inline.trim().length > 0) {
    return inline.replace(/\\n/g, "\n");
  }
  const caFile = process.env.DATABASE_SSL_CA_FILE;
  if (caFile && caFile.trim().length > 0) {
    try {
      const absolute = resolve(process.cwd(), caFile);
      return readFileSync(absolute, "utf8");
    } catch (error) {
      console.warn(`[postgres] Failed to read DATABASE_SSL_CA_FILE (${caFile})`, error);
    }
  }
  return undefined;
};

const sslCa = shouldUseSsl ? resolveCaBundle() : undefined;

const sslConfig: SslConfig | undefined = shouldUseSsl
  ? {
      rejectUnauthorized: shouldRejectUnauthorized,
      ...(sslCa ? { ca: sslCa } : {}),
    }
  : undefined;

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
});

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
