import "server-only";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

declare global {
  var __trrAdminRouteCache: Map<string, CacheEntry> | undefined;
}

const CACHE_MAX_ENTRIES = 1_000;
const CACHE = globalThis.__trrAdminRouteCache ?? new Map<string, CacheEntry>();
if (!globalThis.__trrAdminRouteCache) {
  globalThis.__trrAdminRouteCache = CACHE;
}

export const DEFAULT_ADMIN_ROUTE_CACHE_TTL_MS = 10_000;
const CACHE_DISABLED = /^(1|true)$/i.test(process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED ?? "");

const makeStoreKey = (namespace: string, key: string): string => `${namespace}:${key}`;

const normalizeTtlMs = (ttlMs: number): number =>
  Number.isFinite(ttlMs) && ttlMs > 0 ? Math.floor(ttlMs) : DEFAULT_ADMIN_ROUTE_CACHE_TTL_MS;

const pruneCache = (): void => {
  const now = Date.now();
  for (const [key, entry] of CACHE.entries()) {
    if (entry.expiresAt <= now) {
      CACHE.delete(key);
    }
  }
  if (CACHE.size <= CACHE_MAX_ENTRIES) return;
  const overflow = CACHE.size - CACHE_MAX_ENTRIES;
  let removed = 0;
  for (const key of CACHE.keys()) {
    CACHE.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
};

export const parseCacheTtlMs = (raw: string | undefined, fallbackMs = DEFAULT_ADMIN_ROUTE_CACHE_TTL_MS): number => {
  if (!raw) return fallbackMs;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackMs;
  return parsed;
};

export const normalizeSearchParams = (searchParams: URLSearchParams): string => {
  const pairs = Array.from(searchParams.entries()).sort((a, b) => {
    if (a[0] === b[0]) return a[1].localeCompare(b[1]);
    return a[0].localeCompare(b[0]);
  });
  const normalized = new URLSearchParams();
  for (const [key, value] of pairs) {
    normalized.append(key, value);
  }
  return normalized.toString();
};

export const buildUserScopedRouteCacheKey = (
  userId: string,
  scope: string,
  searchParams?: URLSearchParams
): string => {
  const normalizedQuery = searchParams ? normalizeSearchParams(searchParams) : "";
  return `${userId}:${scope}:${normalizedQuery}`;
};

export function getRouteResponseCache<T>(namespace: string, key: string): T | null {
  if (CACHE_DISABLED) return null;
  const entry = CACHE.get(makeStoreKey(namespace, key));
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    CACHE.delete(makeStoreKey(namespace, key));
    return null;
  }
  return entry.value as T;
}

export function setRouteResponseCache<T>(
  namespace: string,
  key: string,
  value: T,
  ttlMs = DEFAULT_ADMIN_ROUTE_CACHE_TTL_MS
): void {
  if (CACHE_DISABLED) return;
  CACHE.set(makeStoreKey(namespace, key), {
    expiresAt: Date.now() + normalizeTtlMs(ttlMs),
    value,
  });
  pruneCache();
}

export function invalidateRouteResponseCache(namespace: string, keyPrefix?: string): void {
  if (CACHE_DISABLED) return;
  const namespacePrefix = `${namespace}:`;
  const prefix = keyPrefix ? `${namespacePrefix}${keyPrefix}` : namespacePrefix;
  for (const key of CACHE.keys()) {
    if (key.startsWith(prefix)) {
      CACHE.delete(key);
    }
  }
}
