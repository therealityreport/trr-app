"use client";

export type AdminLoadSampleSurface =
  | "admin-social-landing"
  | "admin-social-landing-api"
  | "admin-social-profile"
  | "admin-social-profile-snapshot";

export type AdminLoadSample = {
  surface: AdminLoadSampleSurface;
  path: string;
  source: "navigation" | "api";
  duration_ms: number;
  sampled_at?: string;
  cache_status?: string | null;
  server_timing?: string | null;
};

const STORAGE_KEY = "trr-admin-load-samples:v1";
const MAX_SAMPLES_PER_SURFACE = 50;
let storageAvailable: boolean | null = null;

const canUseLocalStorage = (): boolean => {
  if (typeof window === "undefined") return false;
  if (storageAvailable !== null) return storageAvailable;
  try {
    const testKey = `${STORAGE_KEY}:probe`;
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
};

const isAdminLoadSampleSurface = (value: unknown): value is AdminLoadSampleSurface =>
  value === "admin-social-landing" ||
  value === "admin-social-landing-api" ||
  value === "admin-social-profile" ||
  value === "admin-social-profile-snapshot";

const readSamples = (): AdminLoadSample[] => {
  if (!canUseLocalStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is AdminLoadSample => {
      if (!entry || typeof entry !== "object") return false;
      const sample = entry as Partial<AdminLoadSample>;
      return (
        isAdminLoadSampleSurface(sample.surface) &&
        typeof sample.path === "string" &&
        (sample.source === "navigation" || sample.source === "api") &&
        typeof sample.duration_ms === "number" &&
        Number.isFinite(sample.duration_ms)
      );
    });
  } catch {
    return [];
  }
};

export const recordAdminLoadSample = (sample: AdminLoadSample): void => {
  if (!canUseLocalStorage()) return;
  const durationMs = Math.max(0, Math.round(sample.duration_ms));
  if (!Number.isFinite(durationMs)) return;
  const nextSample: AdminLoadSample = {
    ...sample,
    duration_ms: durationMs,
    sampled_at: sample.sampled_at ?? new Date().toISOString(),
  };
  const samples = [...readSamples(), nextSample];
  const grouped = new Map<AdminLoadSampleSurface, AdminLoadSample[]>();
  for (const entry of samples) {
    const entries = grouped.get(entry.surface) ?? [];
    entries.push(entry);
    grouped.set(entry.surface, entries.slice(-MAX_SAMPLES_PER_SURFACE));
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...grouped.values()].flat()));
  } catch {
    // Best-effort telemetry for the current browser only.
  }
};

export const getAdminLoadSampleSurfaceForPath = (path: string): AdminLoadSampleSurface | null => {
  if (path === "/admin/social" || path.startsWith("/admin/social?")) {
    return "admin-social-landing";
  }
  if (/^\/social\/[^/]+\/[^/]+/.test(path)) {
    return "admin-social-profile";
  }
  return null;
};
