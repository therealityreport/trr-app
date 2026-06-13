export const CLASSIC_LOCAL_ADMIN_ORIGIN = "http://admin.localhost:3000";
export const PORTLESS_APP_ORIGIN = "https://trr.localhost";
export const PORTLESS_ADMIN_ORIGIN = "https://admin.trr.localhost";
export const PORTLESS_ADMIN_DASHBOARD_URL = `${PORTLESS_ADMIN_ORIGIN}/admin`;
export const PORTLESS_API_ORIGIN = "https://api.trr.localhost";
export const LEGACY_LOCAL_ADMIN_FALLBACK_ENV = "TRR_LEGACY_LOCAL_ADMIN_FALLBACK";

const LOOPBACK_ADMIN_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

type AdminUrlEnv = Record<string, string | undefined>;

export function normalizeAdminHost(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.startsWith("[")) {
    const closingBracket = normalized.indexOf("]");
    if (closingBracket >= 0) {
      return normalized.slice(0, closingBracket + 1);
    }
  }

  const firstColon = normalized.indexOf(":");
  const lastColon = normalized.lastIndexOf(":");
  if (firstColon > -1 && firstColon === lastColon) {
    const maybePort = normalized.slice(lastColon + 1);
    if (/^\d+$/.test(maybePort)) {
      return normalized.slice(0, lastColon);
    }
  }

  return normalized;
}

export function normalizeAdminOrigin(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

export function parseAdminHostAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => normalizeAdminHost(entry))
      .filter((entry): entry is string => Boolean(entry)),
  );
}

export function isLoopbackAdminHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return LOOPBACK_ADMIN_HOSTS.has(host);
}

export function isLegacyLocalAdminFallbackEnabled(env: AdminUrlEnv = process.env): boolean {
  const raw = env[LEGACY_LOCAL_ADMIN_FALLBACK_ENV]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function resolvePortlessAdminOrigin(env: AdminUrlEnv = process.env): string | null {
  const configuredPortlessAdminOrigin = normalizeAdminOrigin(env.PORTLESS_ADMIN_URL);
  if (configuredPortlessAdminOrigin) return configuredPortlessAdminOrigin;

  const portlessUrl = env.PORTLESS_URL?.trim();
  if (!portlessUrl) return null;

  try {
    const parsed = new URL(portlessUrl);
    const portlessHost = normalizeAdminHost(parsed.hostname);
    if (!portlessHost) return null;
    const adminHostPrefix = env.ADMIN_APP_HOST_PREFIX?.trim() || "admin";
    const adminHost = portlessHost.startsWith(`${adminHostPrefix}.`)
      ? portlessHost
      : `${adminHostPrefix}.${portlessHost}`;
    return `${parsed.protocol}//${adminHost}`;
  } catch {
    return null;
  }
}

export function resolveDefaultAdminOrigin(options?: {
  env?: AdminUrlEnv;
  nodeEnv?: string;
}): string | null {
  const env = options?.env ?? process.env;
  const portlessAdminOrigin = resolvePortlessAdminOrigin(env);
  if (portlessAdminOrigin) return portlessAdminOrigin;
  if (
    (options?.nodeEnv ?? process.env.NODE_ENV) === "development" &&
    isLegacyLocalAdminFallbackEnabled(env)
  ) {
    return CLASSIC_LOCAL_ADMIN_ORIGIN;
  }
  const configuredBaseDomain = normalizeAdminHost(env.ADMIN_APP_BASE_DOMAIN);
  if (configuredBaseDomain) {
    const adminHostPrefix = env.ADMIN_APP_HOST_PREFIX?.trim() || "admin";
    return `https://${adminHostPrefix}.${configuredBaseDomain}`;
  }
  return null;
}

export function resolveConfiguredAdminOrigin(env: AdminUrlEnv = process.env): string | null {
  return normalizeAdminOrigin(env.ADMIN_APP_ORIGIN) ?? resolvePortlessAdminOrigin(env);
}

export function resolveAdminOriginFromRequest(input: {
  env?: AdminUrlEnv;
  nodeEnv?: string;
  requestHost: string | null | undefined;
  requestHostname: string | null | undefined;
  requestOrigin: string;
  requestPort: string;
  requestProtocol: string;
  deriveFromRequestHost: boolean;
}): string | null {
  const env = input.env ?? process.env;
  const configuredOrigin = resolveConfiguredAdminOrigin(env);
  if (configuredOrigin) return configuredOrigin;

  const shouldDeriveAdminOrigin =
    input.deriveFromRequestHost ||
    Boolean(env.ADMIN_APP_BASE_DOMAIN?.trim()) ||
    (input.nodeEnv === "development" &&
      (isLegacyLocalAdminFallbackEnabled(env) ||
        !isLoopbackAdminHost(normalizeAdminHost(input.requestHost) ?? normalizeAdminHost(input.requestHostname))));
  if (!shouldDeriveAdminOrigin) return input.requestOrigin;

  const adminHostPrefix = env.ADMIN_APP_HOST_PREFIX?.trim() || "admin";
  const configuredBaseDomain = normalizeAdminHost(env.ADMIN_APP_BASE_DOMAIN);
  const requestHost =
    configuredBaseDomain ?? normalizeAdminHost(input.requestHost) ?? normalizeAdminHost(input.requestHostname);
  if (!requestHost) return input.requestOrigin;

  const adminHost = requestHost.startsWith(`${adminHostPrefix}.`)
    ? requestHost
    : isLoopbackAdminHost(requestHost)
      ? `${adminHostPrefix}.localhost`
      : `${adminHostPrefix}.${requestHost}`;
  const port = input.requestPort ? `:${input.requestPort}` : "";
  return `${input.requestProtocol}//${adminHost}${port}`;
}

export function isPortfulPortlessAdminFallback(input: {
  hostname: string | null | undefined;
  port: string | null | undefined;
}): boolean {
  const hostname = normalizeAdminHost(input.hostname);
  return hostname === "admin.localhost" && Boolean(input.port?.trim());
}
