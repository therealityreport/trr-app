import {
  normalizeRedditFlairLabel,
  sanitizeRedditFlairList,
} from "@/lib/server/admin/reddit-flair-normalization";
import { toCanonicalFlairKey } from "@/lib/reddit/flair-key";
import {
  EPISODE_DISCUSSION_TYPE_ALIASES,
  sanitizeEpisodeTitlePatterns,
} from "@/lib/server/admin/reddit-episode-rules";
import {
  getRedditFetchContext,
  invalidateRedditToken,
  type RedditFetchContext,
} from "@/lib/server/admin/reddit-oauth-client";

export type RedditListingSort = "new" | "hot" | "top";
export type EpisodeDiscussionType = "live" | "post" | "weekly";
export type DiscoveryCollectionMode = "sample" | "exhaustive_window";

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
  forceIncludeFlares?: string[] | null;
  sortModes?: RedditListingSort[];
  limitPerMode?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  exhaustiveWindow?: boolean;
  maxPages?: number;
  searchBackfill?: boolean;
}

export interface RedditDiscoverySearchBackfillQueryDiagnostics {
  flair: string;
  query: string;
  pages_fetched: number;
  rows_fetched: number;
  rows_in_window: number;
  reached_period_start: boolean;
  complete: boolean;
}

export interface RedditDiscoverySearchBackfillDiagnostics {
  enabled: boolean;
  queries_run: number;
  pages_fetched: number;
  rows_fetched: number;
  rows_in_window: number;
  complete: boolean;
  query_diagnostics: RedditDiscoverySearchBackfillQueryDiagnostics[];
}

export interface DiscoverSubredditThreadsResult {
  subreddit: string;
  fetched_at: string;
  collection_mode: DiscoveryCollectionMode;
  sources_fetched: RedditListingSort[];
  successful_sorts: RedditListingSort[];
  failed_sorts: RedditListingSort[];
  rate_limited_sorts: RedditListingSort[];
  listing_pages_fetched: number;
  max_pages_applied: number;
  window_exhaustive_complete: boolean | null;
  totals: {
    fetched_rows: number;
    matched_rows: number;
    tracked_flair_rows: number;
  };
  window_start: string | null;
  window_end: string | null;
  search_backfill?: RedditDiscoverySearchBackfillDiagnostics | null;
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
  seasonEpisodes?: Array<{ episode_number: number; air_date: string | null }> | null;
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
  expected_episode_count: number;
  expected_episode_numbers: number[];
  coverage_found_episode_count: number;
  coverage_expected_slots: number;
  coverage_found_slots: number;
  coverage_missing_slots: Array<{
    episode_number: number;
    discussion_type: EpisodeDiscussionType;
  }>;
  discovery_source_summary: {
    listing_count: number;
    search_count: number;
    search_pages_fetched: number;
    gap_fill_queries_run: number;
  };
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
  retryAfterMs: number | null;

  constructor(message: string, status = 500, options?: { retryAfterMs?: number | null }) {
    super(message);
    this.name = "RedditDiscoveryError";
    this.status = status;
    this.retryAfterMs = options?.retryAfterMs ?? null;
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
    after?: string | null;
  };
}

interface RedditSearchPayload {
  data?: {
    children?: RedditListingChild[];
    after?: string | null;
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
const MAX_SEARCH_LIMIT_PER_PAGE = 100;
const DEFAULT_EXHAUSTIVE_WINDOW_MAX_PAGES = 160;
const MAX_EXHAUSTIVE_WINDOW_MAX_PAGES = 500;
const DEFAULT_REDDIT_TIMEOUT_MS = 12_000;
const DEFAULT_REDDIT_USER_AGENT = "TRRAdminRedditDiscovery/1.0 (+https://thereality.report)";
const MAX_REDDIT_FETCH_RETRIES = 4;
const DEFAULT_REDDIT_RATE_LIMIT_DELAY_MS = 3_500;
const DEFAULT_REDDIT_PAGE_COOLDOWN_MS = 250;
const MAX_SEARCH_PAGES_PER_BROAD_QUERY = 3;
const MAX_SEARCH_PAGES_PER_GAP_QUERY = 1;
const MAX_GAP_FILL_QUERIES = 12;
const SEARCH_CONCURRENCY = 1;
const MAX_BACKFILL_QUERIES_PER_FLAIR = 3;
const MAX_TOTAL_BACKFILL_QUERIES = 12;
const MAX_BACKFILL_PAGES_PER_QUERY = 8;
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

const isTestEnv = (): boolean =>
  process.env.NODE_ENV === "test" || process.env.VITEST === "true";

const getRedditRateLimitDelayMs = (): number => {
  if (isTestEnv()) return 0;
  const raw = process.env.REDDIT_RATE_LIMIT_DELAY_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return DEFAULT_REDDIT_RATE_LIMIT_DELAY_MS;
};

const getRedditPageCooldownMs = (): number => {
  if (isTestEnv()) return 0;
  const raw = process.env.REDDIT_PAGE_COOLDOWN_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return DEFAULT_REDDIT_PAGE_COOLDOWN_MS;
};

const parseRetryAfterMs = (rawValue: string | null): number | null => {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  const asSeconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }
  const asDate = new Date(trimmed);
  const msUntil = asDate.getTime() - Date.now();
  if (!Number.isFinite(msUntil)) return null;
  return Math.max(0, msUntil);
};

const computeRetryDelayMs = (
  error: RedditDiscoveryError,
  attempt: number,
): number => {
  if (error.status === 429) {
    const baseline = getRedditRateLimitDelayMs();
    const retryAfter = error.retryAfterMs ?? 0;
    return Math.max(baseline, retryAfter) + Math.floor(Math.random() * 180);
  }
  return 250 * 2 ** attempt + Math.floor(Math.random() * 120);
};

const getExhaustiveWindowMaxPages = (requestedMaxPages?: number | null): number => {
  if (
    typeof requestedMaxPages === "number" &&
    Number.isFinite(requestedMaxPages) &&
    requestedMaxPages > 0
  ) {
    return Math.min(Math.floor(requestedMaxPages), MAX_EXHAUSTIVE_WINDOW_MAX_PAGES);
  }
  const raw = process.env.REDDIT_EXHAUSTIVE_WINDOW_MAX_PAGES;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(parsed, MAX_EXHAUSTIVE_WINDOW_MAX_PAGES);
  }
  return DEFAULT_EXHAUSTIVE_WINDOW_MAX_PAGES;
};

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

const makeSortUrl = (
  baseUrl: string,
  subreddit: string,
  sort: RedditListingSort,
  limit: number,
  after: string | null = null,
): string => {
  const params = new URLSearchParams({ limit: String(limit), raw_json: "1" });
  if (sort === "top") {
    params.set("t", "all");
  }
  if (after) {
    params.set("after", after);
  }
  return `${baseUrl}/r/${encodeURIComponent(subreddit)}/${sort}.json?${params.toString()}`;
};

const makeSearchUrl = (
  baseUrl: string,
  subreddit: string,
  query: string,
  limit: number,
  after: string | null,
): string => {
  const params = new URLSearchParams({
    q: query,
    restrict_sr: "on",
    sort: "new",
    t: "all",
    limit: String(limit),
    raw_json: "1",
  });
  if (after) {
    params.set("after", after);
  }
  return `${baseUrl}/r/${encodeURIComponent(subreddit)}/search.json?${params.toString()}`;
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const parseListingPayload = (
  payload: RedditListingPayload,
  sort: RedditListingSort | null,
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
        source_sorts: sort ? [sort] : [],
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

const filterThreadsByPeriodWindow = (input: {
  rows: RedditDiscoveryThread[];
  periodStartDate: Date | null;
  periodEndDate: Date | null;
}): RedditDiscoveryThread[] => {
  if (!input.periodStartDate && !input.periodEndDate) return input.rows;
  const minMs = input.periodStartDate?.getTime() ?? null;
  const maxMs = input.periodEndDate?.getTime() ?? null;
  return input.rows.filter((row) => {
    const postedDate = parseIsoDate(row.posted_at);
    if (!postedDate) return false;
    const postedMs = postedDate.getTime();
    if (minMs !== null && postedMs < minMs) return false;
    if (maxMs !== null && postedMs > maxMs) return false;
    return true;
  });
};

const oldestPostedTimestampMs = (rows: RedditDiscoveryThread[]): number | null =>
  rows.reduce<number | null>((oldest, row) => {
    const posted = parseIsoDate(row.posted_at);
    if (!posted) return oldest;
    const postedMs = posted.getTime();
    if (oldest === null || postedMs < oldest) return postedMs;
    return oldest;
  }, null);

const fetchSortPage = async (
  subreddit: string,
  sort: RedditListingSort,
  limit: number,
  after: string | null,
  ctx?: RedditFetchContext,
): Promise<{ rows: RedditDiscoveryThread[]; after: string | null }> => {
  const fetchCtx = ctx ?? await getRedditFetchContext();
  for (let attempt = 0; attempt <= MAX_REDDIT_FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getFetchTimeoutMs());
    try {
      const response = await fetch(makeSortUrl(fetchCtx.baseUrl, subreddit, sort, limit, after), {
        headers: fetchCtx.headers,
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.status === 401 && fetchCtx.headers.Authorization) {
        invalidateRedditToken();
      }
      if (response.status === 404) {
        throw new RedditDiscoveryError("Subreddit not found", 404);
      }
      if (response.status === 429) {
        throw new RedditDiscoveryError("Reddit rate limit hit, try again shortly", 429, {
          retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after")),
        });
      }
      if (!response.ok) {
        const mappedStatus = RETRYABLE_REDDIT_STATUS.has(response.status) ? response.status : 502;
        throw new RedditDiscoveryError(`Reddit request failed (${response.status})`, mappedStatus);
      }

      const payload = (await response.json()) as RedditListingPayload;
      return {
        rows: parseListingPayload(payload, sort),
        after: payload.data?.after ?? null,
      };
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

      const retryDelayMs = computeRetryDelayMs(mappedError, attempt);
      await sleep(retryDelayMs);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new RedditDiscoveryError("Failed to fetch subreddit threads", 502);
};

const fetchSort = async (
  subreddit: string,
  sort: RedditListingSort,
  limit: number,
  ctx?: RedditFetchContext,
): Promise<RedditDiscoveryThread[]> => {
  const page = await fetchSortPage(subreddit, sort, limit, null, ctx);
  return page.rows;
};

const fetchNewWindowExhaustive = async (input: {
  subreddit: string;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  maxPages: number;
  ctx?: RedditFetchContext;
}): Promise<{ rows: RedditDiscoveryThread[]; pages_fetched: number; window_complete: boolean }> => {
  let after: string | null = null;
  let pagesFetched = 0;
  const rows: RedditDiscoveryThread[] = [];
  let reachedPeriodStart = input.periodStartDate === null;
  while (pagesFetched < input.maxPages) {
    const page = await fetchSortPage(
      input.subreddit,
      "new",
      MAX_SEARCH_LIMIT_PER_PAGE,
      after,
      input.ctx,
    );
    pagesFetched += 1;
    rows.push(...page.rows);
    if (input.periodStartDate) {
      const oldestMsOnPage = oldestPostedTimestampMs(page.rows);
      if (
        oldestMsOnPage !== null &&
        oldestMsOnPage < input.periodStartDate.getTime()
      ) {
        reachedPeriodStart = true;
      }
    }
    after = page.after;
    const shouldStop = reachedPeriodStart || !after || page.rows.length === 0;
    if (shouldStop) {
      break;
    }
    const pageCooldownMs = getRedditPageCooldownMs();
    if (pageCooldownMs > 0) {
      await sleep(pageCooldownMs);
    }
  }
  const windowComplete = reachedPeriodStart;
  return { rows, pages_fetched: pagesFetched, window_complete: windowComplete };
};

const fetchSearchPage = async (
  subreddit: string,
  query: string,
  limit: number,
  after: string | null,
  ctx?: RedditFetchContext,
): Promise<{ rows: RedditDiscoveryThread[]; after: string | null }> => {
  const fetchCtx = ctx ?? await getRedditFetchContext();
  for (let attempt = 0; attempt <= MAX_REDDIT_FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getFetchTimeoutMs());
    try {
      const response = await fetch(makeSearchUrl(fetchCtx.baseUrl, subreddit, query, limit, after), {
        headers: fetchCtx.headers,
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.status === 401 && fetchCtx.headers.Authorization) {
        invalidateRedditToken();
      }
      if (response.status === 404) {
        throw new RedditDiscoveryError("Subreddit not found", 404);
      }
      if (response.status === 429) {
        throw new RedditDiscoveryError("Reddit rate limit hit, try again shortly", 429, {
          retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after")),
        });
      }
      if (!response.ok) {
        const mappedStatus = RETRYABLE_REDDIT_STATUS.has(response.status) ? response.status : 502;
        throw new RedditDiscoveryError(`Reddit search request failed (${response.status})`, mappedStatus);
      }

      const payload = (await response.json()) as RedditSearchPayload;
      return {
        rows: parseListingPayload(payload, null),
        after: payload.data?.after ?? null,
      };
    } catch (error) {
      const mappedError =
        error instanceof RedditDiscoveryError
          ? error
          : (error as { name?: string } | null)?.name === "AbortError"
            ? new RedditDiscoveryError("Reddit request timed out", 504)
            : new RedditDiscoveryError("Failed to search subreddit threads", 502);
      const shouldRetry =
        RETRYABLE_REDDIT_STATUS.has(mappedError.status) && attempt < MAX_REDDIT_FETCH_RETRIES;
      if (!shouldRetry) {
        throw mappedError;
      }

      const retryDelayMs = computeRetryDelayMs(mappedError, attempt);
      await sleep(retryDelayMs);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new RedditDiscoveryError("Failed to search subreddit threads", 502);
};

const fetchSortsWithDiagnostics = async (
  subreddit: string,
  sortModes: RedditListingSort[],
  limitPerMode: number,
  ctx?: RedditFetchContext,
): Promise<{ rows: RedditDiscoveryThread[]; diagnostics: SortFetchDiagnostics }> => {
  const startedAt = Date.now();
  const settled: PromiseSettledResult<{ sort: RedditListingSort; rows: RedditDiscoveryThread[] }>[] = [];
  for (const sort of sortModes) {
    try {
      const rows = await fetchSort(subreddit, sort, limitPerMode, ctx);
      settled.push({ status: "fulfilled", value: { sort, rows } });
    } catch (error) {
      settled.push({ status: "rejected", reason: error });
    }
  }

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

const buildAcronymToken = (value: string): string | null => {
  const parts = value
    .toUpperCase()
    .replace(/[^A-Z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return null;
  const acronym = parts.map((part) => part[0]).join("");
  if (acronym.length < 2) return null;
  return acronym;
};

const buildFlairSearchBackfillTargets = (input: {
  flairs: string[];
  showTerms: string[];
}): Array<{ flair: string; query: string }> => {
  const flairByCanonicalKey = new Map<string, string>();
  for (const flair of input.flairs) {
    const canonicalKey = toCanonicalFlairKey(flair);
    if (!canonicalKey || flairByCanonicalKey.has(canonicalKey)) continue;
    flairByCanonicalKey.set(canonicalKey, flair);
  }
  const showTermQueries = dedupeTerms(
    input.showTerms.filter((term) => term.length >= 3),
  )
    .sort((a, b) => {
      const aIsFranchiseAcronym = /^rho[a-z0-9]+$/i.test(a);
      const bIsFranchiseAcronym = /^rho[a-z0-9]+$/i.test(b);
      if (aIsFranchiseAcronym !== bIsFranchiseAcronym) {
        return aIsFranchiseAcronym ? -1 : 1;
      }
      return a.length - b.length;
    })
    .map((term) => quoteSearchToken(term))
    .slice(0, 2);

  const targets: Array<{ flair: string; query: string }> = [];
  for (const flair of flairByCanonicalKey.values()) {
    const querySet = new Set<string>();
    querySet.add(quoteSearchToken(flair));
    const acronym = buildAcronymToken(flair);
    if (acronym) {
      querySet.add(quoteSearchToken(acronym));
    }
    for (const query of showTermQueries) {
      querySet.add(query);
    }
    let queryCount = 0;
    for (const query of querySet) {
      targets.push({ flair, query });
      queryCount += 1;
      if (queryCount >= MAX_BACKFILL_QUERIES_PER_FLAIR || targets.length >= MAX_TOTAL_BACKFILL_QUERIES) {
        break;
      }
    }
    if (targets.length >= MAX_TOTAL_BACKFILL_QUERIES) {
      break;
    }
  }
  return targets;
};

const fetchFlairWindowSearchBackfill = async (input: {
  subreddit: string;
  flairTargets: Array<{ flair: string; query: string }>;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  maxPages: number;
}): Promise<{ rows: RedditDiscoveryThread[]; diagnostics: RedditDiscoverySearchBackfillDiagnostics }> => {
  const diagnostics: RedditDiscoverySearchBackfillDiagnostics = {
    enabled: true,
    queries_run: 0,
    pages_fetched: 0,
    rows_fetched: 0,
    rows_in_window: 0,
    complete: false,
    query_diagnostics: [],
  };
  if (input.flairTargets.length === 0) {
    diagnostics.complete = true;
    return { rows: [], diagnostics };
  }

  let pageBudgetRemaining = Math.max(1, input.maxPages);
  const allRows: RedditDiscoveryThread[] = [];
  const periodStartMs = input.periodStartDate?.getTime() ?? null;
  const maxPagesPerQuery = Math.max(
    1,
    Math.min(
      MAX_BACKFILL_PAGES_PER_QUERY,
      Math.ceil(pageBudgetRemaining / Math.max(1, input.flairTargets.length)),
    ),
  );

  for (const target of input.flairTargets) {
    if (pageBudgetRemaining <= 0) {
      break;
    }
    let after: string | null = null;
    let pagesFetched = 0;
    const queryRows: RedditDiscoveryThread[] = [];
    let reachedPeriodStart = input.periodStartDate === null;
    let queryRateLimited = false;

    const queryPageBudget = Math.max(1, Math.min(pageBudgetRemaining, maxPagesPerQuery));
    try {
      while (pagesFetched < queryPageBudget) {
        const page = await fetchSearchPage(
          input.subreddit,
          target.query,
          MAX_SEARCH_LIMIT_PER_PAGE,
          after,
        );
        pagesFetched += 1;
        queryRows.push(...page.rows);
        if (periodStartMs !== null) {
          const oldestMsOnPage = oldestPostedTimestampMs(page.rows);
          if (oldestMsOnPage !== null && oldestMsOnPage < periodStartMs) {
            reachedPeriodStart = true;
          }
        }
        after = page.after;
        const shouldStop = reachedPeriodStart || !after || page.rows.length === 0;
        if (shouldStop) {
          break;
        }
        const pageCooldownMs = getRedditPageCooldownMs();
        if (pageCooldownMs > 0) {
          await sleep(pageCooldownMs);
        }
      }
    } catch (error) {
      if (!(error instanceof RedditDiscoveryError) || error.status !== 429) {
        throw error;
      }
      queryRateLimited = true;
    }

    pageBudgetRemaining = Math.max(0, pageBudgetRemaining - pagesFetched);
    allRows.push(...queryRows);
    const rowsInWindow = filterThreadsByPeriodWindow({
      rows: queryRows,
      periodStartDate: input.periodStartDate,
      periodEndDate: input.periodEndDate,
    });
    const queryComplete = !queryRateLimited && (input.periodStartDate ? reachedPeriodStart : after === null);
    diagnostics.query_diagnostics.push({
      flair: target.flair,
      query: target.query,
      pages_fetched: pagesFetched,
      rows_fetched: queryRows.length,
      rows_in_window: rowsInWindow.length,
      reached_period_start: reachedPeriodStart,
      complete: queryComplete,
    });
    diagnostics.queries_run += 1;
    diagnostics.pages_fetched += pagesFetched;
    diagnostics.rows_fetched += queryRows.length;
    diagnostics.rows_in_window += rowsInWindow.length;
  }

  diagnostics.complete =
    diagnostics.queries_run === input.flairTargets.length &&
    diagnostics.query_diagnostics.every((query) => query.complete);

  return {
    rows: allRows,
    diagnostics,
  };
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
  forcedAllPostFlares: string[],
): { threads: RedditDiscoveryThread[]; hints: RedditDiscoveryHints } => {
  const includeCounts = new Map<string, number>();
  const excludeCounts = new Map<string, number>();
  const analysisAllFlairKeys = new Set(analysisAllFlares.map((flair) => toCanonicalFlairKey(flair)));
  for (const forcedFlair of forcedAllPostFlares) {
    analysisAllFlairKeys.add(toCanonicalFlairKey(forcedFlair));
  }
  const analysisScanFlairKeys = new Set(
    analysisScanFlares
      .map((flair) => toCanonicalFlairKey(flair))
      .filter((flair) => flair.length > 0)
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
    const flairKey = toCanonicalFlairKey(normalizedThreadFlair);
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
  const forcedAllPostFlares = sanitizeRedditFlairList(subreddit, input.forceIncludeFlares ?? []);
  const trackedFlairs = [
    ...analysisAllFlares,
    ...analysisScanFlares,
    ...forcedAllPostFlares,
  ].filter((flair) => flair.trim().length > 0);
  const isShowFocused = input.isShowFocused ?? false;
  const periodStartDate = parseIsoDate(input.periodStart);
  const periodEndDate = parseIsoDate(input.periodEnd);
  const useExhaustiveWindow =
    input.exhaustiveWindow === true && Boolean(periodStartDate || periodEndDate);
  const searchBackfillEnabled = input.searchBackfill === true;
  const maxPages = getExhaustiveWindowMaxPages(input.maxPages ?? null);

  if (terms.length === 0) {
    throw new RedditDiscoveryError("Show terms are required for discovery", 400);
  }
  if (input.periodStart && !periodStartDate) {
    throw new RedditDiscoveryError("period_start must be a valid ISO datetime", 400);
  }
  if (input.periodEnd && !periodEndDate) {
    throw new RedditDiscoveryError("period_end must be a valid ISO datetime", 400);
  }
  if (periodStartDate && periodEndDate && periodStartDate.getTime() > periodEndDate.getTime()) {
    throw new RedditDiscoveryError("period_start must be before period_end", 400);
  }

  let fetchedRows: RedditDiscoveryThread[] = [];
  let listingPagesFetched = 0;
  let windowExhaustiveComplete: boolean | null = null;
  let searchBackfillDiagnostics: RedditDiscoverySearchBackfillDiagnostics | null = null;
  const diagnostics: SortFetchDiagnostics = {
    successful_sorts: [],
    failed_sorts: [],
    rate_limited_sorts: [],
  };
  if (useExhaustiveWindow) {
    try {
      const exhaustive = await fetchNewWindowExhaustive({
        subreddit,
        periodStartDate,
        periodEndDate,
        maxPages,
      });
      fetchedRows = filterThreadsByPeriodWindow({
        rows: exhaustive.rows,
        periodStartDate,
        periodEndDate,
      });
      listingPagesFetched = exhaustive.pages_fetched;
      windowExhaustiveComplete = exhaustive.window_complete;
      diagnostics.successful_sorts = ["new"];
    } catch (error) {
      const canFallbackToSearchBackfill =
        error instanceof RedditDiscoveryError &&
        error.status === 429 &&
        searchBackfillEnabled &&
        trackedFlairs.length > 0;
      if (!canFallbackToSearchBackfill) {
        throw error;
      }
      console.warn("[reddit_discover_threads_exhaustive_listing_rate_limited]", {
        subreddit,
        status: error.status,
        message: error.message,
      });
      diagnostics.failed_sorts = ["new"];
      diagnostics.rate_limited_sorts = ["new"];
      listingPagesFetched = 0;
      windowExhaustiveComplete = false;
    }

    const shouldRunSearchBackfill =
      searchBackfillEnabled && trackedFlairs.length > 0 && useExhaustiveWindow;
    if (shouldRunSearchBackfill) {
      const flairTargets = buildFlairSearchBackfillTargets({
        flairs: trackedFlairs,
        showTerms: terms,
      });
      const searchBackfill = await fetchFlairWindowSearchBackfill({
        subreddit,
        flairTargets,
        periodStartDate,
        periodEndDate,
        maxPages,
      });
      const searchBackfillRows = filterThreadsByPeriodWindow({
        rows: searchBackfill.rows,
        periodStartDate,
        periodEndDate,
      });
      fetchedRows = [...fetchedRows, ...searchBackfillRows];
      searchBackfillDiagnostics = searchBackfill.diagnostics;
    }
  } else {
    const sample = await fetchSortsWithDiagnostics(subreddit, sortModes, limitPerMode);
    fetchedRows = sample.rows;
    diagnostics.successful_sorts = sample.diagnostics.successful_sorts;
    diagnostics.failed_sorts = sample.diagnostics.failed_sorts;
    diagnostics.rate_limited_sorts = sample.diagnostics.rate_limited_sorts;
    listingPagesFetched = diagnostics.successful_sorts.length;
  }
  const mergedThreads = mergeByPostId(fetchedRows);
  const trackedFlairKeySet = new Set<string>(
    trackedFlairs
      .map((flair) => toCanonicalFlairKey(flair))
      .filter((flair) => flair.length > 0),
  );
  const { threads, hints } = applyMatchMetadata(
    mergedThreads,
    terms,
    castTerms,
    subreddit,
    isShowFocused,
    analysisScanFlares,
    analysisAllFlares,
    forcedAllPostFlares,
  );
  const trackedFlairRows =
    trackedFlairKeySet.size === 0
      ? 0
      : mergedThreads.reduce((count, row) => {
          const normalizedThreadFlair = row.link_flair_text
            ? normalizeRedditFlairLabel(subreddit, row.link_flair_text)
            : null;
          const flairKey = toCanonicalFlairKey(normalizedThreadFlair);
          return flairKey && trackedFlairKeySet.has(flairKey) ? count + 1 : count;
        }, 0);

  threads.sort((a, b) => {
    if (b.match_score !== a.match_score) return b.match_score - a.match_score;
    if (b.num_comments !== a.num_comments) return b.num_comments - a.num_comments;
    return b.score - a.score;
  });

  console.info("[reddit_discover_threads_complete]", {
    subreddit,
    requested_sorts: useExhaustiveWindow ? ["new"] : sortModes,
    collection_mode: useExhaustiveWindow ? "exhaustive_window" : "sample",
    successful_sorts: diagnostics.successful_sorts,
    failed_sorts: diagnostics.failed_sorts,
    rate_limited_sorts: diagnostics.rate_limited_sorts,
    listing_pages_fetched: listingPagesFetched,
    max_pages_applied: maxPages,
    window_exhaustive_complete: windowExhaustiveComplete,
    search_backfill: searchBackfillDiagnostics,
    totals: {
      fetched_rows: mergedThreads.length,
      matched_rows: threads.length,
      tracked_flair_rows: trackedFlairRows,
    },
    window_start: periodStartDate?.toISOString() ?? null,
    window_end: periodEndDate?.toISOString() ?? null,
    threads_returned: threads.length,
    duration_ms: Date.now() - requestStartedAt,
  });

  return {
    subreddit,
    fetched_at: new Date().toISOString(),
    collection_mode: useExhaustiveWindow ? "exhaustive_window" : "sample",
    sources_fetched: diagnostics.successful_sorts,
    successful_sorts: diagnostics.successful_sorts,
    failed_sorts: diagnostics.failed_sorts,
    rate_limited_sorts: diagnostics.rate_limited_sorts,
    listing_pages_fetched: listingPagesFetched,
    max_pages_applied: maxPages,
    window_exhaustive_complete: windowExhaustiveComplete,
    search_backfill: searchBackfillDiagnostics,
    totals: {
      fetched_rows: mergedThreads.length,
      matched_rows: threads.length,
      tracked_flair_rows: trackedFlairRows,
    },
    window_start: periodStartDate?.toISOString() ?? null,
    window_end: periodEndDate?.toISOString() ?? null,
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
  expectedEpisodeNumbers: number[] = [],
): EpisodeDiscussionMatrixRow[] => {
  const byEpisode = new Map<number, MutableEpisodeMatrixRow>();
  for (const episodeNumber of expectedEpisodeNumbers) {
    if (!byEpisode.has(episodeNumber)) {
      byEpisode.set(episodeNumber, createMutableEpisodeMatrixRow(episodeNumber));
    }
  }

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

const PRIMARY_DISCUSSION_SEARCH_PHRASE: Record<EpisodeDiscussionType, string> = {
  live: "live episode discussion",
  post: "post episode discussion",
  weekly: "weekly episode discussion",
};

function quoteSearchToken(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

const buildSearchShowTokens = (
  showName: string,
  showAliases: string[] | null | undefined,
  showTerms: string[],
): string[] => {
  const seeded = [showName, ...(showAliases ?? [])]
    .map((value) => normalizeText(value))
    .filter(Boolean);
  return dedupeTerms([...seeded, ...showTerms])
    .filter((value) => value.length >= 4 || value.startsWith("rho"))
    .sort((a, b) => b.length - a.length)
    .slice(0, 4);
};

const buildBroadSearchQuery = (input: {
  showTokens: string[];
  seasonNumber: number;
  discussionType: EpisodeDiscussionType;
}): string => {
  const showClause =
    input.showTokens.length > 0
      ? `(${input.showTokens.map(quoteSearchToken).join(" OR ")})`
      : "";
  const seasonClause = `(${quoteSearchToken(`season ${input.seasonNumber}`)} OR ${quoteSearchToken(
    `s${input.seasonNumber}`,
  )})`;
  const discussionClause = quoteSearchToken(PRIMARY_DISCUSSION_SEARCH_PHRASE[input.discussionType]);
  return [showClause, seasonClause, discussionClause].filter(Boolean).join(" ");
};

const buildGapFillSearchQuery = (input: {
  showTokens: string[];
  seasonNumber: number;
  episodeNumber: number;
  discussionType: EpisodeDiscussionType;
}): string => {
  const showClause =
    input.showTokens.length > 0
      ? `(${input.showTokens.map(quoteSearchToken).join(" OR ")})`
      : "";
  const seasonClause = quoteSearchToken(`season ${input.seasonNumber}`);
  const episodeClause = `(${quoteSearchToken(`episode ${input.episodeNumber}`)} OR ${quoteSearchToken(
    `e${input.episodeNumber}`,
  )} OR ${quoteSearchToken(`s${input.seasonNumber}e${input.episodeNumber}`)})`;
  const discussionClause = quoteSearchToken(PRIMARY_DISCUSSION_SEARCH_PHRASE[input.discussionType]);
  return [showClause, seasonClause, episodeClause, discussionClause].filter(Boolean).join(" ");
};

const runSearchQuery = async (
  subreddit: string,
  query: string,
  maxPages: number,
): Promise<{ rows: RedditDiscoveryThread[]; pages_fetched: number }> => {
  let after: string | null = null;
  let pagesFetched = 0;
  const rows: RedditDiscoveryThread[] = [];
  while (pagesFetched < maxPages) {
    const page = await fetchSearchPage(subreddit, query, MAX_SEARCH_LIMIT_PER_PAGE, after);
    pagesFetched += 1;
    rows.push(...page.rows);
    after = page.after;
    if (!after) break;
    const pageCooldownMs = getRedditPageCooldownMs();
    if (pageCooldownMs > 0) {
      await sleep(pageCooldownMs);
    }
  }
  return { rows, pages_fetched: pagesFetched };
};

const runSearchQuerySet = async (input: {
  subreddit: string;
  queries: string[];
  maxPagesPerQuery: number;
  concurrency: number;
}): Promise<{ rows: RedditDiscoveryThread[]; pages_fetched: number }> => {
  const rows: RedditDiscoveryThread[] = [];
  let pagesFetched = 0;
  let cursor = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(input.concurrency, input.queries.length)) },
    () =>
      (async () => {
        while (true) {
          const index = cursor;
          cursor += 1;
          const query = input.queries[index];
          if (!query) return;
          const result = await runSearchQuery(input.subreddit, query, input.maxPagesPerQuery);
          rows.push(...result.rows);
          pagesFetched += result.pages_fetched;
        }
      })(),
  );

  await Promise.all(workers);
  return { rows, pages_fetched: pagesFetched };
};

const normalizeExpectedEpisodeNumbers = (
  seasonEpisodes: DiscoverEpisodeDiscussionThreadsInput["seasonEpisodes"],
): number[] => {
  if (!Array.isArray(seasonEpisodes)) return [];
  const numbers = new Set<number>();
  for (const episode of seasonEpisodes) {
    if (!episode || !Number.isFinite(episode.episode_number)) continue;
    const parsed = Math.floor(episode.episode_number);
    if (parsed > 0) numbers.add(parsed);
  }
  return [...numbers].sort((a, b) => a - b);
};

const slotKey = (episodeNumber: number, discussionType: EpisodeDiscussionType): string =>
  `${episodeNumber}:${discussionType}`;

const expectedDiscussionSlots = (episodeNumbers: number[]): Array<{
  episode_number: number;
  discussion_type: EpisodeDiscussionType;
}> => {
  const rows: Array<{ episode_number: number; discussion_type: EpisodeDiscussionType }> = [];
  const types: EpisodeDiscussionType[] = ["live", "post", "weekly"];
  for (const episodeNumber of episodeNumbers) {
    for (const discussionType of types) {
      rows.push({ episode_number: episodeNumber, discussion_type: discussionType });
    }
  }
  return rows;
};

const collectEpisodeDiscussionCandidates = (input: {
  subreddit: string;
  threads: RedditDiscoveryThread[];
  showTerms: string[];
  titlePatterns: string[];
  seasonNumber: number;
  requiredFlairKeys: Set<string>;
  isShowFocused: boolean;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  expectedEpisodeNumberSet: Set<number>;
}): RedditEpisodeDiscussionCandidate[] => {
  const candidates: RedditEpisodeDiscussionCandidate[] = [];

  for (const thread of input.threads) {
    const title = normalizeText(thread.title);
    const text = normalizeText(`${thread.title} ${thread.text ?? ""}`);
    const discussionType = parseDiscussionTypeFromTitle(thread.title);
    if (!discussionType) continue;
    const matchedPatterns = input.titlePatterns.filter((pattern) => {
      const normalizedPattern = normalizeText(pattern);
      if (title.includes(normalizedPattern)) {
        return true;
      }
      const patternType = inferDiscussionTypeFromPattern(pattern);
      return patternType !== null && discussionType === patternType;
    });
    if (matchedPatterns.length === 0) continue;

    const matchedShowTerms = findMatchedTerms(text, input.showTerms);
    if (matchedShowTerms.length === 0) continue;
    if (!hasSeasonToken(text, input.seasonNumber)) continue;

    const episodeNumber = parseEpisodeNumberFromTitle(thread.title);
    if (!episodeNumber) continue;
    if (
      input.expectedEpisodeNumberSet.size > 0 &&
      !input.expectedEpisodeNumberSet.has(episodeNumber)
    ) {
      continue;
    }

    const postedAtDate = parseIsoDate(thread.posted_at);
    if (input.periodStartDate || input.periodEndDate) {
      if (!postedAtDate) continue;
      if (input.periodStartDate && postedAtDate.getTime() < input.periodStartDate.getTime()) continue;
      if (input.periodEndDate && postedAtDate.getTime() > input.periodEndDate.getTime()) continue;
    }

    const normalizedThreadFlair = thread.link_flair_text
      ? normalizeRedditFlairLabel(input.subreddit, thread.link_flair_text)
      : null;
    if (!input.isShowFocused && input.requiredFlairKeys.size > 0) {
      const flairKey = normalizedThreadFlair?.toLowerCase() ?? null;
      if (!flairKey || !input.requiredFlairKeys.has(flairKey)) {
        continue;
      }
    }

    const matchReasons = [
      `title pattern: ${matchedPatterns[0]}`,
      `show term: ${matchedShowTerms[0]}`,
      `season: ${input.seasonNumber}`,
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

  return candidates;
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

  let mergedListingRows: RedditDiscoveryThread[] = [];
  let diagnostics: SortFetchDiagnostics = {
    successful_sorts: [],
    failed_sorts: [],
    rate_limited_sorts: [],
  };
  try {
    const listingFetch = await fetchSortsWithDiagnostics(
      subreddit,
      sortModes,
      limitPerMode,
    );
    mergedListingRows = mergeByPostId(listingFetch.rows);
    diagnostics = listingFetch.diagnostics;
  } catch (error) {
    if (!(error instanceof RedditDiscoveryError) || error.status !== 429) {
      throw error;
    }
    diagnostics = {
      successful_sorts: [],
      failed_sorts: [...sortModes],
      rate_limited_sorts: [...sortModes],
    };
    console.warn("[reddit_episode_discussions_listing_rate_limited]", {
      subreddit,
      requested_sorts: sortModes,
      message: error.message,
    });
  }
  const listingCount = mergedListingRows.length;

  const expectedEpisodeNumbers = normalizeExpectedEpisodeNumbers(input.seasonEpisodes);
  const expectedEpisodeNumberSet = new Set(expectedEpisodeNumbers);
  const expectedSlots = expectedDiscussionSlots(expectedEpisodeNumbers);
  const expectedSlotKeys = new Set(
    expectedSlots.map((slot) => slotKey(slot.episode_number, slot.discussion_type)),
  );

  const searchShowTokens = buildSearchShowTokens(input.showName, input.showAliases ?? [], showTerms);
  let searchRows: RedditDiscoveryThread[] = [];
  let searchPagesFetched = 0;
  let gapFillQueriesRun = 0;

  if (expectedEpisodeNumbers.length > 0) {
    const broadQueries = (["live", "post", "weekly"] as EpisodeDiscussionType[]).map((discussionType) =>
      buildBroadSearchQuery({
        showTokens: searchShowTokens,
        seasonNumber,
        discussionType,
      }),
    );

    try {
      const broadSearch = await runSearchQuerySet({
        subreddit,
        queries: broadQueries,
        maxPagesPerQuery: MAX_SEARCH_PAGES_PER_BROAD_QUERY,
        concurrency: SEARCH_CONCURRENCY,
      });
      searchRows = broadSearch.rows;
      searchPagesFetched = broadSearch.pages_fetched;
    } catch (error) {
      if (!(error instanceof RedditDiscoveryError) || error.status !== 429) {
        throw error;
      }
      console.warn("[reddit_episode_discussions_search_rate_limited]", {
        subreddit,
        phase: "broad_search",
        message: error.message,
      });
    }
  }

  let mergedThreads = mergeByPostId([...mergedListingRows, ...searchRows]);
  let candidates = collectEpisodeDiscussionCandidates({
    subreddit,
    threads: mergedThreads,
    showTerms,
    titlePatterns,
    seasonNumber,
    requiredFlairKeys,
    isShowFocused,
    periodStartDate,
    periodEndDate,
    expectedEpisodeNumberSet,
  });

  const computeMissingSlots = (
    evaluatedCandidates: RedditEpisodeDiscussionCandidate[],
  ): Array<{ episode_number: number; discussion_type: EpisodeDiscussionType }> => {
    if (expectedSlotKeys.size === 0) return [];
    const found = new Set(
      evaluatedCandidates
        .map((candidate) => slotKey(candidate.episode_number, candidate.discussion_type))
        .filter((key) => expectedSlotKeys.has(key)),
    );
    return expectedSlots.filter((slot) => !found.has(slotKey(slot.episode_number, slot.discussion_type)));
  };

  let missingSlots = computeMissingSlots(candidates);
  if (expectedEpisodeNumbers.length > 0) {
    const gapQueryQueue = missingSlots
      .map((slot) =>
        buildGapFillSearchQuery({
          showTokens: searchShowTokens,
          seasonNumber,
          episodeNumber: slot.episode_number,
          discussionType: slot.discussion_type,
        }),
      )
      .slice(0, MAX_GAP_FILL_QUERIES);

    for (const query of gapQueryQueue) {
      if (missingSlots.length === 0) break;
      let gapResult: { rows: RedditDiscoveryThread[]; pages_fetched: number };
      try {
        gapResult = await runSearchQuery(subreddit, query, MAX_SEARCH_PAGES_PER_GAP_QUERY);
      } catch (error) {
        if (!(error instanceof RedditDiscoveryError) || error.status !== 429) {
          throw error;
        }
        console.warn("[reddit_episode_discussions_search_rate_limited]", {
          subreddit,
          phase: "gap_fill",
          query,
          message: error.message,
        });
        break;
      }
      gapFillQueriesRun += 1;
      searchPagesFetched += gapResult.pages_fetched;
      if (gapResult.rows.length === 0) {
        continue;
      }
      searchRows = [...searchRows, ...gapResult.rows];
      mergedThreads = mergeByPostId([...mergedListingRows, ...searchRows]);
      candidates = collectEpisodeDiscussionCandidates({
        subreddit,
        threads: mergedThreads,
        showTerms,
        titlePatterns,
        seasonNumber,
        requiredFlairKeys,
        isShowFocused,
        periodStartDate,
        periodEndDate,
        expectedEpisodeNumberSet,
      });
      missingSlots = computeMissingSlots(candidates);
    }
  }

  const episodeMatrix = buildEpisodeDiscussionMatrix(candidates, expectedEpisodeNumbers);
  const foundEpisodeSet = new Set(
    candidates
      .map((candidate) => candidate.episode_number)
      .filter((episodeNumber) =>
        expectedEpisodeNumberSet.size > 0 ? expectedEpisodeNumberSet.has(episodeNumber) : true,
      ),
  );
  const foundSlotKeys = new Set(
    candidates
      .map((candidate) => slotKey(candidate.episode_number, candidate.discussion_type))
      .filter((key) => (expectedSlotKeys.size > 0 ? expectedSlotKeys.has(key) : true)),
  );
  const searchCount = mergeByPostId(searchRows).length;
  const coverageExpectedSlots = expectedSlotKeys.size;
  const coverageFoundSlots = coverageExpectedSlots > 0 ? foundSlotKeys.size : 0;
  const coverageFoundEpisodeCount =
    expectedEpisodeNumberSet.size > 0 ? foundEpisodeSet.size : new Set(candidates.map((candidate) => candidate.episode_number)).size;
  const coverageMissingSlots =
    coverageExpectedSlots > 0
      ? expectedSlots.filter(
          (slot) => !foundSlotKeys.has(slotKey(slot.episode_number, slot.discussion_type)),
        )
      : [];

  console.info("[reddit_discover_episode_discussions_complete]", {
    subreddit,
    season_number: seasonNumber,
    requested_sorts: sortModes,
    successful_sorts: diagnostics.successful_sorts,
    failed_sorts: diagnostics.failed_sorts,
    rate_limited_sorts: diagnostics.rate_limited_sorts,
    listing_count: listingCount,
    search_count: searchCount,
    search_pages_fetched: searchPagesFetched,
    gap_fill_queries_run: gapFillQueriesRun,
    expected_episode_count: expectedEpisodeNumbers.length,
    coverage_found_episode_count: coverageFoundEpisodeCount,
    coverage_expected_slots: coverageExpectedSlots,
    coverage_found_slots: coverageFoundSlots,
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
    expected_episode_count: expectedEpisodeNumbers.length,
    expected_episode_numbers: expectedEpisodeNumbers,
    coverage_found_episode_count: coverageFoundEpisodeCount,
    coverage_expected_slots: coverageExpectedSlots,
    coverage_found_slots: coverageFoundSlots,
    coverage_missing_slots: coverageMissingSlots,
    discovery_source_summary: {
      listing_count: listingCount,
      search_count: searchCount,
      search_pages_fetched: searchPagesFetched,
      gap_fill_queries_run: gapFillQueriesRun,
    },
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
