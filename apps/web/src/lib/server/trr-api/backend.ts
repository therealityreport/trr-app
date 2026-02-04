import "server-only";

const normalizeBackendBase = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
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

