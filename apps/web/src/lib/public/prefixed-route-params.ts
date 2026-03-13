type ParamRecord = Record<string, unknown>;

function normalizeValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return normalizeValue(value[0]);
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function stripPrefix(value: string, prefix: string): string {
  return value.toLowerCase().startsWith(prefix.toLowerCase()) ? value.slice(prefix.length) : value;
}

export function resolvePrefixedRouteParam(
  params: ParamRecord,
  canonicalKey: string,
  prefix: string,
): string | undefined {
  const direct = normalizeValue(params[canonicalKey]);
  if (direct) {
    return stripPrefix(direct, prefix);
  }

  const normalizedTarget = canonicalKey.trim().toLowerCase();
  for (const [key, rawValue] of Object.entries(params)) {
    const normalizedKey = key.trim().toLowerCase();
    if (
      normalizedKey === normalizedTarget ||
      normalizedKey.endsWith(`[${normalizedTarget}]`) ||
      normalizedKey.endsWith(normalizedTarget) ||
      normalizedKey.includes(normalizedTarget)
    ) {
      const resolved = normalizeValue(rawValue);
      if (resolved) {
        return stripPrefix(resolved, prefix);
      }
    }
  }

  return undefined;
}
