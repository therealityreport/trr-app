const SELF_ROLE_PATTERN =
  /\bself\b|\bthemselves\b|\bhimself\b|\bherself\b|\bmyself\b|\bourselves\b|\byourselves\b/i;

export const canonicalizeCastRoleName = (value: string | null | undefined): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  if (SELF_ROLE_PATTERN.test(trimmed)) return "Self";
  return trimmed;
};

export const normalizeCastRoleList = (roles: ReadonlyArray<string>): string[] => {
  const unique = new Set<string>();
  for (const role of roles) {
    const canonical = canonicalizeCastRoleName(role);
    if (canonical) unique.add(canonical);
  }
  return Array.from(unique);
};

export const castRoleMatchesFilter = (role: string, filter: string): boolean =>
  canonicalizeCastRoleName(role).toLowerCase() === canonicalizeCastRoleName(filter).toLowerCase();
