import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool, types, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

type SslConfig = {
  rejectUnauthorized: boolean;
  ca?: string;
};

// By default, `pg` returns NUMERIC/DECIMAL columns as strings.
// Most of our app expects JavaScript numbers (e.g. `.toFixed()` in admin UIs),
// so parse NUMERIC values into numbers globally.
types.setTypeParser(types.builtins.NUMERIC, (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
});

const parseSslMode = (connectionString: string): string | null => {
  try {
    const url = new URL(connectionString);
    return url.searchParams.get("sslmode");
  } catch {
    return null;
  }
};

const parseConnectionHostname = (connectionString: string): string | null => {
  try {
    return new URL(connectionString).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const parseConnectionPort = (connectionString: string): string | null => {
  try {
    const { port } = new URL(connectionString);
    return port || null;
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

type EnvLike = Record<string, string | undefined>;
type ConnectionClass = "local" | "session" | "transaction" | "direct" | "other" | "unknown";
type CandidateDetail = {
  value: string;
  source: "TRR_DB_URL" | "TRR_DB_FALLBACK_URL";
  hostClass: "local" | "pooler" | "direct" | "other" | "unknown";
  connectionClass: ConnectionClass;
};

type PostgresPoolSizing = {
  poolMax: number;
  maxConcurrentOperations: number;
};

const DEFAULT_POSTGRES_APPLICATION_NAME = "trr-app-server";
// Transaction-local search_path applied to every explicit transaction. Pinning
// prevents a prior caller's `SET search_path` from leaking through the pooled
// connection. Single-statement `query()` calls run under pg's default behavior
// (autocommit per statement) and remain schema-qualified in the codebase, so
// the server default is acceptable there.
const DEFAULT_TRANSACTION_SEARCH_PATH = "public, core, firebase_surveys";
const DEFAULT_SESSION_POOL_MAX = 4;
const DEFAULT_SESSION_POOL_MAX_CONCURRENT_OPERATIONS_LOCAL = 4;
const DEFAULT_SESSION_POOL_MAX_CONCURRENT_OPERATIONS_DEPLOYED = 2;

const classifyHostClass = (connectionString: string): CandidateDetail["hostClass"] => {
  const host = parseConnectionHostname(connectionString);
  if (!host) return "unknown";
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "local";
  if (host.endsWith("pooler.supabase.com")) return "pooler";
  if (host.endsWith(".supabase.co")) return "direct";
  return "other";
};

export const classifyConnectionClass = (connectionString: string): ConnectionClass => {
  const host = parseConnectionHostname(connectionString);
  const port = parseConnectionPort(connectionString);
  if (!host) return "unknown";
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "local";
  if (host.endsWith("pooler.supabase.com")) {
    if (port === "5432") return "session";
    if (port === "6543") return "transaction";
    return "other";
  }
  if (host.endsWith(".supabase.co")) return "direct";
  return "other";
};

export const isSupavisorSessionPoolerConnectionString = (connectionString: string): boolean => {
  const host = parseConnectionHostname(connectionString);
  const port = parseConnectionPort(connectionString);
  return Boolean(host?.endsWith("pooler.supabase.com") && port === "5432");
};

export const isDeployedRuntime = (env: EnvLike = process.env): boolean => {
  if (env.NODE_ENV === "development") return false;
  const vercelEnv = env.VERCEL_ENV?.toLowerCase();
  if (vercelEnv === "development" || vercelEnv === "preview") return false;
  return true;
};

export function validateRuntimeLane(connectionClass: ConnectionClass, isDeployed: boolean): void {
  if (connectionClass === "session" || connectionClass === "local") {
    return;
  }
  throw new Error(
    `[postgres] connection class "${connectionClass}" is not allowed. ` +
      `Only "session" (Supavisor pooler :5432) and "local" lanes are permitted.`,
  );
}

function resolvePostgresConnectionCandidateDetails(env: EnvLike = process.env): CandidateDetail[] {
  const ordered: Array<Pick<CandidateDetail, "source"> & { value: string | undefined }> = [
    { source: "TRR_DB_URL", value: env.TRR_DB_URL },
    { source: "TRR_DB_FALLBACK_URL", value: env.TRR_DB_FALLBACK_URL },
  ];
  const candidates: CandidateDetail[] = [];
  const seen = new Set<string>();
  for (const entry of ordered) {
    const candidate = entry.value?.trim() ?? "";
    if (!candidate || seen.has(candidate)) continue;
    candidates.push({
      value: candidate,
      source: entry.source,
      hostClass: classifyHostClass(candidate),
      connectionClass: classifyConnectionClass(candidate),
    });
    seen.add(candidate);
  }
  return candidates;
}

export function resolvePostgresConnectionCandidates(env: EnvLike = process.env): string[] {
  return resolvePostgresConnectionCandidateDetails(env).map((candidate) => candidate.value);
}

export function resolveActiveCandidateIndex(env: EnvLike = process.env): number {
  const force = (env.TRR_DB_FORCE_FALLBACK ?? "").toLowerCase().trim();
  return force === "1" || force === "true" || force === "yes" ? 1 : 0;
}

export const resolvePostgresConnectionString = (env: EnvLike = process.env): string => {
  const candidates = resolvePostgresConnectionCandidates(env);
  const connectionString = candidates[0];
  if (!connectionString) {
    throw new Error(
      "No database connection string is set. Configure TRR_DB_URL (recommended in TRR-APP/apps/web/.env.local for make dev) or TRR_DB_FALLBACK_URL. Runtime reads do not use SUPABASE_DB_URL or DATABASE_URL.",
    );
  }
  return connectionString;
};

const getConnectionString = (): string => resolvePostgresConnectionString(process.env);

export const resolvePostgresSslConfig = (
  connectionString: string,
  env: EnvLike = process.env,
): SslConfig | undefined => {
  const sslMode = parseSslMode(connectionString);
  const envSsl = (env.DATABASE_SSL ?? "").toLowerCase();
  const forceDisableSsl = ["false", "disable", "0"].includes(envSsl);
  const forceEnableSsl = ["true", "1", "require"].includes(envSsl);
  const host = parseConnectionHostname(connectionString);
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (isLocalHost && envSsl !== "require") {
    return undefined;
  }
  const shouldUseSsl = forceEnableSsl || (!forceDisableSsl && Boolean(sslMode && sslMode !== "disable"));

  const rejectEnv = (env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? "").toLowerCase();
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

type PoolState = {
  candidateIndex: number;
  pool: Pool;
};

let poolState: PoolState | null = null;
const activeCandidateIndex = resolveActiveCandidateIndex(process.env);
let activeOperationCount = 0;
const waitingOperationResolvers: Array<() => void> = [];

const parsePositiveInt = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const closePoolState = async (): Promise<void> => {
  const current = poolState;
  poolState = null;
  if (!current) return;
  await current.pool.end().catch(() => undefined);
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const resolvePostgresPoolSizing = (
  connectionString: string,
  env: EnvLike = process.env,
): PostgresPoolSizing => {
  const isDevelopment = env.NODE_ENV === "development";
  const isSessionPooler = isSupavisorSessionPoolerConnectionString(connectionString);
  const defaultSessionMaxConcurrentOperations = isDevelopment
    ? DEFAULT_SESSION_POOL_MAX_CONCURRENT_OPERATIONS_LOCAL
    : DEFAULT_SESSION_POOL_MAX_CONCURRENT_OPERATIONS_DEPLOYED;
  return {
    maxConcurrentOperations:
      parsePositiveInt(env.POSTGRES_MAX_CONCURRENT_OPERATIONS) ??
      (isSessionPooler ? defaultSessionMaxConcurrentOperations : isDevelopment ? 8 : 12),
    poolMax:
      parsePositiveInt(env.POSTGRES_POOL_MAX) ??
      (isSessionPooler ? DEFAULT_SESSION_POOL_MAX : isDevelopment ? 8 : 10),
  };
};

const getMaxConcurrentOperations = (): number => {
  const configured = parsePositiveInt(process.env.POSTGRES_MAX_CONCURRENT_OPERATIONS);
  if (configured) return configured;
  const candidates = resolvePostgresConnectionCandidates(process.env);
  const candidateIndex = poolState?.candidateIndex ?? activeCandidateIndex;
  const connectionString = candidates[candidateIndex] ?? getConnectionString();
  return resolvePostgresPoolSizing(connectionString, process.env).maxConcurrentOperations;
};

const emitStructured = (event: string, fields: Record<string, unknown>): void => {
  try {
    // Log drains (Vercel/Better Stack) key on stable JSON keys. Keep this a
    // single line so parsers don't break on multi-line messages.
    console.info(JSON.stringify({ event, source: "postgres.ts", ...fields }));
  } catch {
    // Never let telemetry block the caller.
  }
};

const acquireOperationSlot = async (): Promise<void> => {
  const maxConcurrentOperations = getMaxConcurrentOperations();
  if (activeOperationCount < maxConcurrentOperations) {
    activeOperationCount += 1;
    return;
  }

  emitStructured("postgres_pool_queue_depth", {
    waiting: waitingOperationResolvers.length + 1,
    active: activeOperationCount,
    max_concurrent_operations: maxConcurrentOperations,
  });
  await new Promise<void>((resolve) => {
    waitingOperationResolvers.push(resolve);
  });
  activeOperationCount += 1;
};

const releaseOperationSlot = (): void => {
  activeOperationCount = Math.max(0, activeOperationCount - 1);
  const next = waitingOperationResolvers.shift();
  if (next) {
    next();
  }
};

async function withOperationSlot<T>(operation: () => Promise<T>): Promise<T> {
  await acquireOperationSlot();
  try {
    return await operation();
  } finally {
    releaseOperationSlot();
  }
}

const getPool = (): Pool => {
  if (poolState) {
    return poolState.pool;
  }

  const candidateDetails = resolvePostgresConnectionCandidateDetails(process.env);
  const selectedCandidate = candidateDetails[activeCandidateIndex];
  if (activeCandidateIndex > 0 && !selectedCandidate) {
    throw new Error(
      "TRR_DB_FORCE_FALLBACK=1 requires TRR_DB_FALLBACK_URL to be configured. Runtime fallback is operator-engaged only.",
    );
  }
  const connectionString = selectedCandidate?.value ?? getConnectionString();

  if (selectedCandidate) {
    validateRuntimeLane(selectedCandidate.connectionClass, isDeployedRuntime(process.env));
  }

  const isDevelopment = process.env.NODE_ENV === "development";
  const isSessionPooler = isSupavisorSessionPoolerConnectionString(connectionString);
  const { poolMax: max } = resolvePostgresPoolSizing(connectionString, process.env);
  const connectionTimeoutMillis =
    parsePositiveInt(process.env.POSTGRES_POOL_CONNECTION_TIMEOUT_MS) ??
    (isSessionPooler ? 5_000 : isDevelopment ? 8_000 : 10_000);
  const idleTimeoutMillis =
    parsePositiveInt(process.env.POSTGRES_POOL_IDLE_TIMEOUT_MS) ??
    (isSessionPooler ? 5_000 : isDevelopment ? 10_000 : 30_000);
  // No default maxUses: the prior `isDevelopment ? 1 : undefined` pessimism forced
  // a full TCP+TLS handshake per query locally, which hurt dev velocity without a
  // documented reason. Keep the env var as an explicit escape hatch.
  const maxUses = parsePositiveInt(process.env.POSTGRES_POOL_MAX_USES);
  const applicationName = (process.env.POSTGRES_APPLICATION_NAME ?? DEFAULT_POSTGRES_APPLICATION_NAME).trim();

  const pool = new Pool({
    connectionString,
    ssl: resolvePostgresSslConfig(connectionString, process.env),
    application_name: applicationName,
    max,
    connectionTimeoutMillis,
    idleTimeoutMillis,
    ...(maxUses ? { maxUses } : {}),
  });
  pool.on("error", (error) => {
    console.warn("[postgres] Idle client error", error);
  });

  poolState = {
    candidateIndex: activeCandidateIndex,
    pool,
  };
  if (selectedCandidate) {
    emitStructured("postgres_pool_init", {
      winner_source: selectedCandidate.source,
      host_class: selectedCandidate.hostClass,
      connection_class: selectedCandidate.connectionClass,
      pool_max: max,
      pool_max_source: process.env.POSTGRES_POOL_MAX ? "env:POSTGRES_POOL_MAX" : "default",
      max_concurrent_operations: getMaxConcurrentOperations(),
      max_concurrent_operations_source: process.env.POSTGRES_MAX_CONCURRENT_OPERATIONS
        ? "env:POSTGRES_MAX_CONCURRENT_OPERATIONS"
        : "default",
      application_name: applicationName,
      application_name_source: process.env.POSTGRES_APPLICATION_NAME
        ? "env:POSTGRES_APPLICATION_NAME"
        : "default",
    });
    if (activeCandidateIndex > 0) {
      emitStructured("postgres_pool_engaged_fallback", {
        candidate_index: activeCandidateIndex,
        winner_source: selectedCandidate.source,
        host_class: selectedCandidate.hostClass,
        connection_class: selectedCandidate.connectionClass,
      });
    }
  }
  return poolState.pool;
};

function isTransientPostgresError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const code = String((error as Error & { code?: unknown }).code ?? "").toLowerCase();
  return (
    message.includes("dbhandler exited") ||
    message.includes("unable to check out connection from the pool due to timeout") ||
    message.includes("server closed the connection unexpectedly") ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("connection ended unexpectedly") ||
    message.includes("ssl connection has been closed unexpectedly") ||
    message.includes("ssl syscall error: eof detected") ||
    message.includes("terminating connection due to administrator command") ||
    message.includes("connection refused") ||
    message.includes("timed out") ||
    message.includes("maxclientsinsessionmode") ||
    message.includes("max clients reached - in session mode") ||
    code === "xx000"
  );
}

async function withPoolRetry<T>(operation: (pool: Pool) => Promise<T>): Promise<T> {
  const maxAttempts =
    parsePositiveInt(process.env.POSTGRES_TRANSIENT_RETRY_ATTEMPTS) ??
    (process.env.NODE_ENV === "development" ? 3 : 2);
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation(getPool());
    } catch (error) {
      lastError = error;
      if (!isTransientPostgresError(error) || attempt + 1 >= maxAttempts) {
        throw error;
      }
      emitStructured("postgres_pool_transient_retry", {
        attempt,
        candidate_index: poolState?.candidateIndex ?? activeCandidateIndex,
        error_message: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
      });
      await closePoolState();
      await sleep(150 * 2 ** attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Postgres query failed");
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return withOperationSlot(() => withPoolRetry((pool) => pool.query<T>(text, params)));
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  return withOperationSlot(() =>
    withPoolRetry(async (pool) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`SET LOCAL search_path = ${DEFAULT_TRANSACTION_SEARCH_PATH}`);
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    })
  );
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
 *     return client.query('SELECT * FROM firebase_surveys.responses');
 *   });
 */
export async function withAuthTransaction<T>(
  authContext: AuthContext,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withOperationSlot(() =>
    withPoolRetry(async (pool) => {
      const client = await pool.connect();
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
        // Pin search_path transaction-locally for the same pooled-connection
        // leakage reason as the identity session vars above.
        await client.query(`SET LOCAL search_path = ${DEFAULT_TRANSACTION_SEARCH_PATH}`);

        const result = await callback(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    })
  );
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
