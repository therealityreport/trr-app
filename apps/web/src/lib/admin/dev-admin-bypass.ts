const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseOptionalBoolean(value: string | undefined): boolean | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }
  return null;
}

export function isLocalDevHostname(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (LOCALHOST_HOSTNAMES.has(normalized)) return true;
  return normalized.endsWith(".localhost");
}

export function isDevAdminBypassEnabledClient(hostnameOverride?: string | null): boolean {
  const hostname =
    typeof hostnameOverride === "string"
      ? hostnameOverride
      : typeof window !== "undefined"
        ? window.location.hostname
        : null;
  if (!isLocalDevHostname(hostname)) return false;
  const explicitBypass = parseOptionalBoolean(process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS);
  if (explicitBypass !== null) return explicitBypass;
  return process.env.NODE_ENV === "development";
}
