export type AdminRecentShowEntry = {
  slug: string;
  label: string;
  href: string;
  touchedAt: number;
};

export const ADMIN_RECENT_SHOWS_STORAGE_KEY = "trr-admin-recent-shows-v1";
export const ADMIN_RECENT_SHOWS_EVENT = "trr-admin-recent-shows-updated";
const MAX_RECENT_SHOWS = 5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const normalizeSlug = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeLabel = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeTimestamp = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
};

export const buildAdminShowHref = (slug: string): string => `/shows/${encodeURIComponent(slug)}`;

const normalizeEntry = (value: unknown): AdminRecentShowEntry | null => {
  if (!isRecord(value)) return null;
  const slug = normalizeSlug(value.slug);
  if (!slug) return null;

  const label = normalizeLabel(value.label) ?? slug;
  const href = normalizeLabel(value.href) ?? buildAdminShowHref(slug);

  return {
    slug,
    label,
    href,
    touchedAt: normalizeTimestamp(value.touchedAt),
  };
};

const dedupeAndCap = (entries: AdminRecentShowEntry[]): AdminRecentShowEntry[] => {
  const deduped = new Map<string, AdminRecentShowEntry>();
  const sorted = [...entries].sort((a, b) => b.touchedAt - a.touchedAt);

  for (const entry of sorted) {
    if (!deduped.has(entry.slug)) {
      deduped.set(entry.slug, entry);
    }
    if (deduped.size >= MAX_RECENT_SHOWS) break;
  }

  return Array.from(deduped.values());
};

const safeReadRaw = (): unknown[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ADMIN_RECENT_SHOWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = (entries: AdminRecentShowEntry[]): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADMIN_RECENT_SHOWS_STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(ADMIN_RECENT_SHOWS_EVENT, { detail: entries }));
  } catch {
    // Ignore localStorage write failures.
  }
};

export const readAdminRecentShows = (): AdminRecentShowEntry[] => {
  const entries = safeReadRaw().map(normalizeEntry).filter((entry): entry is AdminRecentShowEntry => Boolean(entry));
  const normalized = dedupeAndCap(entries);
  return normalized;
};

export const recordAdminRecentShow = (input: { slug: string; label: string; href?: string }): AdminRecentShowEntry[] => {
  const slug = normalizeSlug(input.slug);
  const label = normalizeLabel(input.label);
  if (!slug || !label) {
    return readAdminRecentShows();
  }

  const entry: AdminRecentShowEntry = {
    slug,
    label,
    href: normalizeLabel(input.href) ?? buildAdminShowHref(slug),
    touchedAt: Date.now(),
  };

  const existing = readAdminRecentShows();
  const next = dedupeAndCap([entry, ...existing]);
  safeWrite(next);
  return next;
};

export const subscribeAdminRecentShows = (onUpdate: (entries: AdminRecentShowEntry[]) => void): (() => void) => {
  if (typeof window === "undefined") return () => undefined;

  const sync = () => onUpdate(readAdminRecentShows());

  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== ADMIN_RECENT_SHOWS_STORAGE_KEY) return;
    sync();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(ADMIN_RECENT_SHOWS_EVENT, sync as EventListener);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ADMIN_RECENT_SHOWS_EVENT, sync as EventListener);
  };
};
