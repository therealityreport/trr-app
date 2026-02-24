import "server-only";

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const sanitizeStringArray = (input: string[] | null | undefined): string[] => {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") continue;
    const cleaned = collapseWhitespace(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(cleaned);
  }

  return output.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
};

export const sanitizeEpisodeTitlePatterns = (input: string[] | null | undefined): string[] =>
  sanitizeStringArray(input);

export const sanitizeEpisodeRequiredFlares = (input: string[] | null | undefined): string[] =>
  sanitizeStringArray(input);
