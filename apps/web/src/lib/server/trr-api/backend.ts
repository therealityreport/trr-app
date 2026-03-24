import "server-only";

const LOOPBACK_BACKEND_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const warnedRemoteBackendBases = new Set<string>();

const isLocalBackendHost = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  return LOOPBACK_BACKEND_HOSTNAMES.has(normalized) || normalized.endsWith(".localhost");
};

const warnOnRemoteBackendBase = (normalizedBase: string, hostname: string): void => {
  if (process.env.NODE_ENV === "production") return;
  if (isLocalBackendHost(hostname)) return;
  if (warnedRemoteBackendBases.has(normalizedBase)) return;
  warnedRemoteBackendBases.add(normalizedBase);
  console.warn(
    `[trr-backend] TRR_API_URL points to a remote host (${hostname}); local dev requests may cross networks.`,
  );
};

const normalizeBackendBase = (rawUrl: string): string => {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  let normalized = trimmed;
  try {
    const parsed = new URL(trimmed);
    // Avoid Node fetch preferring IPv6 localhost when backend listens on 127.0.0.1 only.
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
    }
    normalized = parsed.toString().replace(/\/+$/, "");
    warnOnRemoteBackendBase(normalized, parsed.hostname);
  } catch {
    normalized = trimmed;
  }
  return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
};

export const getBackendApiBase = (): string | null => {
  const raw = process.env.TRR_API_URL?.trim();
  if (!raw) return null;
  return normalizeBackendBase(raw);
};

export const getBackendApiUrl = (path: string): string | null => {
  const base = getBackendApiBase();
  if (!base) return null;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};
