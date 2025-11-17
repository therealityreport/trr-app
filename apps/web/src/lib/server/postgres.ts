import "server-only";
import { Pool, type PoolClient, type QueryResult } from "pg";

declare global {
  var __trrPgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("[db] DATABASE_URL is not configured; Postgres features will be disabled until it is set.");
}

const pool = connectionString
  ? globalThis.__trrPgPool ?? new Pool({ connectionString })
  : undefined;

if (connectionString && process.env.NODE_ENV !== "production") {
  globalThis.__trrPgPool = pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error("Postgres connection is not configured. Set DATABASE_URL to enable survey storage.");
  }
  return pool;
}

export function query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
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
