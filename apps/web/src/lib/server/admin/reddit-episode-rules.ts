import "server-only";

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();
const normalizeSubredditKey = (value: string): string =>
  value.trim().replace(/^r\//i, "").toLowerCase();
const normalizeText = (value: string): string =>
  collapseWhitespace(value).toLowerCase();

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

const BRAVO_REAL_HOUSEWIVES_SUBREDDIT = "bravorealhousewives";
const RHOSLC_FALLBACK_REQUIRED_FLAIR = "Salt Lake City";
const BRAVO_EPISODE_DISCUSSION_PATTERNS = [
  "Live Episode Discussion",
  "Post Episode Discussion",
  "Weekly Episode Discussion",
] as const;
export const EPISODE_DISCUSSION_TYPE_ALIASES = {
  live: ["live episode discussion", "live thread"],
  post: ["post episode discussion", "post-episode discussion"],
  weekly: ["weekly episode discussion", "weekly thread"],
} as const;

export interface ResolveEpisodeDiscussionRulesInput {
  subreddit: string;
  showName: string;
  showAliases?: string[] | null;
  isShowFocused: boolean;
  episodeTitlePatterns?: string[] | null;
  analysisAllFlares?: string[] | null;
}

export interface ResolvedEpisodeDiscussionRules {
  effectiveEpisodeTitlePatterns: string[];
  effectiveRequiredFlares: string[];
  autoSeededRequiredFlares: boolean;
}

const isRhoslcShow = (showName: string, showAliases: string[] = []): boolean => {
  if (normalizeText(showName).includes("salt lake city")) {
    return true;
  }
  return showAliases.some((alias) => normalizeText(alias) === "rhoslc");
};

export const resolveEpisodeDiscussionRules = (
  input: ResolveEpisodeDiscussionRulesInput,
): ResolvedEpisodeDiscussionRules => {
  const subredditKey = normalizeSubredditKey(input.subreddit);
  const basePatterns = sanitizeEpisodeTitlePatterns(input.episodeTitlePatterns ?? []);
  const effectiveEpisodeTitlePatterns =
    subredditKey === BRAVO_REAL_HOUSEWIVES_SUBREDDIT
      ? sanitizeEpisodeTitlePatterns([...basePatterns, ...BRAVO_EPISODE_DISCUSSION_PATTERNS])
      : basePatterns;

  const baseRequiredFlares = sanitizeEpisodeRequiredFlares(input.analysisAllFlares ?? []);
  const shouldAutoSeedRhoslcFlair =
    !input.isShowFocused &&
    subredditKey === BRAVO_REAL_HOUSEWIVES_SUBREDDIT &&
    baseRequiredFlares.length === 0 &&
    isRhoslcShow(input.showName, input.showAliases ?? []);

  return {
    effectiveEpisodeTitlePatterns,
    effectiveRequiredFlares: shouldAutoSeedRhoslcFlair
      ? [RHOSLC_FALLBACK_REQUIRED_FLAIR]
      : baseRequiredFlares,
    autoSeededRequiredFlares: shouldAutoSeedRhoslcFlair,
  };
};
