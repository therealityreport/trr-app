const toSlugToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeAlternativeNames = (alternativeNames: unknown): string[] => {
  if (!Array.isArray(alternativeNames)) return [];
  return alternativeNames
    .filter((value): value is string => typeof value === "string")
    .map((value) => toSlugToken(value))
    .filter((value) => value.length > 0);
};

export const resolvePreferredShowAliasSlug = (alternativeNames: unknown): string | null => {
  const normalized = normalizeAlternativeNames(alternativeNames);
  if (normalized.length === 0) return null;

  const acronymCandidate = normalized.find(
    (value) => /^rh[a-z0-9]{2,}$/i.test(value) && !value.includes("-"),
  );
  if (acronymCandidate) return acronymCandidate;
  return normalized[0] ?? null;
};

export const resolvePreferredShowRouteSlug = (input: {
  alternativeNames?: unknown;
  canonicalSlug?: string | null | undefined;
  slug?: string | null | undefined;
  fallback?: string | null | undefined;
}): string => {
  const alias = resolvePreferredShowAliasSlug(input.alternativeNames);
  if (alias) return alias;

  const canonical = typeof input.canonicalSlug === "string" ? toSlugToken(input.canonicalSlug) : "";
  if (canonical) return canonical;

  const legacy = typeof input.slug === "string" ? toSlugToken(input.slug) : "";
  if (legacy) return legacy;

  const fallback = typeof input.fallback === "string" ? toSlugToken(input.fallback) : "";
  if (fallback) return fallback;

  return "show";
};
