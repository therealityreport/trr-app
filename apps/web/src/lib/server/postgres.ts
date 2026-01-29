import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

type SslConfig = {
  rejectUnauthorized: boolean;
  ca?: string;
};

const parseSslMode = (connectionString: string): string | null => {
  try {
    const url = new URL(connectionString);
    return url.searchParams.get("sslmode");
  } catch {
    return null;
  }
};

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

const getConnectionString = (): string => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. This request requires a database connection.");
  }
  return connectionString;
};

const buildSslConfig = (connectionString: string): SslConfig | undefined => {
  const sslMode = parseSslMode(connectionString);
  const envSsl = (process.env.DATABASE_SSL ?? "").toLowerCase();
  const forceDisableSsl = ["false", "disable", "0"].includes(envSsl);
  const forceEnableSsl = ["true", "1", "require"].includes(envSsl);
  const shouldUseSsl = forceEnableSsl || (!forceDisableSsl && Boolean(sslMode && sslMode !== "disable"));

  const rejectEnv = (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? "").toLowerCase();
  const defaultReject = sslMode === "verify-full" || sslMode === "verify-ca";
  const shouldRejectUnauthorized = rejectEnv.length
    ? !["false", "0"].includes(rejectEnv)
    : defaultReject;

  if (!shouldUseSsl) {
    return undefined;
  }

  const sslCa = resolveCaBundle();
  return {
    rejectUnauthorized: shouldRejectUnauthorized,
    ...(sslCa ? { ca: sslCa } : {}),
  };
};

let pool: Pool | null = null;

const getPool = (): Pool => {
  if (!pool) {
    const connectionString = getConnectionString();
    pool = new Pool({
      connectionString,
      ssl: buildSslConfig(connectionString),
    });
  }
  return pool;
};

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
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

/**
 * Auth context for RLS-protected queries.
 * firebaseUid is set as a session variable for RLS policies.
 */
export interface AuthContext {
  firebaseUid: string;
  /**
   * MUST be derived server-side from allowlist/claims, NEVER from request body.
   * When true, bypasses RLS via the admin policy.
   */
  isAdmin?: boolean;
}

/**
 * Execute queries within a transaction with Firebase auth context set as session variables.
 * RLS policies use current_setting('app.firebase_uid', true) to enforce row access.
 *
 * IMPORTANT: isAdmin must be derived from server-side verification (email allowlist,
 * Firebase custom claims, or DB roles table), never from client input.
 *
 * Usage:
 *   const user = await requireUser(request);
 *   const isAdmin = await checkIsAdmin(user); // server-side check
 *   return withAuthTransaction({ firebaseUid: user.uid, isAdmin }, async (client) => {
 *     return client.query('SELECT * FROM surveys.responses');
 *   });
 */
export async function withAuthTransaction<T>(
  authContext: AuthContext,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // set_config with third arg true = local to current transaction only
    // This is critical for pooled connections - prevents identity leakage
    await client.query("SELECT set_config('app.firebase_uid', $1, true)", [
      authContext.firebaseUid,
    ]);
    await client.query("SELECT set_config('app.is_admin', $1, true)", [
      authContext.isAdmin ? "true" : "false",
    ]);

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

/**
 * Single query with auth context. Delegates to withAuthTransaction.
 * For multiple queries, use withAuthTransaction directly to avoid multiple transaction overhead.
 */
export async function queryWithAuth<T extends QueryResultRow = QueryResultRow>(
  authContext: AuthContext,
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return withAuthTransaction(authContext, (client) => client.query<T>(text, params));
}
