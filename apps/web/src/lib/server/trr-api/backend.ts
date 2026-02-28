import "server-only";

const normalizeBackendBase = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/+$/, "");
  let normalized = trimmed;
  try {
    const parsed = new URL(trimmed);
    // Avoid Node fetch preferring IPv6 localhost when backend listens on 127.0.0.1 only.
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
    }
    normalized = parsed.toString().replace(/\/+$/, "");
  } catch {
    normalized = trimmed;
  }
  return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
};

export const getBackendApiBase = (): string | null => {
  const raw = process.env.TRR_API_URL;
  if (!raw) return null;
  return normalizeBackendBase(raw);
};

export const getBackendApiUrl = (path: string): string | null => {
  const base = getBackendApiBase();
  if (!base) return null;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};
