const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g;

function normalizeWhitespace(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildIdentityVariants(value: unknown): string[] {
  if (typeof value === "number" && Number.isFinite(value)) {
    return [String(value)];
  }
  if (typeof value !== "string") {
    return [];
  }

  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return [];
  }

  const compact = normalized.replace(NON_ALPHANUMERIC_PATTERN, "");
  if (!compact || compact === normalized) {
    return [normalized];
  }

  return [normalized, compact];
}

export function addIdentityToken(target: Set<string>, value: unknown): void {
  buildIdentityVariants(value).forEach((token) => {
    if (token) target.add(token);
  });
}
