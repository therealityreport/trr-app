import "server-only";

import { normalizeSearchParams } from "@/lib/server/admin/route-response-cache";

type SnapshotCacheEntry<T> = {
  data: T;
  generatedAtMs: number;
  expiresAtMs: number;
  staleUntilMs: number;
};

type SnapshotFetchResult<T> = {
  data: T;
  meta: {
    cacheStatus: "hit" | "miss" | "refresh";
    generatedAt: string;
    cacheAgeMs: number;
    stale: boolean;
  };
};

type CacheOptions<T> = {
  cacheKey: string;
  ttlMs: number;
  staleIfErrorTtlMs?: number;
  forceRefresh?: boolean;
  fetcher: () => Promise<T>;
};

declare global {
  var __trrAdminSnapshotCache: Map<string, SnapshotCacheEntry<unknown>> | undefined;
  var __trrAdminSnapshotInFlight: Map<string, Promise<SnapshotCacheEntry<unknown>>> | undefined;
}

const SNAPSHOT_CACHE = globalThis.__trrAdminSnapshotCache ?? new Map<string, SnapshotCacheEntry<unknown>>();
if (!globalThis.__trrAdminSnapshotCache) {
  globalThis.__trrAdminSnapshotCache = SNAPSHOT_CACHE;
}

const SNAPSHOT_IN_FLIGHT = globalThis.__trrAdminSnapshotInFlight ?? new Map<string, Promise<SnapshotCacheEntry<unknown>>>();
if (!globalThis.__trrAdminSnapshotInFlight) {
  globalThis.__trrAdminSnapshotInFlight = SNAPSHOT_IN_FLIGHT;
}

const CACHE_DISABLED = /^(1|true)$/i.test(process.env.TRR_ADMIN_SNAPSHOT_CACHE_DISABLED ?? "");
const DEFAULT_STALE_IF_ERROR_TTL_MS = 2_500;
const CACHE_MAX_ENTRIES = 1_000;

const normalizeTtlMs = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};

const pruneSnapshotCache = (): void => {
  const now = Date.now();
  for (const [key, entry] of SNAPSHOT_CACHE.entries()) {
    if (entry.staleUntilMs <= now) {
      SNAPSHOT_CACHE.delete(key);
    }
  }
  if (SNAPSHOT_CACHE.size <= CACHE_MAX_ENTRIES) return;
  const overflow = SNAPSHOT_CACHE.size - CACHE_MAX_ENTRIES;
  let removed = 0;
  for (const key of SNAPSHOT_CACHE.keys()) {
    SNAPSHOT_CACHE.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
};

const buildMeta = <T,>(
  entry: SnapshotCacheEntry<T>,
  cacheStatus: "hit" | "miss" | "refresh",
  now: number,
  stale = false,
): SnapshotFetchResult<T>["meta"] => ({
  cacheStatus,
  generatedAt: new Date(entry.generatedAtMs).toISOString(),
  cacheAgeMs: Math.max(0, now - entry.generatedAtMs),
  stale,
});

const readSnapshotEntry = <T,>(cacheKey: string): SnapshotCacheEntry<T> | null => {
  if (CACHE_DISABLED) return null;
  const entry = SNAPSHOT_CACHE.get(cacheKey) as SnapshotCacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.staleUntilMs <= Date.now()) {
    SNAPSHOT_CACHE.delete(cacheKey);
    return null;
  }
  return entry;
};

export const buildAdminSnapshotCacheKey = (input: {
  authPartition: string;
  pageFamily: string;
  scope?: string | null;
  query?: URLSearchParams;
}): string => {
  const scope = input.scope?.trim() ? `:${input.scope.trim()}` : "";
  const normalizedQuery = input.query ? normalizeSearchParams(input.query) : "";
  return `${input.authPartition}:${input.pageFamily}${scope}:${normalizedQuery}`;
};

export const buildAdminAuthPartition = (user: { uid?: string | null; email?: string | null; provider?: string | null }): string => {
  const provider = typeof user.provider === "string" && user.provider.trim().length > 0 ? user.provider.trim() : "admin";
  const identity =
    typeof user.uid === "string" && user.uid.trim().length > 0
      ? user.uid.trim()
      : typeof user.email === "string" && user.email.trim().length > 0
        ? user.email.trim().toLowerCase()
        : "anonymous";
  return `${provider}:${identity}`;
};

type AdminSnapshotFamily =
  | { pageFamily: "season-social-analytics"; scope: string }
  | { pageFamily: "week-social"; scope: string }
  | { pageFamily: "social-profile"; scope: string }
  | { pageFamily: "reddit-sources"; scope: string }
  | { pageFamily: "cast-socialblade"; scope: string }
  | { pageFamily: "system-health"; scope?: string | null };

const buildFamilyFragment = (family: AdminSnapshotFamily): string => {
  const scope = typeof family.scope === "string" && family.scope.trim().length > 0 ? `:${family.scope.trim()}` : "";
  return `:${family.pageFamily}${scope}:`;
};

export async function getOrCreateAdminSnapshot<T>(options: CacheOptions<T>): Promise<SnapshotFetchResult<T>> {
  const now = Date.now();
  const ttlMs = normalizeTtlMs(options.ttlMs, DEFAULT_STALE_IF_ERROR_TTL_MS);
  const staleIfErrorTtlMs = normalizeTtlMs(options.staleIfErrorTtlMs ?? DEFAULT_STALE_IF_ERROR_TTL_MS, DEFAULT_STALE_IF_ERROR_TTL_MS);

  if (!options.forceRefresh) {
    const cached = readSnapshotEntry<T>(options.cacheKey);
    if (cached && cached.expiresAtMs > now) {
      return {
        data: cached.data,
        meta: buildMeta(cached, "hit", now),
      };
    }
  }

  const promiseKey = options.forceRefresh ? `${options.cacheKey}:refresh` : options.cacheKey;
  const existing = SNAPSHOT_IN_FLIGHT.get(promiseKey) as Promise<SnapshotCacheEntry<T>> | undefined;
  const runFetch =
    existing ??
    (async () => {
      const data = await options.fetcher();
      const generatedAtMs = Date.now();
      const entry: SnapshotCacheEntry<T> = {
        data,
        generatedAtMs,
        expiresAtMs: generatedAtMs + ttlMs,
        staleUntilMs: generatedAtMs + ttlMs + staleIfErrorTtlMs,
      };
      if (!CACHE_DISABLED) {
        SNAPSHOT_CACHE.set(options.cacheKey, entry as SnapshotCacheEntry<unknown>);
        pruneSnapshotCache();
      }
      return entry;
    })();

  if (!existing && !CACHE_DISABLED) {
    SNAPSHOT_IN_FLIGHT.set(promiseKey, runFetch as Promise<SnapshotCacheEntry<unknown>>);
  }

  try {
    const entry = await runFetch;
    return {
      data: entry.data,
      meta: buildMeta(entry, options.forceRefresh ? "refresh" : "miss", Date.now()),
    };
  } catch (error) {
    const fallback = readSnapshotEntry<T>(options.cacheKey);
    if (fallback && fallback.staleUntilMs > Date.now()) {
      return {
        data: fallback.data,
        meta: buildMeta(fallback, "hit", Date.now(), true),
      };
    }
    throw error;
  } finally {
    if (!CACHE_DISABLED && SNAPSHOT_IN_FLIGHT.get(promiseKey) === runFetch) {
      SNAPSHOT_IN_FLIGHT.delete(promiseKey);
    }
  }
}

export const invalidateAdminSnapshotCache = (keyPrefix?: string): void => {
  if (CACHE_DISABLED) return;
  if (!keyPrefix) {
    SNAPSHOT_CACHE.clear();
    SNAPSHOT_IN_FLIGHT.clear();
    return;
  }
  for (const key of SNAPSHOT_CACHE.keys()) {
    if (key.startsWith(keyPrefix)) {
      SNAPSHOT_CACHE.delete(key);
    }
  }
  for (const key of SNAPSHOT_IN_FLIGHT.keys()) {
    if (key.startsWith(keyPrefix)) {
      SNAPSHOT_IN_FLIGHT.delete(key);
    }
  }
};

export const invalidateAdminSnapshotFamily = (family: AdminSnapshotFamily): number => {
  if (CACHE_DISABLED) return 0;
  const familyFragment = buildFamilyFragment(family);
  let removed = 0;
  for (const key of SNAPSHOT_CACHE.keys()) {
    if (key.includes(familyFragment)) {
      SNAPSHOT_CACHE.delete(key);
      removed += 1;
    }
  }
  for (const key of SNAPSHOT_IN_FLIGHT.keys()) {
    if (key.includes(familyFragment)) {
      SNAPSHOT_IN_FLIGHT.delete(key);
    }
  }
  return removed;
};

export const invalidateAdminSnapshotFamilies = (families: AdminSnapshotFamily[]): number => {
  return families.reduce((total, family) => total + invalidateAdminSnapshotFamily(family), 0);
};
