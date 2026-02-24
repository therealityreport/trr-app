import {
  normalizeRedditFlairLabel,
  sanitizeRedditFlairList,
} from "@/lib/server/admin/reddit-flair-normalization";
import {
  EPISODE_DISCUSSION_TYPE_ALIASES,
  sanitizeEpisodeTitlePatterns,
} from "@/lib/server/admin/reddit-episode-rules";

export type RedditListingSort = "new" | "hot" | "top";
export type EpisodeDiscussionType = "live" | "post" | "weekly";

export interface RedditDiscoveryThread {
  reddit_post_id: string;
  title: string;
  text: string | null;
  url: string;
  permalink: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
  link_flair_text: string | null;
  source_sorts: RedditListingSort[];
  matched_terms: string[];
  matched_cast_terms: string[];
  cross_show_terms: string[];
  is_show_match: boolean;
  passes_flair_filter: boolean;
  match_score: number;
  suggested_include_terms: string[];
  suggested_exclude_terms: string[];
}

export interface RedditDiscoveryHints {
  suggested_include_terms: string[];
  suggested_exclude_terms: string[];
}

export interface DiscoverSubredditThreadsInput {
  subreddit: string;
  showName: string;
  showAliases?: string[] | null;
  castNames?: string[] | null;
  isShowFocused?: boolean;
  analysisFlares?: string[] | null;
  analysisAllFlares?: string[] | null;
  sortModes?: RedditListingSort[];
  limitPerMode?: number;
}

export interface DiscoverSubredditThreadsResult {
  subreddit: string;
  fetched_at: string;
  sources_fetched: RedditListingSort[];
  successful_sorts: RedditListingSort[];
  failed_sorts: RedditListingSort[];
  rate_limited_sorts: RedditListingSort[];
  terms: string[];
  hints: RedditDiscoveryHints;
  threads: RedditDiscoveryThread[];
}

export interface RedditEpisodeDiscussionCandidate {
  reddit_post_id: string;
  title: string;
  text: string | null;
  url: string;
  permalink: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
  link_flair_text: string | null;
  episode_number: number;
  discussion_type: EpisodeDiscussionType;
  source_sorts: RedditListingSort[];
  match_reasons: string[];
}

export interface EpisodeDiscussionMatrixCell {
  post_count: number;
  total_comments: number;
  total_upvotes: number;
  top_post_id: string | null;
  top_post_url: string | null;
}

export interface EpisodeDiscussionMatrixRow {
  episode_number: number;
  live: EpisodeDiscussionMatrixCell;
  post: EpisodeDiscussionMatrixCell;
  weekly: EpisodeDiscussionMatrixCell;
  total_posts: number;
  total_comments: number;
  total_upvotes: number;
}

export interface DiscoverEpisodeDiscussionThreadsInput {
  subreddit: string;
  showName: string;
  showAliases?: string[] | null;
  seasonNumber: number;
  episodeTitlePatterns?: string[] | null;
  episodeRequiredFlares?: string[] | null;
  isShowFocused?: boolean;
  periodStart?: string | null;
  periodEnd?: string | null;
  sortModes?: RedditListingSort[];
  limitPerMode?: number;
}

export interface DiscoverEpisodeDiscussionThreadsResult {
  subreddit: string;
  fetched_at: string;
  sources_fetched: RedditListingSort[];
  successful_sorts: RedditListingSort[];
  failed_sorts: RedditListingSort[];
  rate_limited_sorts: RedditListingSort[];
  candidates: RedditEpisodeDiscussionCandidate[];
  episode_matrix: EpisodeDiscussionMatrixRow[];
  filters_applied: {
    season_number: number;
    title_patterns: string[];
    required_flares: string[];
    show_focused: boolean;
    period_start: string | null;
    period_end: string | null;
  };
}

export class RedditDiscoveryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "RedditDiscoveryError";
    this.status = status;
  }
}

interface RedditListingChild {
  data?: {
    id?: string;
    title?: string;
    selftext?: string;
    url?: string;
    permalink?: string;
    author?: string;
    score?: number;
    num_comments?: number;
    created_utc?: number;
    link_flair_text?: string | null;
  };
}

interface RedditListingPayload {
  data?: {
    children?: RedditListingChild[];
  };
}

interface SortFetchDiagnostics {
  successful_sorts: RedditListingSort[];
  failed_sorts: RedditListingSort[];
  rate_limited_sorts: RedditListingSort[];
}

const DEFAULT_SORTS: RedditListingSort[] = ["new", "hot", "top"];
const DEFAULT_LIMIT_PER_MODE = 35;
const DEFAULT_EPISODE_LIMIT_PER_MODE = 65;
const MAX_LIMIT_PER_MODE = 80;
const DEFAULT_REDDIT_TIMEOUT_MS = 12_000;
const DEFAULT_REDDIT_USER_AGENT = "TRRAdminRedditDiscovery/1.0 (+https://thereality.report)";
const MAX_REDDIT_FETCH_RETRIES = 2;
const RETRYABLE_REDDIT_STATUS = new Set([429, 502, 503, 504]);

const FRANCHISE_EXCLUDE_TERMS = [
  "rhoa",
  "rhobh",
  "rhop",
  "rhonj",
  "rhony",
  "rhoc",
  "rhom",
  "rhodubai",
  "wife swap",
  "real housewives edition",
] as const;

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getFetchTimeoutMs = (): number => {
  const raw = process.env.REDDIT_FETCH_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_REDDIT_TIMEOUT_MS;
};

const getRedditUserAgent = (): string =>
  (process.env.REDDIT_USER_AGENT ?? "").trim() || DEFAULT_REDDIT_USER_AGENT;

const dedupeTerms = (terms: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const term of terms.map(normalizeText)) {
    if (!term || seen.has(term)) continue;
    seen.add(term);
    result.push(term);
  }
  return result;
};

const maybeBuildHousewivesAcronym = (name: string): string | null => {
  const normalized = name.trim().replace(/^the\s+/i, "");
  const match = normalized.match(/real housewives of (.+)$/i);
  if (!match) return null;

  const remainder = match[1]
    .replace(/[()]/g, " ")
    .replace(/[^A-Za-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!remainder) return null;

  const stopWords = new Set(["of", "the", "and"]);
  const initials = remainder
    .split(" ")
    .filter((word) => word.length > 0 && !stopWords.has(word.toLowerCase()))
    .map((word) => word[0]?.toUpperCase())
    .filter((value): value is string => Boolean(value));

  if (initials.length === 0) return null;
  return `RHO${initials.join("")}`;
};

const buildShowTerms = (showName: string, aliases: string[] = []): string[] => {
  const baseNames = [showName, ...aliases]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  const extraTerms: string[] = [];
  for (const name of baseNames) {
    const normalized = normalizeText(name);
    if (normalized) {
      extraTerms.push(normalized);
    }

    const acronym = maybeBuildHousewivesAcronym(name);
    if (acronym) {
      extraTerms.push(acronym.toLowerCase());
    }

    if (/^rh[a-z0-9]{2,}$/i.test(name)) {
      extraTerms.push(name.toLowerCase());
    }

    const housewivesMatch = normalized.match(/^real housewives of (.+)$/);
    if (housewivesMatch?.[1]) {
      extraTerms.push(housewivesMatch[1]);
    }
  }

  return dedupeTerms(extraTerms).slice(0, 18);
};

const buildCastTerms = (castNames: string[] = []): string[] => {
  const terms: string[] = [];
  for (const castName of castNames) {
    const normalizedName = normalizeText(castName);
    if (!normalizedName) continue;
    terms.push(normalizedName);

    const pieces = normalizedName
      .split(" ")
      .map((piece) => piece.replace(/[^a-z0-9]/g, ""))
      .filter((piece) => piece.length >= 3);
    if (pieces.length > 0) {
      terms.push(pieces[0]);
      if (pieces.length > 1) {
        terms.push(pieces[pieces.length - 1]);
      }
    }
  }
  return dedupeTerms(terms).slice(0, 160);
};

const containsTerm = (haystack: string, term: string): boolean => {
  const escaped = escapeRegex(term);
  const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return regex.test(haystack);
};

const findMatchedTerms = (text: string, terms: string[]): string[] =>
  terms.filter((term) => containsTerm(text, term));

const hasSeasonToken = (text: string, seasonNumber: number): boolean => {
  if (!Number.isFinite(seasonNumber) || seasonNumber <= 0) return false;
  const seasonRegex = new RegExp(`\\bseason\\s*${seasonNumber}\\b`, "i");
  const shortRegex = new RegExp(`\\bs\\s*0*${seasonNumber}\\b`, "i");
  const shortEpisodeRegex = new RegExp(`\\bs\\s*0*${seasonNumber}\\s*e\\s*0*\\d+\\b`, "i");
  return seasonRegex.test(text) || shortRegex.test(text) || shortEpisodeRegex.test(text);
};

const DISCUSSION_TYPE_ORDER: Record<EpisodeDiscussionType, number> = {
  live: 0,
  post: 1,
  weekly: 2,
};

const DISCUSSION_TYPE_ALIASES: Record<EpisodeDiscussionType, string[]> = {
  live: EPISODE_DISCUSSION_TYPE_ALIASES.live.map((value) => normalizeText(value)),
  post: EPISODE_DISCUSSION_TYPE_ALIASES.post.map((value) => normalizeText(value)),
  weekly: EPISODE_DISCUSSION_TYPE_ALIASES.weekly.map((value) => normalizeText(value)),
};

const normalizeDiscussionAlias = (value: string): string =>
  normalizeText(value).replace(/\s*-\s*/g, "-");

const parseDiscussionTypeFromTitle = (title: string): EpisodeDiscussionType | null => {
  const normalized = normalizeText(title);
  const normalizedHyphen = normalizeDiscussionAlias(title);
  for (const type of Object.keys(DISCUSSION_TYPE_ALIASES) as EpisodeDiscussionType[]) {
    const aliases = DISCUSSION_TYPE_ALIASES[type];
    if (
      aliases.some(
        (alias) => normalized.includes(alias) || normalizedHyphen.includes(alias.replace(/\s+/g, "-")),
      )
    ) {
      return type;
    }
  }
  return null;
};

const inferDiscussionTypeFromPattern = (pattern: string): EpisodeDiscussionType | null => {
  const normalized = normalizeText(pattern);
  const normalizedHyphen = normalizeDiscussionAlias(pattern);
  for (const type of Object.keys(DISCUSSION_TYPE_ALIASES) as EpisodeDiscussionType[]) {
    const aliases = DISCUSSION_TYPE_ALIASES[type];
    if (
      aliases.some(
        (alias) => normalized.includes(alias) || normalizedHyphen.includes(alias.replace(/\s+/g, "-")),
      )
    ) {
      return type;
    }
  }
  return null;
};

const parseEpisodeNumberFromTitle = (title: string): number | null => {
  const normalized = normalizeText(title);
  const candidates = new Set<number>();
  const pushParsed = (raw: string | undefined) => {
    if (!raw) return;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      candidates.add(parsed);
    }
  };

  pushParsed(normalized.match(/\bs\s*0*\d+\s*e\s*0*(\d{1,3})\b/i)?.[1]);
  pushParsed(normalized.match(/\bepisode\s*0*(\d{1,3})\b/i)?.[1]);

  const shortEpisodeMatch = normalized.match(
    /(?:^|[\s\-–—:|,(])e(?:p(?:isode)?)?\s*0*(\d{1,3})(?=$|[\s\-–—:|),])/i,
  );
  const hasEpisodeContext =
    /\bseason\s*\d+\b/i.test(normalized) ||
    /\bs\s*0*\d+\s*e\s*0*\d+\b/i.test(normalized) ||
    /\bepisode discussion\b/i.test(normalized) ||
    /\b(thread|discussion)\b/i.test(normalized);
  if (hasEpisodeContext) {
    pushParsed(shortEpisodeMatch?.[1]);
  }

  const parsedValues = [...candidates];
  if (parsedValues.length !== 1) {
    return null;
  }
  return parsedValues[0] ?? null;
};

const parseIsoDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoOrNull = (createdUtc: number | undefined): string | null => {
  if (!Number.isFinite(createdUtc)) return null;
  return new Date((createdUtc as number) * 1000).toISOString();
};

const toAbsoluteRedditUrl = (value: string): string => {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `https://www.reddit.com${value}`;
  return `https://www.reddit.com/${value}`;
};

const makeSortUrl = (subreddit: string, sort: RedditListingSort, limit: number): string => {
  const params = new URLSearchParams({ limit: String(limit), raw_json: "1" });
  if (sort === "top") {
    params.set("t", "month");
  }
  return `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${sort}.json?${params.toString()}`;
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const parseListingPayload = (
  payload: RedditListingPayload,
  sort: RedditListingSort,
): RedditDiscoveryThread[] => {
  const children = payload.data?.children ?? [];
  return children
    .map((child): RedditDiscoveryThread | null => {
      const data = child.data;
      if (!data?.id || !data.title || !data.url) return null;
      const flair =
        typeof data.link_flair_text === "string" && data.link_flair_text.trim().length > 0
          ? data.link_flair_text
          : null;

      return {
        reddit_post_id: data.id,
        title: data.title,
        text: typeof data.selftext === "string" && data.selftext.trim().length > 0 ? data.selftext : null,
        url: toAbsoluteRedditUrl(data.url),
        permalink: data.permalink ? toAbsoluteRedditUrl(data.permalink) : null,
        author: data.author ?? null,
        score: Number.isFinite(data.score) ? (data.score as number) : 0,
        num_comments: Number.isFinite(data.num_comments) ? (data.num_comments as number) : 0,
        posted_at: toIsoOrNull(data.created_utc),
        link_flair_text: flair,
        source_sorts: [sort],
        matched_terms: [],
        matched_cast_terms: [],
        cross_show_terms: [],
        is_show_match: false,
        passes_flair_filter: true,
        match_score: 0,
        suggested_include_terms: [],
        suggested_exclude_terms: [],
      };
    })
    .filter((thread): thread is RedditDiscoveryThread => Boolean(thread));
};

const fetchSort = async (
  subreddit: string,
  sort: RedditListingSort,
  limit: number,
): Promise<RedditDiscoveryThread[]> => {
  for (let attempt = 0; attempt <= MAX_REDDIT_FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getFetchTimeoutMs());
    try {
      const response = await fetch(makeSortUrl(subreddit, sort, limit), {
        headers: {
          Accept: "application/json",
          "User-Agent": getRedditUserAgent(),
        },
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.status === 404) {
        throw new RedditDiscoveryError("Subreddit not found", 404);
      }
      if (response.status === 429) {
        throw new RedditDiscoveryError("Reddit rate limit hit, try again shortly", 429);
      }
      if (!response.ok) {
        const mappedStatus = RETRYABLE_REDDIT_STATUS.has(response.status) ? response.status : 502;
        throw new RedditDiscoveryError(`Reddit request failed (${response.status})`, mappedStatus);
      }

      const payload = (await response.json()) as RedditListingPayload;
      return parseListingPayload(payload, sort);
    } catch (error) {
      const mappedError =
        error instanceof RedditDiscoveryError
          ? error
          : (error as { name?: string } | null)?.name === "AbortError"
            ? new RedditDiscoveryError("Reddit request timed out", 504)
            : new RedditDiscoveryError("Failed to fetch subreddit threads", 502);

      const shouldRetry =
        RETRYABLE_REDDIT_STATUS.has(mappedError.status) && attempt < MAX_REDDIT_FETCH_RETRIES;
      if (!shouldRetry) {
        throw mappedError;
      }

      const retryDelayMs = 250 * 2 ** attempt + Math.floor(Math.random() * 120);
      await sleep(retryDelayMs);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new RedditDiscoveryError("Failed to fetch subreddit threads", 502);
};

const fetchSortsWithDiagnostics = async (
  subreddit: string,
  sortModes: RedditListingSort[],
  limitPerMode: number,
): Promise<{ rows: RedditDiscoveryThread[]; diagnostics: SortFetchDiagnostics }> => {
  const startedAt = Date.now();
  const settled = await Promise.allSettled(
    sortModes.map(async (sort) => {
      const rows = await fetchSort(subreddit, sort, limitPerMode);
      return { sort, rows };
    }),
  );

  const diagnostics: SortFetchDiagnostics = {
    successful_sorts: [],
    failed_sorts: [],
    rate_limited_sorts: [],
  };
  const rows: RedditDiscoveryThread[] = [];
  let firstError: RedditDiscoveryError | null = null;

  settled.forEach((result, index) => {
    const sort = sortModes[index];
    if (!sort) return;
    if (result.status === "fulfilled") {
      diagnostics.successful_sorts.push(sort);
      rows.push(...result.value.rows);
      return;
    }

    diagnostics.failed_sorts.push(sort);
    const reason = result.reason;
    const discoveryError =
      reason instanceof RedditDiscoveryError
        ? reason
        : new RedditDiscoveryError("Failed to fetch subreddit threads", 502);
    if (discoveryError.status === 429) {
      diagnostics.rate_limited_sorts.push(sort);
    }
    if (!firstError) {
      firstError = discoveryError;
    }
  });

  console.info("[reddit_discovery_sorts]", {
    subreddit,
    sorts: sortModes,
    successful_sorts: diagnostics.successful_sorts,
    failed_sorts: diagnostics.failed_sorts,
    rate_limited_sorts: diagnostics.rate_limited_sorts,
    duration_ms: Date.now() - startedAt,
  });

  if (diagnostics.successful_sorts.length === 0) {
    throw firstError ?? new RedditDiscoveryError("Failed to fetch subreddit threads", 502);
  }

  return { rows, diagnostics };
};

const mergeByPostId = (rows: RedditDiscoveryThread[]): RedditDiscoveryThread[] => {
  const byId = new Map<string, RedditDiscoveryThread>();
  for (const row of rows) {
    const existing = byId.get(row.reddit_post_id);
    if (!existing) {
      byId.set(row.reddit_post_id, row);
      continue;
    }
    const mergedSorts = new Set<RedditListingSort>([...existing.source_sorts, ...row.source_sorts]);
    const preferred = row.score > existing.score ? row : existing;
    byId.set(row.reddit_post_id, {
      ...preferred,
      source_sorts: [...mergedSorts],
    });
  }
  return [...byId.values()];
};

const applyMatchMetadata = (
  threads: RedditDiscoveryThread[],
  terms: string[],
  castTerms: string[],
  subreddit: string,
  isShowFocused: boolean,
  analysisScanFlares: string[],
  analysisAllFlares: string[],
): { threads: RedditDiscoveryThread[]; hints: RedditDiscoveryHints } => {
  const includeCounts = new Map<string, number>();
  const excludeCounts = new Map<string, number>();
  const analysisAllFlairKeys = new Set(analysisAllFlares.map((flair) => flair.toLowerCase()));
  const analysisScanFlairKeys = new Set(
    analysisScanFlares
      .map((flair) => flair.toLowerCase())
      .filter((flair) => !analysisAllFlairKeys.has(flair)),
  );
  const hasAnalysisFlairFilter =
    !isShowFocused && (analysisAllFlairKeys.size > 0 || analysisScanFlairKeys.size > 0);
  const threadsWithMeta: RedditDiscoveryThread[] = [];

  for (const thread of threads) {
    const text = normalizeText(`${thread.title} ${thread.text ?? ""}`);
    const matchedTerms = findMatchedTerms(text, terms);
    const matchedCastTerms = findMatchedTerms(text, castTerms);
    const crossShowTerms = FRANCHISE_EXCLUDE_TERMS.filter((term) => {
      if (terms.includes(term)) return false;
      return containsTerm(text, term);
    });
    const includeTerms = dedupeTerms([...matchedTerms, ...matchedCastTerms]);
    const titleMatchBonus = includeTerms.some((term) => containsTerm(normalizeText(thread.title), term))
      ? 1
      : 0;
    const isShowMatch = includeTerms.length > 0;
    const matchScore = includeTerms.length + titleMatchBonus;
    const normalizedThreadFlair = thread.link_flair_text
      ? normalizeRedditFlairLabel(subreddit, thread.link_flair_text)
      : null;
    const flairKey = normalizedThreadFlair?.toLowerCase() ?? null;
    const matchesAllPostsFlair = Boolean(flairKey && analysisAllFlairKeys.has(flairKey));
    const matchesScanFlair = Boolean(flairKey && analysisScanFlairKeys.has(flairKey));
    const passesFlairFilter = hasAnalysisFlairFilter
      ? matchesAllPostsFlair || matchesScanFlair
      : true;
    const shouldInclude = !hasAnalysisFlairFilter
      ? true
      : matchesAllPostsFlair || (matchesScanFlair && isShowMatch);

    if (!shouldInclude) {
      continue;
    }

    for (const term of includeTerms) {
      includeCounts.set(term, (includeCounts.get(term) ?? 0) + 1);
    }
    for (const term of crossShowTerms) {
      excludeCounts.set(term, (excludeCounts.get(term) ?? 0) + 1);
    }

    threadsWithMeta.push({
      ...thread,
      link_flair_text: normalizedThreadFlair ?? thread.link_flair_text,
      matched_terms: matchedTerms,
      matched_cast_terms: matchedCastTerms,
      cross_show_terms: crossShowTerms,
      is_show_match: isShowMatch,
      passes_flair_filter: passesFlairFilter,
      match_score: matchScore,
      suggested_include_terms: includeTerms.slice(0, 4),
      suggested_exclude_terms: crossShowTerms.slice(0, 4),
    });
  }

  const suggestedIncludeTerms = [...includeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .slice(0, 8);

  const suggestedExcludeTerms = [...excludeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .slice(0, 8);

  return {
    threads: threadsWithMeta,
    hints: {
      suggested_include_terms: suggestedIncludeTerms,
      suggested_exclude_terms: suggestedExcludeTerms,
    },
  };
};

export async function discoverSubredditThreads(
  input: DiscoverSubredditThreadsInput,
): Promise<DiscoverSubredditThreadsResult> {
  const subreddit = input.subreddit.trim();
  const requestStartedAt = Date.now();
  const sortModes = input.sortModes?.length ? input.sortModes : DEFAULT_SORTS;
  const limitPerMode = Math.min(
    Math.max(input.limitPerMode ?? DEFAULT_LIMIT_PER_MODE, 1),
    MAX_LIMIT_PER_MODE,
  );
  const terms = buildShowTerms(input.showName, input.showAliases ?? []);
  const castTerms = buildCastTerms(input.castNames ?? []);
  const analysisScanFlares = sanitizeRedditFlairList(subreddit, input.analysisFlares ?? []);
  const analysisAllFlares = sanitizeRedditFlairList(subreddit, input.analysisAllFlares ?? []);
  const isShowFocused = input.isShowFocused ?? false;

  if (terms.length === 0) {
    throw new RedditDiscoveryError("Show terms are required for discovery", 400);
  }

  const { rows: fetchedRows, diagnostics } = await fetchSortsWithDiagnostics(
    subreddit,
    sortModes,
    limitPerMode,
  );
  const mergedThreads = mergeByPostId(fetchedRows);
  const { threads, hints } = applyMatchMetadata(
    mergedThreads,
    terms,
    castTerms,
    subreddit,
    isShowFocused,
    analysisScanFlares,
    analysisAllFlares,
  );

  threads.sort((a, b) => {
    if (b.match_score !== a.match_score) return b.match_score - a.match_score;
    if (b.num_comments !== a.num_comments) return b.num_comments - a.num_comments;
    return b.score - a.score;
  });

  console.info("[reddit_discover_threads_complete]", {
    subreddit,
    requested_sorts: sortModes,
    successful_sorts: diagnostics.successful_sorts,
    failed_sorts: diagnostics.failed_sorts,
    rate_limited_sorts: diagnostics.rate_limited_sorts,
    threads_returned: threads.length,
    duration_ms: Date.now() - requestStartedAt,
  });

  return {
    subreddit,
    fetched_at: new Date().toISOString(),
    sources_fetched: diagnostics.successful_sorts,
    successful_sorts: diagnostics.successful_sorts,
    failed_sorts: diagnostics.failed_sorts,
    rate_limited_sorts: diagnostics.rate_limited_sorts,
    terms,
    hints,
    threads,
  };
}

interface MutableEpisodeMatrixCell extends EpisodeDiscussionMatrixCell {
  _top_comments: number;
  _top_upvotes: number;
}

interface MutableEpisodeMatrixRow {
  episode_number: number;
  live: MutableEpisodeMatrixCell;
  post: MutableEpisodeMatrixCell;
  weekly: MutableEpisodeMatrixCell;
  total_posts: number;
  total_comments: number;
  total_upvotes: number;
}

const createMutableEpisodeMatrixCell = (): MutableEpisodeMatrixCell => ({
  post_count: 0,
  total_comments: 0,
  total_upvotes: 0,
  top_post_id: null,
  top_post_url: null,
  _top_comments: -1,
  _top_upvotes: -1,
});

const createMutableEpisodeMatrixRow = (episodeNumber: number): MutableEpisodeMatrixRow => ({
  episode_number: episodeNumber,
  live: createMutableEpisodeMatrixCell(),
  post: createMutableEpisodeMatrixCell(),
  weekly: createMutableEpisodeMatrixCell(),
  total_posts: 0,
  total_comments: 0,
  total_upvotes: 0,
});

const toMatrixCell = (cell: MutableEpisodeMatrixCell): EpisodeDiscussionMatrixCell => ({
  post_count: cell.post_count,
  total_comments: cell.total_comments,
  total_upvotes: cell.total_upvotes,
  top_post_id: cell.top_post_id,
  top_post_url: cell.top_post_url,
});

const buildEpisodeDiscussionMatrix = (
  candidates: RedditEpisodeDiscussionCandidate[],
): EpisodeDiscussionMatrixRow[] => {
  const byEpisode = new Map<number, MutableEpisodeMatrixRow>();

  for (const candidate of candidates) {
    let row = byEpisode.get(candidate.episode_number);
    if (!row) {
      row = createMutableEpisodeMatrixRow(candidate.episode_number);
      byEpisode.set(candidate.episode_number, row);
    }

    const cell = row[candidate.discussion_type];
    cell.post_count += 1;
    cell.total_comments += candidate.num_comments;
    cell.total_upvotes += candidate.score;

    const shouldPromoteTop =
      candidate.num_comments > cell._top_comments ||
      (candidate.num_comments === cell._top_comments && candidate.score > cell._top_upvotes);
    if (shouldPromoteTop) {
      cell.top_post_id = candidate.reddit_post_id;
      cell.top_post_url = candidate.url;
      cell._top_comments = candidate.num_comments;
      cell._top_upvotes = candidate.score;
    }

    row.total_posts += 1;
    row.total_comments += candidate.num_comments;
    row.total_upvotes += candidate.score;
  }

  return [...byEpisode.values()]
    .sort((a, b) => a.episode_number - b.episode_number)
    .map((row) => ({
      episode_number: row.episode_number,
      live: toMatrixCell(row.live),
      post: toMatrixCell(row.post),
      weekly: toMatrixCell(row.weekly),
      total_posts: row.total_posts,
      total_comments: row.total_comments,
      total_upvotes: row.total_upvotes,
    }));
};

export async function discoverEpisodeDiscussionThreads(
  input: DiscoverEpisodeDiscussionThreadsInput,
): Promise<DiscoverEpisodeDiscussionThreadsResult> {
  const subreddit = input.subreddit.trim();
  const requestStartedAt = Date.now();
  const sortModes = input.sortModes?.length ? input.sortModes : DEFAULT_SORTS;
  const limitPerMode = Math.min(
    Math.max(input.limitPerMode ?? DEFAULT_EPISODE_LIMIT_PER_MODE, 1),
    MAX_LIMIT_PER_MODE,
  );
  const seasonNumber = Math.max(1, Math.floor(input.seasonNumber));
  const showTerms = buildShowTerms(input.showName, input.showAliases ?? []);
  const titlePatterns = sanitizeEpisodeTitlePatterns(input.episodeTitlePatterns ?? []);
  const requiredFlares = sanitizeRedditFlairList(subreddit, input.episodeRequiredFlares ?? []);
  const requiredFlairKeys = new Set(requiredFlares.map((flair) => flair.toLowerCase()));
  const isShowFocused = input.isShowFocused ?? false;
  const periodStartDate = parseIsoDate(input.periodStart);
  const periodEndDate = parseIsoDate(input.periodEnd);

  if (input.periodStart && !periodStartDate) {
    throw new RedditDiscoveryError("period_start must be a valid ISO datetime", 400);
  }
  if (input.periodEnd && !periodEndDate) {
    throw new RedditDiscoveryError("period_end must be a valid ISO datetime", 400);
  }
  if (periodStartDate && periodEndDate && periodStartDate.getTime() > periodEndDate.getTime()) {
    throw new RedditDiscoveryError("period_start must be before period_end", 400);
  }

  if (showTerms.length === 0) {
    throw new RedditDiscoveryError("Show terms are required for discovery", 400);
  }
  if (titlePatterns.length === 0) {
    throw new RedditDiscoveryError("At least one episode title pattern is required", 400);
  }

  const { rows: fetchedRows, diagnostics } = await fetchSortsWithDiagnostics(
    subreddit,
    sortModes,
    limitPerMode,
  );
  const mergedThreads = mergeByPostId(fetchedRows);

  const candidates: RedditEpisodeDiscussionCandidate[] = [];
  for (const thread of mergedThreads) {
    const title = normalizeText(thread.title);
    const text = normalizeText(`${thread.title} ${thread.text ?? ""}`);
    const discussionType = parseDiscussionTypeFromTitle(thread.title);
    if (!discussionType) continue;
    const matchedPatterns = titlePatterns.filter((pattern) => {
      const normalizedPattern = normalizeText(pattern);
      if (title.includes(normalizedPattern)) {
        return true;
      }
      const patternType = inferDiscussionTypeFromPattern(pattern);
      return patternType !== null && discussionType === patternType;
    });
    if (matchedPatterns.length === 0) continue;

    const matchedShowTerms = findMatchedTerms(text, showTerms);
    if (matchedShowTerms.length === 0) continue;

    if (!hasSeasonToken(text, seasonNumber)) continue;
    const episodeNumber = parseEpisodeNumberFromTitle(thread.title);
    if (!episodeNumber) continue;

    const postedAtDate = parseIsoDate(thread.posted_at);
    if (periodStartDate || periodEndDate) {
      if (!postedAtDate) continue;
      if (periodStartDate && postedAtDate.getTime() < periodStartDate.getTime()) continue;
      if (periodEndDate && postedAtDate.getTime() > periodEndDate.getTime()) continue;
    }

    const normalizedThreadFlair = thread.link_flair_text
      ? normalizeRedditFlairLabel(subreddit, thread.link_flair_text)
      : null;
    if (!isShowFocused && requiredFlairKeys.size > 0) {
      const flairKey = normalizedThreadFlair?.toLowerCase() ?? null;
      if (!flairKey || !requiredFlairKeys.has(flairKey)) {
        continue;
      }
    }

    const matchReasons = [
      `title pattern: ${matchedPatterns[0]}`,
      `show term: ${matchedShowTerms[0]}`,
      `season: ${seasonNumber}`,
      `episode: ${episodeNumber}`,
      `type: ${discussionType}`,
    ];
    if (normalizedThreadFlair) {
      matchReasons.push(`flair: ${normalizedThreadFlair}`);
    }

    candidates.push({
      reddit_post_id: thread.reddit_post_id,
      title: thread.title,
      text: thread.text,
      url: thread.url,
      permalink: thread.permalink,
      author: thread.author,
      score: thread.score,
      num_comments: thread.num_comments,
      posted_at: thread.posted_at,
      link_flair_text: normalizedThreadFlair ?? thread.link_flair_text,
      episode_number: episodeNumber,
      discussion_type: discussionType,
      source_sorts: thread.source_sorts,
      match_reasons: matchReasons,
    });
  }

  candidates.sort((a, b) => {
    if (a.episode_number !== b.episode_number) return a.episode_number - b.episode_number;
    if (DISCUSSION_TYPE_ORDER[a.discussion_type] !== DISCUSSION_TYPE_ORDER[b.discussion_type]) {
      return DISCUSSION_TYPE_ORDER[a.discussion_type] - DISCUSSION_TYPE_ORDER[b.discussion_type];
    }
    if (b.num_comments !== a.num_comments) return b.num_comments - a.num_comments;
    return b.score - a.score;
  });

  const episodeMatrix = buildEpisodeDiscussionMatrix(candidates);

  console.info("[reddit_discover_episode_discussions_complete]", {
    subreddit,
    season_number: seasonNumber,
    requested_sorts: sortModes,
    successful_sorts: diagnostics.successful_sorts,
    failed_sorts: diagnostics.failed_sorts,
    rate_limited_sorts: diagnostics.rate_limited_sorts,
    candidates_returned: candidates.length,
    duration_ms: Date.now() - requestStartedAt,
  });

  return {
    subreddit,
    fetched_at: new Date().toISOString(),
    sources_fetched: diagnostics.successful_sorts,
    successful_sorts: diagnostics.successful_sorts,
    failed_sorts: diagnostics.failed_sorts,
    rate_limited_sorts: diagnostics.rate_limited_sorts,
    candidates,
    episode_matrix: episodeMatrix,
    filters_applied: {
      season_number: seasonNumber,
      title_patterns: titlePatterns,
      required_flares: requiredFlares,
      show_focused: isShowFocused,
      period_start: periodStartDate?.toISOString() ?? null,
      period_end: periodEndDate?.toISOString() ?? null,
    },
  };
}
