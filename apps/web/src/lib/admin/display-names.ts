export function normalizeDisplayName(value?: string | null): string | null {
  if (!value) return null;
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > 0 ? collapsed : null;
}

export function normalizeDisplayNameKey(value?: string | null): string | null {
  const normalized = normalizeDisplayName(value);
  if (!normalized) return null;
  return normalized.toLowerCase();
}
